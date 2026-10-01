import { stripe } from './stripe'
import { supabaseAdmin } from './supabaseAdmin'
import { monthlyAmountPence } from './billing'

// Server-only helpers for Stage 2 (platform billing): giving each tenant a
// Stripe Customer, and raising a real, payable Stripe Invoice for a billing
// period. Every function here degrades to a no-op/null if STRIPE_SECRET_KEY
// isn't set, so the existing invoice-row + email flow keeps working exactly
// as before on a site that hasn't configured Stripe yet.

export async function getOrCreateStripeCustomer(
  tenantId: string,
  tenantName: string,
  ownerEmail: string | null
): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (tenant?.stripe_customer_id) return tenant.stripe_customer_id

  try {
    const customer = await stripe.customers.create({
      name: tenantName,
      email: ownerEmail || undefined,
      metadata: { tenant_id: tenantId },
    })
    await supabaseAdmin.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenantId)
    return customer.id
  } catch {
    // Platform billing is a layer on top of the existing invoice flow, not a
    // prerequisite for it — a Stripe hiccup here shouldn't block signup or
    // the monthly cron from raising their own invoice record as before.
    return null
  }
}

// Creates one line item + a finalized Stripe Invoice for a billing period.
// collection_method is 'send_invoice' (not 'charge_automatically') because
// no card is ever saved for platform billing — the hosted_invoice_url this
// returns is a Stripe-hosted page the owner pays on, so TrimBooking's own
// email can carry a real "Pay now" link without ever touching card data.
//
// auto_advance stays true but we deliberately do NOT call
// stripe.invoices.sendInvoice — TrimBooking's own branded email (via Resend)
// is what reaches the owner, with this invoice's hosted_invoice_url as the
// pay link, so they get one email, not two.
export async function createStripeInvoice({
  customerId,
  amountPence,
  description,
}: {
  customerId: string
  amountPence: number
  description: string
}): Promise<{ id: string; hostedInvoiceUrl: string | null; status: string | null; dueDate: string | null } | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  try {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: amountPence,
      currency: 'gbp',
      description,
    })

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: 14,
      auto_advance: true,
      // Without this, Stripe defaults to 'exclude' — creating an EMPTY draft
      // invoice regardless of the item just created above, which finalizes
      // and can be paid at £0.00 with the real amount never collected.
      pending_invoice_items_behavior: 'include',
    })

    if (!invoice.id) return null
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)

    return {
      id: finalized.id || invoice.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url || null,
      status: finalized.status || null,
      // due_date is a unix timestamp (seconds); stored as a plain date for
      // the dunning cron (app/api/cron/billing-dunning) to compare against.
      dueDate: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString().slice(0, 10) : null,
    }
  } catch {
    return null
  }
}

// --- Subscription billing (the owner's alternative to the above
// invoice-per-period flow — a real Stripe Subscription, with a card on file,
// that charges automatically each month) -----------------------------------

// All subscription prices share one Stripe Product, created once and reused
// (rather than one inline product per price) so the Stripe dashboard doesn't
// accumulate a new product every time a tenant's staff count — and so their
// monthly amount — changes. The price itself is still created fresh each
// time (via price_data below) since the tiered, staff-count-based amount
// isn't something Stripe's own per-seat pricing can express directly.
let cachedSubscriptionProductId: string | null = null
async function getSubscriptionProductId(): Promise<string> {
  if (cachedSubscriptionProductId) return cachedSubscriptionProductId
  if (process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID) {
    cachedSubscriptionProductId = process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID
    return cachedSubscriptionProductId
  }
  const existing = await stripe.products.list({ limit: 100 })
  const found = existing.data.find((p) => p.name === 'TrimBooking Platform Subscription')
  if (found) {
    cachedSubscriptionProductId = found.id
    return cachedSubscriptionProductId
  }
  const created = await stripe.products.create({ name: 'TrimBooking Platform Subscription' })
  cachedSubscriptionProductId = created.id
  return cachedSubscriptionProductId
}

// Starts a Stripe Checkout session (mode: 'subscription') so the owner can
// add a card and go onto automatic monthly billing. client_reference_id
// carries the tenant id through to the checkout.session.completed webhook
// (app/api/stripe/webhook/billing), which is what actually flips
// tenants.billing_method to 'subscription'.
export async function createSubscriptionCheckoutSession({
  customerId,
  tenantId,
  staffCount,
  successUrl,
  cancelUrl,
}: {
  customerId: string
  tenantId: string
  staffCount: number
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string | null } | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  try {
    const product = await getSubscriptionProductId()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: tenantId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product,
            unit_amount: monthlyAmountPence(staffCount),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    return { url: session.url }
  } catch {
    return null
  }
}

export async function cancelStripeSubscription(subscriptionId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false
  try {
    await stripe.subscriptions.cancel(subscriptionId)
    return true
  } catch {
    return false
  }
}

// Keeps a subscription's monthly amount matching the tenant's current staff
// count. proration_behavior: 'none' means a staff-count change doesn't
// trigger a surprise top-up invoice mid-cycle — the new amount simply takes
// effect from the next renewal, the same way the old invoice-per-period
// model only ever reflects staff count as of when each invoice is raised.
export async function syncSubscriptionPrice(subscriptionItemId: string, staffCount: number): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false
  try {
    const product = await getSubscriptionProductId()
    await stripe.subscriptionItems.update(subscriptionItemId, {
      price_data: {
        currency: 'gbp',
        product,
        unit_amount: monthlyAmountPence(staffCount),
        recurring: { interval: 'month' },
      },
      proration_behavior: 'none',
    })
    return true
  } catch {
    return false
  }
}
