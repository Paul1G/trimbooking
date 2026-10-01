import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// This pinned API version (lib/stripe.ts) moved an invoice's subscription
// link from a top-level `subscription` field to `parent.subscription_details`
// — the installed SDK's types reflect that, so this reads it from there.
function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const details = (invoice as any).parent?.subscription_details
  const sub = details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

// Stripe billing webhook — events on the PLATFORM account itself (an
// invoice we raised for a salon's subscription to TrimBooking being paid,
// voided, etc., or an owner setting up automatic card billing), not events
// on a connected account. In the Stripe dashboard, create a webhook
// destination listening to "events on your account" pointed at
// https://www.trimbooking.co.uk/api/stripe/webhook/billing (must be the www
// host — Stripe doesn't follow redirects), and set STRIPE_WEBHOOK_SECRET to
// its signing secret. Needs invoice.paid, invoice.voided,
// invoice.marked_uncollectible, invoice.finalized, invoice.payment_failed,
// checkout.session.completed and customer.subscription.deleted subscribed.
//
// Keeps our own `invoices` row's stripe_status/paid_at in sync, and — when
// an invoice is actually paid — also switches that tenant to `paid: true`
// (and un-disables it, reversing the dunning cron's cutoff). This is what
// takes a trial shop live automatically the moment its owner pays the
// trial-ending invoice (see app/api/cron/send-trial-invoices), with no
// admin step required; it's a harmless no-op for a tenant that's already
// paid (e.g. a later regular invoice, however it's billed).
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err?.message}` }, { status: 400 })
  }

  const invoiceEvents = ['invoice.paid', 'invoice.voided', 'invoice.marked_uncollectible', 'invoice.finalized', 'invoice.payment_failed']
  if (invoiceEvents.includes(event.type)) {
    const stripeInvoice = event.data.object as Stripe.Invoice
    if (stripeInvoice.id) {
      let existing = await supabaseAdmin
        .from('invoices')
        .select('id, tenant_id, due_date')
        .eq('stripe_invoice_id', stripeInvoice.id)
        .maybeSingle()
        .then((r) => r.data)

      // Subscription invoices aren't pre-created by us the way a manually
      // raised invoice-per-period one is (see lib/billingCron.ts) — the first
      // event we see for one is usually this, so create its row here, the
      // same shape the admin panel and dunning cron already expect.
      if (!existing && subscriptionIdOf(stripeInvoice)) {
        const newId = await createInvoiceRowForSubscriptionInvoice(stripeInvoice)
        if (newId) {
          existing = await supabaseAdmin
            .from('invoices')
            .select('id, tenant_id, due_date')
            .eq('id', newId)
            .maybeSingle()
            .then((r) => r.data)
        }
      }

      if (existing) {
        const update: Record<string, unknown> = { stripe_status: stripeInvoice.status }
        if (event.type === 'invoice.paid') {
          update.status = 'paid'
          update.paid_at = new Date().toISOString()
        } else if (event.type === 'invoice.voided') {
          update.status = 'void'
        } else if (event.type === 'invoice.payment_failed' && !existing.due_date) {
          // Starts this invoice's 5-day grace clock (app/api/cron/billing-dunning)
          // the first time a charge attempt fails. A send_invoice invoice already
          // carries its own due_date from when it was raised; this only matters
          // for charge_automatically (subscription) invoices, which otherwise
          // never get one.
          update.due_date = new Date().toISOString().slice(0, 10)
        }

        await supabaseAdmin.from('invoices').update(update).eq('id', existing.id)

        if (event.type === 'invoice.paid' && existing.tenant_id) {
          await supabaseAdmin.from('tenants').update({ paid: true, disabled: false }).eq('id', existing.tenant_id)
        }
      }
    }
  }

  // The owner just finished Stripe Checkout to switch to automatic card
  // billing (see app/api/owner/stripe/subscription-checkout) — record the
  // new subscription and flip billing_method.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.mode === 'subscription' && session.client_reference_id && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const itemId = subscription.items.data[0]?.id || null
      await supabaseAdmin
        .from('tenants')
        .update({
          billing_method: 'subscription',
          stripe_subscription_id: subscription.id,
          stripe_subscription_item_id: itemId,
          paid: true,
          disabled: false,
        })
        .eq('id', session.client_reference_id)
    }
  }

  // A subscription cancelled from the Stripe dashboard directly (rather than
  // via the owner's "switch to pay-by-invoice" button) should still fall
  // back to the invoice flow here, not leave the tenant on a dead subscription.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await supabaseAdmin
      .from('tenants')
      .update({ billing_method: 'invoice', stripe_subscription_id: null, stripe_subscription_item_id: null })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}

async function createInvoiceRowForSubscriptionInvoice(stripeInvoice: Stripe.Invoice): Promise<string | null> {
  const subscriptionId = subscriptionIdOf(stripeInvoice)
  if (!subscriptionId) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  if (!tenant) return null

  const line = stripeInvoice.lines?.data?.[0] as (Stripe.InvoiceLineItem & { period?: { start: number; end: number } }) | undefined
  const periodStart = line?.period?.start
    ? new Date(line.period.start * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const periodEnd = line?.period?.end
    ? new Date(line.period.end * 1000 - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : periodStart

  const { count: staffCount } = await supabaseAdmin
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  const { data: row } = await supabaseAdmin
    .from('invoices')
    .insert({
      tenant_id: tenant.id,
      period_start: periodStart,
      period_end: periodEnd,
      staff_count: staffCount || 0,
      amount_pence: stripeInvoice.amount_due,
      is_proration: false,
      status: 'sent',
      sent_at: new Date().toISOString(),
      stripe_invoice_id: stripeInvoice.id,
      stripe_hosted_invoice_url: stripeInvoice.hosted_invoice_url || null,
      stripe_status: stripeInvoice.status,
    })
    .select('id')
    .maybeSingle()

  return row?.id || null
}
