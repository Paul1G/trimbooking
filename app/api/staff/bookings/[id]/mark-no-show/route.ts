import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeNoShowFee } from '@/lib/noShow'

// Toggles a booking's no_show flag. Snapshots the fee amount (from the
// tenant's current no-show settings + this service) at the moment it's
// first marked, so a later change to the shop's fee settings doesn't alter
// what's owed on bookings already flagged. Same bearer-token + ownership
// check pattern as app/api/staff/[id]/route.ts, scoped to the signed-in
// staff member's own booking.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const noShow = body.noShow !== false // defaults true — this route is only ever called to flag one

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, staff_id, service_id')
    .eq('id', id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id')
    .eq('id', booking.staff_id)
    .eq('tenant_id', booking.tenant_id)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const update: Record<string, unknown> = { no_show: noShow }

  if (noShow) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('no_show_protection_enabled, no_show_card_required, no_show_fee_mode, no_show_fee_flat, no_show_fee_percentage')
      .eq('id', booking.tenant_id)
      .maybeSingle()

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('price, no_show_fee')
      .eq('id', booking.service_id)
      .maybeSingle()

    if (tenant && service) {
      const fee = computeNoShowFee(tenant as any, service as any)
      update.no_show_fee_amount = fee
    }
  } else {
    // Un-marking resets the fee bookkeeping entirely, rather than leaving a
    // stale amount/status around from a mistaken click.
    update.no_show_fee_amount = null
    update.no_show_fee_status = 'none'
    update.no_show_charged_at = null
  }

  await supabaseAdmin.from('bookings').update(update).eq('id', booking.id)

  return NextResponse.json({ ok: true })
}
