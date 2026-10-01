import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cancelStripeSubscription } from '@/lib/stripeBilling'
import { startOfNextMonth } from '@/lib/billing'

// Switches a shop back from automatic card billing to the pay-by-invoice
// flow. Cancels the Stripe Subscription immediately (no partial refund of
// the current period) and resumes the regular monthly invoice cron from
// next month. Same owner-auth pattern as app/api/staff/invite.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const subdomain = body.subdomain as string | undefined
  if (!subdomain) return NextResponse.json({ error: 'Missing subdomain.' }, { status: 400 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, owner_id, stripe_subscription_id')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!tenant || tenant.owner_id !== userData.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (tenant.stripe_subscription_id) {
    await cancelStripeSubscription(tenant.stripe_subscription_id)
  }

  await supabaseAdmin
    .from('tenants')
    .update({
      billing_method: 'invoice',
      stripe_subscription_id: null,
      stripe_subscription_item_id: null,
      next_invoice_at: startOfNextMonth(new Date()).toISOString(),
    })
    .eq('id', tenant.id)

  return NextResponse.json({ ok: true })
}
