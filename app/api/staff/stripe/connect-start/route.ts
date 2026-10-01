import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'

// Starts (or resumes) Stripe Connect onboarding for the SIGNED-IN staff
// member, for their own account only — a staff member can only ever onboard
// themselves, verified by matching the bearer token's user to a staff row,
// never by a staffId passed in the body. Returns a one-time Stripe-hosted
// onboarding URL to redirect the browser to.
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
  const subdomain = body.subdomain as string | undefined
  if (!tenantId || !subdomain) {
    return NextResponse.json({ error: 'Missing tenantId or subdomain.' }, { status: 400 })
  }

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, name, email, tenant_id, stripe_account_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payouts aren’t set up for this site yet.' }, { status: 500 })
  }

  let accountId = staff.stripe_account_id as string | null

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: staff.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          staff_id: staff.id,
          tenant_id: tenantId,
        },
      })
      accountId = account.id

      await supabaseAdmin
        .from('staff')
        .update({ stripe_account_id: accountId, stripe_connect_status: 'pending' })
        .eq('id', staff.id)
    }

    const base = `https://${subdomain}.trimbooking.co.uk/staff`
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}?stripe=refresh`,
      return_url: `${base}?stripe=return`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not start Stripe onboarding.' }, { status: 500 })
  }
}
