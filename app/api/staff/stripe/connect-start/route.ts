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
      // v2 Core Accounts API (not the older v1 Express accounts) — this
      // platform's Stripe account only allows v2 account creation for new
      // integrations. A "recipient" configuration with the stripe_transfers
      // capability is the v2 equivalent of a v1 Express account with the
      // `transfers` capability: it lets this account receive payouts without
      // ever taking card payments itself. dashboard: 'none' matches the
      // v1 setup too — staff use TrimBooking's own portal, not a Stripe login.
      const account = await stripe.v2.core.accounts.create({
        contact_email: staff.email || undefined,
        dashboard: 'none',
        identity: {
          country: 'GB',
          entity_type: 'individual',
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        // Required as soon as a recipient requests stripe_transfers: Stripe
        // won't hold the loss liability for an account this platform is
        // actively pushing payouts to (losses_collector: 'stripe' is
        // rejected with "capability_not_available_for_loss_collector" here),
        // so the platform is responsible for negative balances instead — and
        // Stripe requires fees_collector to match ('application') whenever
        // losses_collector is 'application'. This is the same pairing a v1
        // Express/Custom account gets when created via controller properties
        // directly (as opposed to the legacy `type=express`/`type=custom`
        // shortcut, which would have produced 'application_express'/
        // 'application_custom' instead — those aren't valid values to set
        // directly on creation).
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
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
    // v2 Account Links nest the URLs under use_case.account_onboarding,
    // unlike the flat refresh_url/return_url on the old v1 AccountLinks API.
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          refresh_url: `${base}?stripe=refresh`,
          return_url: `${base}?stripe=return`,
        },
      },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not start Stripe onboarding.' }, { status: 500 })
  }
}
