import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrCreateStripeCustomer, createSubscriptionCheckoutSession } from '@/lib/stripeBilling'

// Starts the "switch to automatic monthly billing" flow for a shop owner:
// a Stripe Checkout session (mode: subscription) where they add a card.
// Only that shop's own owner can trigger this for their own tenant,
// verified via the bearer token — same pattern as app/api/staff/invite.
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
    .select('id, name, owner_id')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!tenant || tenant.owner_id !== userData.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { count: staffCount } = await supabaseAdmin
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  const customerId = await getOrCreateStripeCustomer(tenant.id, tenant.name, userData.user.email || null)
  if (!customerId) {
    return NextResponse.json({ error: "Billing isn't configured yet — contact support." }, { status: 503 })
  }

  const origin = `https://${subdomain}.trimbooking.co.uk`
  const session = await createSubscriptionCheckoutSession({
    customerId,
    tenantId: tenant.id,
    staffCount: staffCount || 0,
    successUrl: `${origin}/dashboard/billing?subscribed=1`,
    cancelUrl: `${origin}/dashboard/billing?cancelled=1`,
  })

  if (!session?.url) {
    return NextResponse.json({ error: session?.error ? `Could not start checkout: ${session.error}` : 'Could not start checkout.' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
