import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Stripe Connect webhook — events on CONNECTED accounts (staff payout
// accounts), not the platform account itself. In the Stripe dashboard,
// create a webhook destination listening to "events on Connected accounts"
// pointed at https://trimbooking.co.uk/api/stripe/webhook/connect, and set
// STRIPE_CONNECT_WEBHOOK_SECRET to its signing secret. This keeps a staff
// member's connect status accurate even if they close the tab mid-onboarding
// (connect-status/route.ts covers the common case of them coming back).
//
// This is separate from /api/stripe/webhook/billing, which listens to events
// on the platform account itself (e.g. an invoice being paid).
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
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

  if (event.type === 'account.updated') {
    // This classic event is a backwards-compatibility snapshot Stripe still
    // emits for accounts created via the newer v2 Core Accounts API (what
    // connect-start/route.ts uses) — but its exact field shape for a v2
    // account isn't something to rely on. Instead, treat this event only as
    // "something changed, go check" and fetch the authoritative v2 status
    // directly, the same way connect-status/route.ts does.
    const account = event.data.object as Stripe.Account
    try {
      const v2Account = await stripe.v2.core.accounts.retrieve(account.id, {
        include: ['configuration.recipient'],
      })
      const transferStatus = v2Account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
      const payoutsEnabled = transferStatus === 'active'
      const status = payoutsEnabled ? 'connected' : 'pending'

      await supabaseAdmin
        .from('staff')
        .update({ stripe_connect_status: status, stripe_payouts_enabled: payoutsEnabled })
        .eq('stripe_account_id', account.id)
    } catch {
      // Best-effort — connect-status/route.ts covers the common case of the
      // staff member coming back to check their own status anyway.
    }
  }

  return NextResponse.json({ received: true })
}
