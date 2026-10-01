import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

// Returns (and, where possible, refreshes) the signed-in staff member's own
// Stripe Connect status. Called on page load and right after returning from
// Stripe's onboarding flow, when the webhook may not have arrived yet.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const tenantId = body.tenantId as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId.' }, { status: 400 })

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, stripe_account_id, stripe_connect_status, stripe_payouts_enabled')
    .eq('tenant_id', tenantId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // If we have an account but the platform isn't configured (or Stripe is
  // briefly unreachable), just return what's already on the row rather than
  // failing the whole page load.
  if (staff.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
    try {
      // v2 Core Accounts API — configuration.recipient isn't returned unless
      // explicitly requested via `include`. The recipient capability's own
      // status ('active' once Stripe has fully enabled it) is this API's
      // equivalent of v1's boolean `payouts_enabled`.
      const account = await stripe.v2.core.accounts.retrieve(staff.stripe_account_id, {
        include: ['configuration.recipient'],
      })
      const transferStatus = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
      const payoutsEnabled = transferStatus === 'active'
      const status = payoutsEnabled ? 'connected' : 'pending'
      if (status !== staff.stripe_connect_status || payoutsEnabled !== staff.stripe_payouts_enabled) {
        await supabaseAdmin
          .from('staff')
          .update({ stripe_connect_status: status, stripe_payouts_enabled: payoutsEnabled })
          .eq('id', staff.id)
      }
      return NextResponse.json({ status, payoutsEnabled })
    } catch {
      // fall through to returning the stored values
    }
  }

  return NextResponse.json({
    status: staff.stripe_connect_status,
    payoutsEnabled: staff.stripe_payouts_enabled,
  })
}
