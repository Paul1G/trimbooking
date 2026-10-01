import { stripe } from './stripe'
import { supabaseAdmin } from './supabaseAdmin'

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
