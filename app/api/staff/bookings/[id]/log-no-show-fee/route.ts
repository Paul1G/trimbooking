import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// The fallback for everyone who isn't set up for an automatic charge (no
// card was saved, the card was declined, or the shop doesn't use no-show
// protection at all) — just records that a fee is owed, for the shop to
// chase up outside the app, same spirit as the existing manually-entered
// amount_paid field.
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
  const amount = body.amount != null ? Number(body.amount) : null

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, staff_id, no_show_fee_amount')
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

  const update: Record<string, unknown> = { no_show_fee_status: 'logged' }
  // Allow overriding the amount (e.g. the shop's standard fee didn't apply,
  // or there's no fee configured at all) — otherwise keep whatever was
  // snapshotted when the booking was marked as a no-show.
  if (amount != null && !Number.isNaN(amount) && amount >= 0) {
    update.no_show_fee_amount = amount
  } else if (booking.no_show_fee_amount == null) {
    return NextResponse.json({ error: 'Enter an amount — this booking has no fee set.' }, { status: 400 })
  }

  await supabaseAdmin.from('bookings').update(update).eq('id', booking.id)

  return NextResponse.json({ ok: true })
}
