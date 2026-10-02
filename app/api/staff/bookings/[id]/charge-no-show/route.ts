import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargeNoShowFee } from '@/lib/stripeNoShow'

// Charges a no-show fee to the customer's saved card, paid out straight to
// the staff member's own Stripe Connect account. Only the staff member who
// held the booking can trigger this, and only once a card is actually on
// file and their own payouts are set up — otherwise this route tells the
// caller to use the manual fee-owed log instead (app/api/staff/bookings/
// [id]/log-no-show-fee) rather than attempting something that can't work.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, staff_id, no_show, no_show_fee_amount, no_show_fee_status, customer_stripe_customer_id, customer_payment_method_id')
    .eq('id', id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, name, stripe_account_id, stripe_payouts_enabled')
    .eq('id', booking.staff_id)
    .eq('tenant_id', booking.tenant_id)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (!booking.no_show || !booking.no_show_fee_amount) {
    return NextResponse.json({ error: 'This booking has no no-show fee to charge.' }, { status: 400 })
  }
  if (!booking.customer_stripe_customer_id || !booking.customer_payment_method_id) {
    return NextResponse.json({ error: 'No card was saved for this booking — use "Log as unpaid" instead.' }, { status: 400 })
  }
  if (!staff.stripe_payouts_enabled || !staff.stripe_account_id) {
    return NextResponse.json({ error: 'Set up your payouts first (see the Payments section of your staff portal).' }, { status: 400 })
  }
  if (booking.no_show_fee_status === 'charged') {
    return NextResponse.json({ error: 'This no-show fee has already been charged.' }, { status: 400 })
  }

  const result = await chargeNoShowFee({
    customerId: booking.customer_stripe_customer_id,
    paymentMethodId: booking.customer_payment_method_id,
    amountPounds: Number(booking.no_show_fee_amount),
    staffStripeAccountId: staff.stripe_account_id,
    description: `No-show fee — ${staff.name}`,
  })

  if (!result.ok) {
    await supabaseAdmin.from('bookings').update({ no_show_fee_status: 'failed' }).eq('id', booking.id)
    return NextResponse.json({ error: result.error }, { status: 402 })
  }

  await supabaseAdmin
    .from('bookings')
    .update({ no_show_fee_status: 'charged', no_show_charged_at: new Date().toISOString() })
    .eq('id', booking.id)

  return NextResponse.json({ ok: true })
}
