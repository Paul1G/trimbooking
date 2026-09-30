import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendBookingEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

type BookingRow = {
  id: string
  customer_name: string
  customer_email: string
  start_time: string
  end_time: string
  status: string
  week_reminder_sent_at: string | null
  day_reminder_sent_at: string | null
  thank_you_sent_at: string | null
  manage_token: string | null
  tenants: { name: string; subdomain: string } | null
  services: { name: string } | null
  staff: { name: string } | null
}

const SELECT_FIELDS =
  'id, customer_name, customer_email, start_time, end_time, status, week_reminder_sent_at, day_reminder_sent_at, thank_you_sent_at, manage_token, tenants:tenant_id(name, subdomain), services:service_id(name), staff:staff_id(name)'

// UTC day boundaries `daysFromNow` days from today (0 = today).
function dayBounds(daysFromNow: number) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow, 23, 59, 59, 999))
  return { start, end }
}

async function sendForWindow({
  daysFromNow,
  column,
  type,
  matchOn,
}: {
  daysFromNow: number
  column: 'week_reminder_sent_at' | 'day_reminder_sent_at' | 'thank_you_sent_at'
  type: 'reminder_week' | 'reminder_day' | 'thank_you'
  matchOn: 'start_time' | 'end_time'
}) {
  const { start, end } = dayBounds(daysFromNow)

  const { data, error } = await supabase
    .from('bookings')
    .select(SELECT_FIELDS)
    .eq('status', 'confirmed')
    .is(column, null)
    .gte(matchOn, start.toISOString())
    .lte(matchOn, end.toISOString())

  if (error) {
    return { type, error: error.message, sent: 0 }
  }

  const bookings = (data || []) as unknown as BookingRow[]
  let sent = 0
  const failures: string[] = []

  for (const booking of bookings) {
    const manageUrl = booking.manage_token && booking.tenants?.subdomain
      ? `https://${booking.tenants.subdomain}.trimbooking.co.uk/manage/${booking.manage_token}`
      : undefined

    const result = await sendBookingEmail({
      type,
      tenantName: booking.tenants?.name || '',
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      serviceName: booking.services?.name,
      staffName: booking.staff?.name,
      startTime: booking.start_time,
      manageUrl,
    })

    if (result.error) {
      failures.push(`${booking.id}: ${result.error}`)
      continue
    }

    await supabase
      .from('bookings')
      .update({ [column]: new Date().toISOString() })
      .eq('id', booking.id)

    sent++
  }

  return { type, sent, total: bookings.length, failures }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all([
    sendForWindow({ daysFromNow: 7, column: 'week_reminder_sent_at', type: 'reminder_week', matchOn: 'start_time' }),
    sendForWindow({ daysFromNow: 1, column: 'day_reminder_sent_at', type: 'reminder_day', matchOn: 'start_time' }),
    sendForWindow({ daysFromNow: -1, column: 'thank_you_sent_at', type: 'thank_you', matchOn: 'end_time' }),
  ])

  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}
