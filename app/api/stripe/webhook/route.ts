import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Stripe Connect webhook. Point a webhook endpoint at
// https://trimbooking.co.uk/api/stripe/webhook (Connect events) and set
// STRIPE_CONNECT_WEBHOOK_SECRET to its signing secret. This keeps a staff
// member's connect status accurate even if they close the tab mid-onboarding
// (the status-check route above covers the common case of them coming back).
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
    const account = event.data.object as Stripe.Account
    const payoutsEnabled = !!account.payouts_enabled
    const status = payoutsEnabled ? 'connected' : 'pending'

    await supabaseAdmin
      .from('staff')
      .update({ stripe_connect_status: status, stripe_payouts_enabled: payoutsEnabled })
      .eq('stripe_account_id', account.id)
  }

  return NextResponse.json({ received: true })
}
