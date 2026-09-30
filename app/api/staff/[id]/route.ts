import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Deleting a staff member should fully cut off their access — not just hide
// them from the dashboard. Removing only the `staff` row would leave their
// login (a Supabase auth user) sitting around; the tenant login page already
// re-checks for a matching staff row on every sign-in, so that account
// couldn't manage this shop any more, but it would keep existing indefinitely
// and could still be signed into. This route also removes the auth account
// itself, unless it's still needed — e.g. someone who is staff at more than
// one shop, or who is a shop owner in their own right.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, tenant_id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, owner_id')
    .eq('id', staff.tenant_id)
    .maybeSingle()

  if (!tenant || tenant.owner_id !== userData.user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await supabaseAdmin.from('staff_services').delete().eq('staff_id', id)

  const { error: deleteError } = await supabaseAdmin.from('staff').delete().eq('id', id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (staff.user_id) {
    // Only remove the auth account itself if nothing else still relies on
    // it — this same person could be staff at another shop, or an owner.
    const [{ count: otherStaffCount }, { data: ownedTenant }] = await Promise.all([
      supabaseAdmin
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', staff.user_id),
      supabaseAdmin.from('tenants').select('id').eq('owner_id', staff.user_id).maybeSingle(),
    ])

    if (!otherStaffCount && !ownedTenant) {
      await supabaseAdmin.auth.admin.deleteUser(staff.user_id)
    }
  }

  return NextResponse.json({ ok: true })
}
