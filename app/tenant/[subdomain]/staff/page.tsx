'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toDateStr } from '@/lib/availability'
import { downloadCsv } from '@/lib/csv'
import '../tenant.css'

type MyData = {
  id: string
  name: string
  role: string
  access_level: 'admin' | 'user'
}

type Booking = {
  id: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
  amount_paid: number | null
  service_name: string | null
  service_price: number | null
  no_show?: boolean
  no_show_fee_amount?: number | null
  no_show_fee_status?: string
  has_card?: boolean
}

function statusColors(status: string) {
  if (status === 'pending') return { bg: '#fef9c3', color: '#854d0e' }
  if (status === 'confirmed') return { bg: '#dcfce7', color: '#166534' }
  if (status === 'declined') return { bg: '#fee2e2', color: '#991b1b' }
  if (status === 'cancelled') return { bg: '#f3f4f6', color: '#6b7280' }
  return { bg: '#f3f4f6', color: '#374151' }
}

function money(n: number): string {
  return `£${n.toFixed(2)}`
}

function monthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
}

export default function StaffPortalPage() {
  const router = useRouter()
  const params = useParams()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [checking, setChecking] = useState(true)
  const [me, setMe] = useState<MyData | null>(null)
  const [isOwnerToo, setIsOwnerToo] = useState(false)

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [dayError, setDayError] = useState('')

  const [monthExpected, setMonthExpected] = useState(0)
  const [monthActual, setMonthActual] = useState(0)
  const [monthLoading, setMonthLoading] = useState(false)

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [reportMode, setReportMode] = useState<'month' | 'range'>('month')
  const [reportMonth, setReportMonth] = useState(() => monthStr(new Date()))
  const [reportStart, setReportStart] = useState(() => toDateStr(startOfMonth(new Date())))
  const [reportEnd, setReportEnd] = useState(() => toDateStr(new Date()))
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  const [connectStatus, setConnectStatus] = useState<'not_connected' | 'pending' | 'connected' | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [connectError, setConnectError] = useState('')

  const [noShowBusyId, setNoShowBusyId] = useState<string | null>(null)
  const [noShowError, setNoShowError] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, brand_color, disabled, owner_id')
        .eq('subdomain', params.subdomain)
        .single()

      if (!tenant || tenant.disabled) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      const { data: myData, error: myError } = await supabase.rpc('staff_get_my_data', {
        p_tenant_id: tenant.id,
      })

      if (myError || !myData) {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      setMe(myData as MyData)
      // This login might ALSO be the shop owner (their portal email matches
      // their own owner login, so this staff profile is linked straight to
      // their account) — in that case, show a way back to the dashboard,
      // since a genuinely separate staff member has no dashboard to go back to.
      setIsOwnerToo(tenant.owner_id === user.id)
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  useEffect(() => {
    if (!tenantId) return
    refreshConnectStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  async function refreshConnectStatus() {
    if (!tenantId) return
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    try {
      const res = await fetch('/api/staff/stripe/connect-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ tenantId }),
      })
      const json = await res.json()
      if (res.ok) setConnectStatus(json.status)
    } catch {
      // Payouts status is a nice-to-have on page load; a network blip here
      // shouldn't block the rest of the portal.
    }
  }

  async function startConnect() {
    if (!tenantId) return
    setConnectLoading(true)
    setConnectError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    try {
      const res = await fetch('/api/staff/stripe/connect-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ tenantId, subdomain: params.subdomain }),
      })
      const json = await res.json()
      if (!res.ok) {
        setConnectError(json.error || 'Could not start payout setup.')
        setConnectLoading(false)
        return
      }
      window.location.href = json.url
    } catch {
      setConnectError('Could not start payout setup.')
      setConnectLoading(false)
    }
  }

  useEffect(() => {
    if (!tenantId) return
    loadDay(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate])

  useEffect(() => {
    if (!tenantId) return
    loadMonth(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate])

  async function loadDay(dateStr: string) {
    if (!tenantId) return
    setLoadingDay(true)
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    const [{ data, error }, { data: noShowData }] = await Promise.all([
      supabase.rpc('staff_get_my_bookings', {
        p_tenant_id: tenantId,
        p_start: dayStart.toISOString(),
        p_end: dayEnd.toISOString(),
      }),
      supabase.rpc('staff_get_no_show_fields', {
        p_tenant_id: tenantId,
        p_start: dayStart.toISOString(),
        p_end: dayEnd.toISOString(),
      }),
    ])

    const noShowById = new Map((noShowData || []).map((r: any) => [r.id, r]))
    const bookings = ((data as Booking[]) || []).map((b) => ({ ...b, ...(noShowById.get(b.id) || {}) }))
    setDayBookings(bookings)
    setDayError(error ? error.message : '')

    // Assume a confirmed booking was paid in full (the expected service
    // price) until the amount is explicitly amended — so the box shows a
    // real, saveable value rather than a placeholder that looks the same
    // but isn't actually recorded. Only fall back to blank when there's no
    // expected price to assume either.
    const nextAmounts: Record<string, string> = {}
    for (const b of bookings) {
      if (b.amount_paid != null) {
        nextAmounts[b.id] = String(b.amount_paid)
      } else if (b.service_price != null) {
        nextAmounts[b.id] = String(b.service_price)
      } else {
        nextAmounts[b.id] = ''
      }
    }
    setAmounts(nextAmounts)
    setLoadingDay(false)
  }

  async function loadMonth(dateStr: string) {
    if (!tenantId) return
    setMonthLoading(true)
    const d = new Date(dateStr + 'T00:00:00')
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const { data } = await supabase.rpc('staff_get_my_bookings', {
      p_tenant_id: tenantId,
      p_start: monthStart.toISOString(),
      p_end: monthEnd.toISOString(),
    })

    const rows = (data as Booking[]) || []
    let expected = 0
    let actual = 0
    for (const r of rows) {
      if (r.status !== 'confirmed') continue
      expected += r.service_price || 0
      // Same "paid in full unless amended" assumption as the day view below.
      actual += r.amount_paid != null ? Number(r.amount_paid) : (r.service_price || 0)
    }
    setMonthExpected(expected)
    setMonthActual(actual)
    setMonthLoading(false)
  }

  function changeDay(offset: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(toDateStr(d))
  }

  async function saveAmount(bookingId: string) {
    if (!tenantId) return
    const raw = amounts[bookingId]
    const value = raw === '' ? null : Number(raw)
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      alert('Please enter a valid amount.')
      return
    }

    setSavingId(bookingId)
    const { error } = await supabase.rpc('staff_update_my_payment', {
      p_tenant_id: tenantId,
      p_booking_id: bookingId,
      p_amount: value,
    })

    setSavingId(null)
    if (error) {
      alert(error.message)
      return
    }

    await loadDay(selectedDate)
    await loadMonth(selectedDate)
  }

  async function callNoShowRoute(path: string, bookingId: string, body?: Record<string, unknown>) {
    setNoShowBusyId(bookingId)
    setNoShowError((e) => ({ ...e, [bookingId]: '' }))
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify(body || {}),
    })
    const result = await res.json().catch(() => ({}))
    setNoShowBusyId(null)

    if (!res.ok) {
      setNoShowError((e) => ({ ...e, [bookingId]: result.error || 'Something went wrong.' }))
      return false
    }
    await loadDay(selectedDate)
    return true
  }

  async function markNoShow(bookingId: string, noShow: boolean) {
    await callNoShowRoute(`/api/staff/bookings/${bookingId}/mark-no-show`, bookingId, { noShow })
  }

  async function chargeNoShow(bookingId: string) {
    await callNoShowRoute(`/api/staff/bookings/${bookingId}/charge-no-show`, bookingId)
  }

  async function logNoShowFee(bookingId: string) {
    await callNoShowRoute(`/api/staff/bookings/${bookingId}/log-no-show-fee`, bookingId)
  }

  async function downloadReport() {
    if (!tenantId || !me) return
    setReportError('')

    let rangeStart: Date
    let rangeEnd: Date
    let labelForFilename: string

    if (reportMode === 'month') {
      if (!reportMonth) {
        setReportError('Choose a month.')
        return
      }
      const [y, m] = reportMonth.split('-').map(Number)
      const monthDate = new Date(y, m - 1, 1)
      rangeStart = startOfMonth(monthDate)
      rangeEnd = endOfMonth(monthDate)
      labelForFilename = reportMonth
    } else {
      if (!reportStart || !reportEnd) {
        setReportError('Choose a start and end date.')
        return
      }
      rangeStart = new Date(reportStart + 'T00:00:00')
      rangeEnd = new Date(reportEnd + 'T23:59:59')
      if (rangeStart > rangeEnd) {
        setReportError('The start date must be before the end date.')
        return
      }
      labelForFilename = `${reportStart}-to-${reportEnd}`
    }

    setReportLoading(true)
    // Same staff_get_my_bookings call the rest of this page uses — it's a
    // SECURITY DEFINER function that only ever returns the signed-in staff
    // member's own bookings, so this report can't end up containing anyone
    // else's data no matter what range is requested.
    const { data, error } = await supabase.rpc('staff_get_my_bookings', {
      p_tenant_id: tenantId,
      p_start: rangeStart.toISOString(),
      p_end: rangeEnd.toISOString(),
    })
    setReportLoading(false)

    if (error) {
      setReportError(error.message)
      return
    }

    const rows = ((data as Booking[]) || []).slice().sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const csvRows: string[][] = [
      ['Date', 'Time', 'Customer', 'Service', 'Status', 'Expected (£)', 'Amount paid (£)'],
    ]
    for (const b of rows) {
      const start = new Date(b.start_time)
      const expected = b.service_price != null ? b.service_price.toFixed(2) : ''
      const paid =
        b.status === 'confirmed'
          ? (b.amount_paid != null ? Number(b.amount_paid) : (b.service_price ?? 0)).toFixed(2)
          : ''
      csvRows.push([
        start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        b.customer_name,
        b.service_name || '',
        b.status,
        expected,
        paid,
      ])
    }

    const safeName = me.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    downloadCsv(`earnings-${safeName}-${labelForFilename}.csv`, csvRows)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>Checking access...</p>
        </div>
      </div>
    )
  }

  if (!me) return null

  const isAdmin = me.access_level === 'admin'

  const dayExpected = dayBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.service_price || 0), 0)
  const dayActual = dayBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.amount_paid != null ? Number(b.amount_paid) : (b.service_price || 0)), 0)

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        {isOwnerToo && <Link href="/dashboard/staff" className="back-link">← Back to staff</Link>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div className="tenant-hero" style={{ textAlign: 'left', margin: 0 }}>
            <h1>Hi, {me.name}</h1>
            <p>{me.role} {isAdmin ? '· Admin access' : '· View only'}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', height: 'fit-content' }}
          >
            Log out
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
          <div className="card" style={{ cursor: 'default', flex: '1 1 200px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
            <div className="card-sub">Today&apos;s expected</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand)' }}>{money(dayExpected)}</div>
          </div>
          <div className="card" style={{ cursor: 'default', flex: '1 1 200px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
            <div className="card-sub">Today&apos;s actual</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{money(dayActual)}</div>
          </div>
          <div className="card" style={{ cursor: 'default', flex: '1 1 200px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
            <div className="card-sub">This month so far (actual)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {monthLoading ? '...' : money(monthActual)}
            </div>
            <div className="card-sub" style={{ marginTop: 0 }}>
              Expected: {monthLoading ? '...' : money(monthExpected)}
            </div>
          </div>
        </div>

        <Link href="/staff/insights" className="card" style={{ marginBottom: '1.5rem' }}>
          <div>
            <div className="card-title">📈 My insights</div>
            <div className="card-sub">Week on week, best week, top clients, who you haven&apos;t seen lately, busy and quiet times</div>
          </div>
          <span style={{ color: 'var(--brand)', fontWeight: 700 }}>→</span>
        </Link>

        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600 }}>Get paid directly</div>
          {connectStatus === 'connected' ? (
            <p className="card-sub" style={{ margin: 0, color: '#166534' }}>
              ✅ Payouts are set up — Stripe can pay you directly.
            </p>
          ) : (
            <>
              <p className="card-sub" style={{ margin: 0 }}>
                {connectStatus === 'pending'
                  ? 'You started setting this up but haven’t finished — pick up where you left off.'
                  : 'Connect your bank details with Stripe so you can be paid out directly, instead of settling up with your employer separately.'}
              </p>
              <button
                onClick={startConnect}
                disabled={connectLoading}
                style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {connectLoading ? 'Opening Stripe...' : connectStatus === 'pending' ? 'Finish setting up payouts' : 'Set up payouts'}
              </button>
              {connectError && <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0 }}>{connectError}</p>}
            </>
          )}
        </div>

        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600 }}>Download your earnings report</div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setReportMode('month')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: reportMode === 'month' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: reportMode === 'month' ? 'var(--brand)' : '#fff',
                color: reportMode === 'month' ? '#fff' : '#000',
                cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              By month
            </button>
            <button
              onClick={() => setReportMode('range')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: reportMode === 'range' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: reportMode === 'range' ? 'var(--brand)' : '#fff',
                color: reportMode === 'range' ? '#fff' : '#000',
                cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              Custom range
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {reportMode === 'month' ? (
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
              />
            ) : (
              <>
                <input
                  type="date"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>to</span>
                <input
                  type="date"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
              </>
            )}
            <button
              onClick={downloadReport}
              disabled={reportLoading}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {reportLoading ? 'Preparing...' : 'Download CSV'}
            </button>
          </div>

          <p className="card-sub" style={{ margin: 0 }}>
            Includes only your own bookings — date, service, status, expected price and amount paid.
          </p>

          {reportError && (
            <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0 }}>{reportError}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => changeDay(-1)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            ← Prev day
          </button>
          <div style={{ fontWeight: 600 }}>{dayLabel}</div>
          <button
            onClick={() => changeDay(1)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Next day →
          </button>
          <button
            onClick={() => setSelectedDate(toDateStr(new Date()))}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
          >
            Today
          </button>
        </div>

        {loadingDay && <p>Loading...</p>}
        {dayError && (
          <p style={{ color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem' }}>
            Couldn&apos;t load this day: {dayError}
          </p>
        )}
        {!loadingDay && !dayError && dayBookings.length === 0 && <p style={{ color: '#666' }}>No bookings this day.</p>}

        <div className="card-list">
          {dayBookings.map((b) => {
            const colors = statusColors(b.status)
            const time = new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={b.id} className="card" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div className="card-title">{time} · {b.customer_name}</div>
                  <div className="card-sub">
                    {b.service_name} {b.service_price != null && `· expected ${money(b.service_price)}`}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                    textTransform: 'capitalize', background: colors.bg, color: colors.color,
                  }}
                >
                  {b.status}
                </span>
                {b.status === 'confirmed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isAdmin ? (
                      <>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>£</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={amounts[b.id] ?? ''}
                          onChange={(e) => setAmounts({ ...amounts, [b.id]: e.target.value })}
                          placeholder="0.00"
                          style={{ width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                        />
                        <button
                          onClick={() => saveAmount(b.id)}
                          disabled={savingId === b.id}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {savingId === b.id ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.9rem' }}>
                        {b.amount_paid != null
                          ? money(Number(b.amount_paid))
                          : b.service_price != null
                          ? money(b.service_price)
                          : '—'}
                      </span>
                    )}
                  </div>
                )}
                {b.status === 'confirmed' && new Date(b.start_time) < new Date() && (
                  <div style={{ width: '100%', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                    {!b.no_show ? (
                      <button
                        onClick={() => markNoShow(b.id, true)}
                        disabled={noShowBusyId === b.id}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        {noShowBusyId === b.id ? 'Saving...' : 'Mark as no-show'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b' }}>
                          No-show{b.no_show_fee_amount != null && ` · ${money(Number(b.no_show_fee_amount))} fee`}
                        </span>
                        {b.no_show_fee_status === 'charged' ? (
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>✓ Charged</span>
                        ) : b.no_show_fee_status === 'logged' ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged as owed</span>
                        ) : b.no_show_fee_amount != null ? (
                          <>
                            {b.has_card && (
                              <button
                                onClick={() => chargeNoShow(b.id)}
                                disabled={noShowBusyId === b.id}
                                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                              >
                                {noShowBusyId === b.id ? 'Charging...' : `Charge ${money(Number(b.no_show_fee_amount))}`}
                              </button>
                            )}
                            <button
                              onClick={() => logNoShowFee(b.id)}
                              disabled={noShowBusyId === b.id}
                              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                              Log as unpaid
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No no-show fee set for this shop</span>
                        )}
                        <button
                          onClick={() => markNoShow(b.id, false)}
                          disabled={noShowBusyId === b.id}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    {noShowError[b.id] && <p className="error-text" style={{ marginTop: '0.4rem' }}>{noShowError[b.id]}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
