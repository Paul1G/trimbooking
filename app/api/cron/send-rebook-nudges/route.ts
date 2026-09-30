import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendRebookNudgeEmail } from '@/lib/email'
import { computeRebookInfo, formatIntervalDays, isDueToRebook, type PastVisit } from '@/lib/rebooking'

export const dynamic = 'force-dynamic'

type PastBookingRow = {
  id: string
  tenant_id: string
  customer_email: string
  customer_name: string
  start_time: string
  tenants: { name: string; subdomain: string } | null
}

type UpcomingBookingRow = {
  tenant_id: string
  customer_email: string
}

type NudgeLogRow = {
  tenant_id: string
  customer_email: string
  last_booking_id: string
}

function customerKey(tenantId: string, email: string) {
  return `${tenantId}::${email.toLowerCase().trim()}`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Every past confirmed visit, across all shops, is the raw material for
  // each customer's rebooking cadence.
  const { data: pastData, error: pastError } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, customer_email, customer_name, start_time, tenants:tenant_id(name, subdomain)')
    .eq('status', 'confirmed')
    .lt('start_time', now.toISOString())
    .not('customer_email', 'is', null)

  if (pastError) {
    return NextResponse.json({ error: pastError.message }, { status: 500 })
  }

  // Anyone with a pending or confirmed appointment still ahead of them isn't
  // "overdue" — they've already rebooked, so skip nudging them.
  const { data: upcomingData, error: upcomingError } = await supabaseAdmin
    .from('bookings')
    .select('tenant_id, customer_email')
    .in('status', ['pending', 'confirmed'])
    .gt('start_time', now.toISOString())
    .not('customer_email', 'is', null)

  if (upcomingError) {
    return NextResponse.json({ error: upcomingError.message }, { status: 500 })
  }

  const upcomingKeys = new Set(
    ((upcomingData || []) as UpcomingBookingRow[]).map((b) => customerKey(b.tenant_id, b.customer_email))
  )

  const { data: nudgeLogData, error: nudgeLogError } = await supabaseAdmin
    .from('rebook_nudges')
    .select('tenant_id, customer_email, last_booking_id')

  if (nudgeLogError) {
    return NextResponse.json({ error: nudgeLogError.message }, { status: 500 })
  }

  // Most recent nudge on file per customer, keyed so we can tell whether the
  // customer's current latest visit is one we've already nudged them about.
  const lastNudgedBookingId = new Map<string, string>()
  for (const row of (nudgeLogData || []) as NudgeLogRow[]) {
    lastNudgedBookingId.set(customerKey(row.tenant_id, row.customer_email), row.last_booking_id)
  }

  const byCustomer = new Map<
    string,
    { tenantId: string; tenantName: string; subdomain: string; customerName: string; customerEmail: string; visits: PastVisit[] }
  >()

  for (const b of (pastData || []) as unknown as PastBookingRow[]) {
    const key = customerKey(b.tenant_id, b.customer_email)
    const existing = byCustomer.get(key)
    if (existing) {
      existing.visits.push({ id: b.id, start_time: b.start_time })
    } else {
      byCustomer.set(key, {
        tenantId: b.tenant_id,
        tenantName: b.tenants?.name || '',
        subdomain: b.tenants?.subdomain || '',
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        visits: [{ id: b.id, start_time: b.start_time }],
      })
    }
  }

  let sent = 0
  let skippedAlreadyNudged = 0
  let skippedHasUpcoming = 0
  const failures: string[] = []

  for (const [key, customer] of byCustomer) {
    if (upcomingKeys.has(key)) {
      skippedHasUpcoming++
      continue
    }

    const info = computeRebookInfo(customer.visits)
    if (!isDueToRebook(info, now) || info.avgIntervalDays == null || !info.lastVisit) continue

    const latestVisit = [...customer.visits].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )[0]

    if (lastNudgedBookingId.get(key) === latestVisit.id) {
      skippedAlreadyNudged++
      continue
    }

    if (!customer.subdomain) continue

    const result = await sendRebookNudgeEmail({
      tenantName: customer.tenantName,
      subdomain: customer.subdomain,
      customerEmail: customer.customerEmail,
      customerName: customer.customerName,
      lastVisitLabel: new Date(info.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
      intervalLabel: formatIntervalDays(info.avgIntervalDays),
    })

    if (result.error) {
      failures.push(`${key}: ${result.error}`)
      continue
    }

    await supabaseAdmin.from('rebook_nudges').insert({
      tenant_id: customer.tenantId,
      customer_email: customer.customerEmail,
      last_booking_id: latestVisit.id,
    })

    sent++
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    candidates: byCustomer.size,
    sent,
    skippedAlreadyNudged,
    skippedHasUpcoming,
    failures,
  })
}
