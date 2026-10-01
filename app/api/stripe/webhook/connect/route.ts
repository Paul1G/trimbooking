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

  // This webhook is strictly best-effort: connect-status/route.ts always
  // re-checks the real status directly from Stripe whenever a staff member
  // loads their portal or returns from onboarding, so nothing here needs to
  // be perfect — it's just a background nice-to-have. Anything unexpected
  // (a signature mismatch, an event shape this code doesn't recognise, a v2
  // "thin" event this older parsing method can't read at all) is swallowed
  // and answered with 200 rather than surfaced as a failure, so Stripe
  // doesn't spend retries on a webhook whose outcome doesn't actually matter.
  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    // Stripe.Event['type'] is typed as a closed union of classic v1 event
    // names, which doesn't include the v2 Core Accounts event names this
    // account may actually send — widen to string for the comparison below.
    const eventType = event.type as string

    // Recognise the classic event name and every v2 Core Accounts shape this
    // account's "connected accounts" webhook might send for a status change
    // — whichever one the Stripe dashboard actually let us select for this
    // account (it only allows v1 Express accounts, and therefore maybe not
    // the classic `account.updated` event either, for *new* integrations).
    const isAccountStatusEvent =
      eventType === 'account.updated' ||
      eventType === 'v2.core.account.updated' ||
      eventType.startsWith('v2.core.account[configuration.recipient]')

    if (isAccountStatusEvent) {
      const accountId = (event.data.object as { id?: string } | undefined)?.id
      if (accountId) {
        const v2Account = await stripe.v2.core.accounts.retrieve(accountId, {
          include: ['configuration.recipient'],
        })
        const transferStatus = v2Account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
        const payoutsEnabled = transferStatus === 'active'
        const status = payoutsEnabled ? 'connected' : 'pending'

        await supabaseAdmin
          .from('staff')
          .update({ stripe_connect_status: status, stripe_payouts_enabled: payoutsEnabled })
          .eq('stripe_account_id', accountId)
      }
    }
  } catch {
    // See comment above — intentionally not surfaced as an error response.
  }

  return NextResponse.json({ received: true })
}
