import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resolveShopRole } from '@/lib/shopAccess'
import { sendStaffPortalEmail } from '@/lib/email'

// Sends (or resends) a staff member their portal login link. The shop's
// owner, or a staff member promoted to dashboard admin, can trigger this for
// their own shop's staff — verified via the bearer token and resolveShopRole,
// mirroring the pattern used for admin routes.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const staffId = body.staffId as string | undefined
  const subdomain = body.subdomain as string | undefined
  if (!staffId || !subdomain) {
    return NextResponse.json({ error: 'Missing staffId or subdomain.' }, { status: 400 })
  }

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, name, email, user_id, tenant_id')
    .eq('id', staffId)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
  if (!staff.email) return NextResponse.json({ error: 'This staff member has no email set.' }, { status: 400 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, owner_id, subdomain')
    .eq('id', staff.tenant_id)
    .maybeSingle()

  if (!tenant || !(await resolveShopRole(supabaseAdmin, tenant, userData.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // A portal email that matches the owner's own login can't get its own
  // separate Supabase account (logins are one per email) — generateLink would
  // otherwise silently fall back to a recovery link for the OWNER's account,
  // linking this staff profile to a login that can never actually reach the
  // staff portal (the owner's login always goes to the dashboard instead).
  const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
  if (ownerUser?.user?.email && ownerUser.user.email.toLowerCase() === staff.email.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "This staff member's email is the same as the owner login, so it can't have its own separate staff login. " +
          "The owner can already see this profile's calendar and earnings from the dashboard — use a different email here only if this is really a separate person.",
      },
      { status: 400 }
    )
  }

  const redirectTo = `https://${subdomain}.trimbooking.co.uk/staff/set-password`

  let type: 'invite' | 'recovery' = staff.user_id ? 'recovery' : 'invite'
  let linkResult = await supabaseAdmin.auth.admin.generateLink({
    type,
    email: staff.email,
    options: { redirectTo },
  })

  // If this email is already a registered auth user (e.g. someone who is
  // staff at more than one shop, or a re-invite), fall back to a recovery
  // link instead, which works for any existing account.
  if (linkResult.error && type === 'invite' && /already registered|already exists/i.test(linkResult.error.message || '')) {
    type = 'recovery'
    linkResult = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: staff.email,
      options: { redirectTo },
    })
  }

  if (linkResult.error || !linkResult.data) {
    return NextResponse.json({ error: linkResult.error?.message || 'Could not generate invite link.' }, { status: 500 })
  }

  const actionLink = linkResult.data.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ error: 'Could not generate invite link.' }, { status: 500 })
  }

  const linkedUserId = staff.user_id || linkResult.data.user?.id || null

  await supabaseAdmin
    .from('staff')
    .update({
      user_id: linkedUserId,
      invited_at: new Date().toISOString(),
    })
    .eq('id', staff.id)

  const emailResult = await sendStaffPortalEmail({
    type: type === 'invite' ? 'invite' : 'reset',
    tenantName: tenant.name,
    staffName: staff.name,
    staffEmail: staff.email,
    actionLink,
  })

  if (emailResult.error) {
    return NextResponse.json({ error: 'Could not send the invite email: ' + emailResult.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
