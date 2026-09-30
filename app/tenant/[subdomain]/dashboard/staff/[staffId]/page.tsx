'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toDateStr } from '@/lib/availability'
import '../../../tenant.css'

type Booking = {
  id: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
  amount_paid: number | null
  service_name: string | null
  service_price: number | null
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

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function StaffCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.staffId as string

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [staffName, setStaffName] = useState('')
  const [checking, setChecking] = useState(true)

  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [weekBookings, setWeekBookings] = useState<Booking[]>([])
  const [loadingWeek, setLoadingWeek] = useState(false)

  const [monthExpected, setMonthExpected] = useState(0)
  const [monthActual, setMonthActual] = useState(0)
  const [monthLoading, setMonthLoading] = useState(false)

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

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
        .select('*')
        .eq('subdomain', params.subdomain)
        .single()

      if (!tenant || tenant.owner_id !== user.id) {
        router.push('/login')
        return
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('name, tenant_id')
        .eq('id', staffId)
        .single()

      if (!staff || staff.tenant_id !== tenant.id) {
        router.push('/dashboard/staff')
        return
      }

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      setStaffName(staff.name)
      setChecking(false)
    }
    load()
  }, [params.subdomain, staffId, router])

  useEffect(() => {
    if (!tenantId) return
    loadDay(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate])

  useEffect(() => {
    if (!tenantId) return
    loadWeek(weekStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, weekStart])

  useEffect(() => {
    if (!tenantId) return
    loadMonth(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate])

  // Both reads go through owner_get_staff_bookings rather than selecting the
  // bookings table directly — it checks server-side that the caller actually
  // owns this tenant before returning anything, so a staff member's earnings
  // are only ever visible to that shop's owner (or the staff member
  // themselves, via the separate staff_* functions on their own portal).
  async function loadDay(dateStr: string) {
    if (!tenantId) return
    setLoadingDay(true)
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    const { data, error } = await supabase.rpc('owner_get_staff_bookings', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: dayStart.toISOString(),
      p_range_end: dayEnd.toISOString(),
    })

    const bookings = (!error && data) || []
    setDayBookings(bookings)
    mergeAmounts(bookings)
    setLoadingDay(false)
  }

  async function loadWeek(weekStartDate: Date) {
    if (!tenantId) return
    setLoadingWeek(true)
    const rangeStart = new Date(weekStartDate)
    const rangeEnd = new Date(weekStartDate)
    rangeEnd.setDate(rangeEnd.getDate() + 6)
    rangeEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase.rpc('owner_get_staff_bookings', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: rangeStart.toISOString(),
      p_range_end: rangeEnd.toISOString(),
    })

    const bookings = (!error && data) || []
    setWeekBookings(bookings)
    mergeAmounts(bookings)
    setLoadingWeek(false)
  }

  // Amounts state is shared between the day and week views (both key by
  // booking id), so loading either just adds its rows in rather than
  // clobbering whatever the other view already populated.
  function mergeAmounts(bookings: Booking[]) {
    setAmounts((prev) => {
      const next = { ...prev }
      for (const b of bookings) {
        next[b.id] = b.amount_paid != null ? String(b.amount_paid) : ''
      }
      return next
    })
  }

  async function loadMonth(dateStr: string) {
    if (!tenantId) return
    setMonthLoading(true)
    const d = new Date(dateStr + 'T00:00:00')
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const { data, error } = await supabase.rpc('owner_get_staff_bookings', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: monthStart.toISOString(),
      p_range_end: monthEnd.toISOString(),
    })

    const rows = (!error && data) || []
    let expected = 0
    let actual = 0
    for (const r of rows) {
      if (r.status !== 'confirmed') continue
      expected += r.service_price || 0
      actual += r.amount_paid != null ? Number(r.amount_paid) : 0
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

  function changeWeek(offset: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offset * 7)
    setWeekStart(d)
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
    // Goes through owner_update_staff_payment (SECURITY DEFINER) rather than
    // updating the bookings table directly — that function checks server-side
    // that the caller owns this tenant and raises if not, so a failed save is
    // always a visible error here rather than a silent no-op that leaves the
    // totals looking like the amendment was never entered.
    const { error } = await supabase.rpc('owner_update_staff_payment', {
      p_tenant_id: tenantId,
      p_booking_id: bookingId,
      p_amount: value,
    })

    setSavingId(null)
    if (error) {
      alert(error.message)
      return
    }

    await Promise.all([loadDay(selectedDate), loadWeek(weekStart), loadMonth(selectedDate)])
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

  const dayExpected = dayBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.service_price || 0), 0)
  const dayActual = dayBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.amount_paid != null ? Number(b.amount_paid) : 0), 0)

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  function bookingCard(b: Booking) {
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>£</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amounts[b.id] ?? ''}
              onChange={(e) => setAmounts({ ...amounts, [b.id]: e.target.value })}
              placeholder={b.service_price != null ? String(b.service_price) : '0.00'}
              style={{ width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
            />
            <button
              onClick={() => saveAmount(b.id)}
              disabled={savingId === b.id}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {savingId === b.id ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard/staff" className="back-link">← Back to staff</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>{staffName}&apos;s calendar</h1>
          <p>Enter the actual payment received for each appointment.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: viewMode === 'week' ? '2px solid var(--brand)' : '1px solid #ddd',
              background: viewMode === 'week' ? 'var(--brand)' : '#fff',
              color: viewMode === 'week' ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: viewMode === 'day' ? '2px solid var(--brand)' : '1px solid #ddd',
              background: viewMode === 'day' ? 'var(--brand)' : '#fff',
              color: viewMode === 'day' ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            Day
          </button>
        </div>

        {viewMode === 'day' ? (
          <>
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
            {!loadingDay && dayBookings.length === 0 && <p style={{ color: '#666' }}>No bookings this day.</p>}

            <div className="card-list">
              {dayBookings.map((b) => bookingCard(b))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => changeWeek(-1)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                ← Prev week
              </button>
              <div style={{ fontWeight: 600 }}>{weekLabel}</div>
              <button
                onClick={() => changeWeek(1)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Next week →
              </button>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
              >
                This week
              </button>
            </div>

            {loadingWeek && <p>Loading...</p>}
            {!loadingWeek && weekBookings.length === 0 && <p style={{ color: '#666' }}>No bookings this week.</p>}

            {!loadingWeek && weekDays.map((day) => {
              const dStr = toDateStr(day)
              const isToday = toDateStr(new Date()) === dStr
              const dayBookingsForDay = weekBookings
                .filter((b) => toDateStr(new Date(b.start_time)) === dStr)
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

              if (dayBookingsForDay.length === 0) return null

              return (
                <div key={dStr} style={{ marginBottom: '1.5rem' }}>
                  <div
                    style={{
                      fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem',
                      color: isToday ? 'var(--brand)' : 'inherit',
                    }}
                  >
                    {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {isToday ? ' · Today' : ''}
                  </div>
                  <div className="card-list">
                    {dayBookingsForDay.map((b) => bookingCard(b))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
