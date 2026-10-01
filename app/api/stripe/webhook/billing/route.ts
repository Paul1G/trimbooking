import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Stripe billing webhook — events on the PLATFORM account itself (an
// invoice we raised for a salon's subscription to TrimBooking being paid,
// voided, etc.), not events on a connected account. In the Stripe dashboard,
// create a webhook destination listening to "events on your account" pointed
// at https://trimbooking.co.uk/api/stripe/webhook/billing, and set
// STRIPE_WEBHOOK_SECRET to its signing secret.
//
// Keeps our own `invoices` row's stripe_status/paid_at in sync, and — when
// an invoice is actually paid — also switches that tenant to `paid: true`.
// This is what takes a trial shop live automatically the moment its owner
// pays the trial-ending invoice (see app/api/cron/send-trial-invoices),
// with no admin step required; it's a harmless no-op for a tenant that's
// already paid (e.g. a later regular monthly invoice).
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
      const update: Record<string, unknown> = { stripe_status: stripeInvoice.status }
      if (event.type === 'invoice.paid') {
        update.status = 'paid'
        update.paid_at = new Date().toISOString()
      } else if (event.type === 'invoice.voided') {
        update.status = 'void'
      }

      const { data: updatedInvoice } = await supabaseAdmin
        .from('invoices')
        .update(update)
        .eq('stripe_invoice_id', stripeInvoice.id)
        .select('tenant_id')
        .maybeSingle()

      if (event.type === 'invoice.paid' && updatedInvoice?.tenant_id) {
        // paid: true takes the tenant live (trial-ending invoice case); disabled: false
        // reactivates one switched off by the dunning cron (app/api/cron/billing-dunning)
        // for an overdue invoice — either way, paying any invoice puts the shop back live.
        await supabaseAdmin.from('tenants').update({ paid: true, disabled: false }).eq('id', updatedInvoice.tenant_id)
      }
    }
  }

  return NextResponse.json({ received: true })
}
