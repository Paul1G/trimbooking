import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (typeof body.disabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing disabled boolean.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('tenants').update({ disabled: body.disabled }).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Permanently removes a shop: its bookings, staff (and their service links
// and holidays), services, the tenant row itself, and finally the owner's
// auth account. Deletes children explicitly, in dependency order, since we
// can't assume every foreign key has ON DELETE CASCADE configured.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { id } = await params

  const { data: tenant } = await supabaseAdmin.from('tenants').select('id, owner_id').eq('id', id).maybeSingle()
  if (!tenant) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
  }

  const { data: staffRows } = await supabaseAdmin.from('staff').select('id').eq('tenant_id', id)
  const staffIds = (staffRows || []).map((s) => s.id)

  await supabaseAdmin.from('bookings').delete().eq('tenant_id', id)
  if (staffIds.length > 0) {
    await supabaseAdmin.from('staff_services').delete().in('staff_id', staffIds)
  }
  await supabaseAdmin.from('staff_holidays').delete().eq('tenant_id', id)
  await supabaseAdmin.from('staff').delete().eq('tenant_id', id)
  await supabaseAdmin.from('services').delete().eq('tenant_id', id)
  await supabaseAdmin.from('tenants').delete().eq('id', id)

  if (tenant.owner_id) {
    await supabaseAdmin.auth.admin.deleteUser(tenant.owner_id)
  }

  return NextResponse.json({ ok: true })
}
