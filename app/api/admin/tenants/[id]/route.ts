import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const update: Record<string, unknown> = {}

  if (typeof body.disabled === 'boolean') {
    update.disabled = body.disabled
  }

  if (typeof body.paid === 'boolean') {
    update.paid = body.paid
    // Marking a shop as paid also lifts any trial-related disable; marking it
    // unpaid again doesn't re-disable it on its own — that's still an explicit
    // "disabled" action or the next automatic trial check.
    if (body.paid) update.disabled = false
  }

  if (typeof body.extendDays === 'number' && body.extendDays > 0) {
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('trial_ends_at')
      .eq('id', id)
      .maybeSingle()

    const base = existing?.trial_ends_at && new Date(existing.trial_ends_at) > new Date()
      ? new Date(existing.trial_ends_at)
      : new Date()

    update.trial_ends_at = new Date(base.getTime() + body.extendDays * 24 * 60 * 60 * 1000).toISOString()
    // Continuing the trial should re-enable a shop the automatic check disabled.
    update.disabled = false
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('tenants').update(update).eq('id', id)
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
