'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toDateStr } from '@/lib/availability'
import CustomerHistoryView from '../../../CustomerHistoryView'
import '../../../tenant.css'

type Booking = {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  start_time: string
  end_time: string
  status: string
  service_name: string | null
  service_price: number | null
  amount_paid: number | null
}

function money(n: number): string {
  return `£${n.toFixed(2)}`
}

function statusColors(status: string) {
  if (status === 'pending') return { bg: '#fef9c3', color: '#854d0e' }
  if (status === 'confirmed') return { bg: '#dcfce7', color: '#166534' }
  if (status === 'declined') return { bg: '#fee2e2', color: '#991b1b' }
  if (status === 'cancelled') return { bg: '#f3f4f6', color: '#6b7280' }
  return { bg: '#f3f4f6', color: '#374151' }
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

// This page shows the OWNER a staff member's booking schedule — who's
// booked in, when, for what, and its status. For a SELF-EMPLOYED member it
// deliberately does NOT show any earnings summary — no today's/month's
// expected vs. actual totals, no running revenue, no per-booking price or
// payment — those stay visible (and editable) only to the staff member
// themselves, from their own portal (staff_get_my_bookings /
// staff_update_my_payment), via owner_get_staff_schedule (no price/amount
// columns at all).
//
// For an EMPLOYED member, it's the other way round: they don't see money in
// their own /staff portal, so the owner sees their full earnings here
// instead — today's/month's expected vs. actual, and the per-booking price
// + amount-paid editor — via owner_get_staff_bookings /
// owner_update_staff_payment, which only ever succeed (checked inside the
// functions themselves, not just by what this page chooses to call) when
// the target staff member is actually marked 'employed'.
export default function StaffCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.staffId as string

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [staffName, setStaffName] = useState('')
  const [isEmployed, setIsEmployed] = useState(false)
  const [checking, setChecking] = useState(true)

  const [monthExpected, setMonthExpected] = useState(0)
  const [monthActual, setMonthActual] = useState(0)
  const [monthLoading, setMonthLoading] = useState(false)

  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [dayError, setDayError] = useState('')

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [weekBookings, setWeekBookings] = useState<Booking[]>([])
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [weekError, setWeekError] = useState('')

  const [selected, setSelected] = useState<Booking | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [savingAmount, setSavingAmount] = useState(false)
  const [amountError, setAmountError] = useState('')

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
        .select('name, tenant_id, employment_status')
        .eq('id', staffId)
        .single()

      if (!staff || staff.tenant_id !== tenant.id) {
        router.push('/dashboard/staff')
        return
      }

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      setStaffName(staff.name)
      setIsEmployed(staff.employment_status === 'employed')
      setChecking(false)
    }
    load()
  }, [params.subdomain, staffId, router])

  useEffect(() => {
    if (!tenantId) return
    loadDay(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate, isEmployed])

  useEffect(() => {
    if (!tenantId) return
    loadWeek(weekStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, weekStart, isEmployed])

  useEffect(() => {
    if (!tenantId || !isEmployed) return
    loadMonth(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate, isEmployed])

  // Employed → owner_get_staff_bookings (amount_paid + service_price
  // included; only succeeds server-side for an employed staff member
  // anyway). Self-employed → owner_get_staff_schedule, which has no
  // price/amount columns at all, same as before this feature existed.
  const scheduleRpc = isEmployed ? 'owner_get_staff_bookings' : 'owner_get_staff_schedule'

  async function loadDay(dateStr: string) {
    if (!tenantId) return
    setLoadingDay(true)
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    const { data, error } = await supabase.rpc(scheduleRpc, {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: dayStart.toISOString(),
      p_range_end: dayEnd.toISOString(),
    })

    setDayBookings((!error && data) || [])
    setDayError(error ? error.message : '')
    setLoadingDay(false)
  }

  async function loadWeek(weekStartDate: Date) {
    if (!tenantId) return
    setLoadingWeek(true)
    const rangeStart = new Date(weekStartDate)
    const rangeEnd = new Date(weekStartDate)
    rangeEnd.setDate(rangeEnd.getDate() + 6)
    rangeEnd.setHours(23, 59, 59, 999)

    const { data, error } = await supabase.rpc(scheduleRpc, {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: rangeStart.toISOString(),
      p_range_end: rangeEnd.toISOString(),
    })

    setWeekBookings((!error && data) || [])
    setWeekError(error ? error.message : '')
    setLoadingWeek(false)
  }

  async function loadMonth(dateStr: string) {
    if (!tenantId) return
    setMonthLoading(true)
    const d = new Date(dateStr + 'T00:00:00')
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const { data } = await supabase.rpc('owner_get_staff_bookings', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: monthStart.toISOString(),
      p_range_end: monthEnd.toISOString(),
    })

    const rows = (data as Booking[]) || []
    let expected = 0
    let actual = 0
    for (const r of rows) {
      if (r.status !== 'confirmed') continue
      expected += r.service_price || 0
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

  function changeWeek(offset: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + offset * 7)
    setWeekStart(d)
  }

  function selectBooking(b: Booking) {
    setSelected(b)
    setAmountInput(b.amount_paid != null ? String(b.amount_paid) : '')
    setAmountError('')
  }

  async function saveAmount() {
    if (!tenantId || !selected) return
    const raw = amountInput.trim()
    const value = raw === '' ? null : Number(raw)
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setAmountError('Please enter a valid amount.')
      return
    }

    setSavingAmount(true)
    setAmountError('')
    const { error } = await supabase.rpc('owner_update_staff_payment', {
      p_tenant_id: tenantId,
      p_booking_id: selected.id,
      p_amount: value,
    })
    setSavingAmount(false)

    if (error) {
      setAmountError(error.message)
      return
    }

    const updated = { ...selected, amount_paid: value }
    setSelected(updated)
    setDayBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    setWeekBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
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
    .reduce((sum, b) => sum + (b.amount_paid != null ? Number(b.amount_paid) : (b.service_price || 0)), 0)

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
      <div key={b.id} onClick={() => selectBooking(b)} className="card" style={{ cursor: 'pointer', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div className="card-title">{time} · {b.customer_name}</div>
          <div className="card-sub">{b.service_name}</div>
        </div>
        <span
          style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
            textTransform: 'capitalize', background: colors.bg, color: colors.color,
          }}
        >
          {b.status}
        </span>
      </div>
    )
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard/staff" className="back-link">← Back to staff</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>{staffName}&apos;s calendar</h1>
          {isEmployed ? (
            <p>
              {staffName} is marked employed, so their earnings are shown here instead of in their own
              portal. Click an appointment to see or record what was paid.
            </p>
          ) : (
            <p>Their booking schedule. Click an appointment to see its price and record what was paid — running totals and earnings stay in {staffName}&apos;s own portal.</p>
          )}
        </div>

        {isEmployed && (
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
        )}

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
            {dayError && (
              <p style={{ color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem' }}>
                Couldn&apos;t load this day: {dayError}
              </p>
            )}
            {!loadingDay && !dayError && dayBookings.length === 0 && <p style={{ color: '#666' }}>No bookings this day.</p>}

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
            {weekError && (
              <p style={{ color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem' }}>
                Couldn&apos;t load this week: {weekError}
              </p>
            )}
            {!loadingWeek && !weekError && weekBookings.length === 0 && <p style={{ color: '#666' }}>No bookings this week.</p>}

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

        {selected && (
          <div
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', width: 340, maxWidth: '90vw' }}
            >
              <h3 style={{ marginTop: 0 }}>{selected.customer_name}</h3>
              <p className="card-sub" style={{ marginTop: 0 }}>{selected.service_name}</p>
              <p className="card-sub">
                {new Date(selected.start_time).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
              {selected.customer_phone && <p className="card-sub">{selected.customer_phone}</p>}
              {selected.customer_email && <p className="card-sub">{selected.customer_email}</p>}

              <div
                style={{
                  display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  textTransform: 'capitalize', margin: '0.5rem 0 0',
                  background: statusColors(selected.status).bg,
                  color: statusColors(selected.status).color,
                }}
              >
                {selected.status}
              </div>

              {isEmployed && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                  {selected.service_price != null && (
                    <p className="card-sub" style={{ margin: '0 0 0.5rem' }}>
                      Treatment cost: <strong>{money(selected.service_price)}</strong>
                    </p>
                  )}
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: '0.3rem' }}>
                    Amount paid
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>£</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      style={{ width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                    />
                    <button
                      onClick={saveAmount}
                      disabled={savingAmount}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {savingAmount ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {amountError && (
                    <p style={{ color: '#991b1b', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{amountError}</p>
                  )}
                </div>
              )}

              <CustomerHistoryView
                tenantId={tenantId}
                customerEmail={selected.customer_email}
                excludeBookingId={selected.id}
              />

              <div style={{ marginTop: '1.25rem' }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
