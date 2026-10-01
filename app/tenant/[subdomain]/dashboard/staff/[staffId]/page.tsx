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

// This page shows the OWNER a staff member's booking schedule only — who's
// booked in, when, for what, and its status. It deliberately does not show
// or edit expected/actual payment amounts: earnings are only ever visible
// to the staff member themselves, via their own portal
// (staff_get_my_bookings / staff_update_my_payment). Reads here go through
// owner_get_staff_schedule (SECURITY DEFINER, no price/amount columns),
// which checks server-side that the caller owns this tenant.
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
  const [dayError, setDayError] = useState('')

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [weekBookings, setWeekBookings] = useState<Booking[]>([])
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [weekError, setWeekError] = useState('')

  const [selected, setSelected] = useState<Booking | null>(null)

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

  async function loadDay(dateStr: string) {
    if (!tenantId) return
    setLoadingDay(true)
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    const { data, error } = await supabase.rpc('owner_get_staff_schedule', {
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

    const { data, error } = await supabase.rpc('owner_get_staff_schedule', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_range_start: rangeStart.toISOString(),
      p_range_end: rangeEnd.toISOString(),
    })

    setWeekBookings((!error && data) || [])
    setWeekError(error ? error.message : '')
    setLoadingWeek(false)
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

  if (checking) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>Checking access...</p>
        </div>
      </div>
    )
  }

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
      <div key={b.id} onClick={() => setSelected(b)} className="card" style={{ cursor: 'pointer', flexWrap: 'wrap' }}>
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
          <p>Their booking schedule. Earnings are only visible to {staffName} themselves, from their own portal.</p>
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
