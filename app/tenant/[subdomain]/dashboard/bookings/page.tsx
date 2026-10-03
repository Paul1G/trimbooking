'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveShopRole } from '@/lib/shopAccess'
import Link from 'next/link'
import CustomerHistoryView from '../../CustomerHistoryView'
import '../../tenant.css'

type Booking = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  start_time: string
  end_time: string
  status: string
  manage_token: string | null
  amount_paid: number | null
  staff_id: string | null
  staff: { name: string } | null
  services: { name: string; price: number | null } | null
}

type StaffMember = { id: string; name: string }

function money(n: number): string {
  return `£${n.toFixed(2)}`
}

const DAY_START_HOUR = 8
const DAY_END_HOUR = 20
const PX_PER_HOUR = 60

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function statusColors(status: string) {
  if (status === 'pending') return { bg: '#fef9c3', border: '#eab308', text: '#854d0e' }
  if (status === 'confirmed') return { bg: '#dcfce7', border: '#16a34a', text: '#166534' }
  if (status === 'declined') return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }
  return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
}

export default function BookingsPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState('')
  const [brandColor, setBrandColor] = useState('#000000')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [checking, setChecking] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'upcoming' | 'all'>('pending')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
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

      const role = tenant ? await resolveShopRole(supabase, tenant, user.id) : null
      if (!tenant || !role) {
        router.push('/login')
        return
      }

      setTenantId(tenant.id)
      setTenantName(tenant.name)
      setBrandColor(tenant.brand_color)

      const { data: staffRows } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .order('name', { ascending: true })
      setStaffList((staffRows as StaffMember[]) || [])

      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  // Loading every booking the shop has ever had in one go breaks down for a
  // busy (or long-running) shop — an unbounded select silently gets capped
  // by Supabase's default row limit, ordered by start_time, so once a shop
  // passes that many bookings the newest ones (today's week, "upcoming")
  // never arrive even though the fetch itself succeeds. Instead, scope the
  // query to only what the current view actually needs: the visible week
  // for the calendar, or a sensible window for each list filter.
  useEffect(() => {
    if (!tenantId) return
    loadBookings(tenantId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, view, weekStart, filter])

  async function loadBookings(tid: string) {
    let query = supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, customer_email, start_time, end_time, status, manage_token, amount_paid, staff_id, staff:staff_id(name), services:service_id(name, price)')
      .eq('tenant_id', tid)

    if (view === 'calendar') {
      const rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + 7)
      query = query.gte('start_time', weekStart.toISOString()).lt('start_time', rangeEnd.toISOString())
    } else if (filter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (filter === 'upcoming') {
      query = query.gte('start_time', new Date().toISOString())
    }
    // filter === 'all' in list view is intentionally left unbounded by date,
    // but still capped below so it degrades gracefully instead of silently
    // dropping recent bookings off the end.

    const { data, error } = await query.order('start_time', { ascending: true }).limit(2000)
    if (error) {
      console.error('Could not load bookings:', error.message)
    }
    setBookings((data as any) || [])
  }

  async function updateStatus(id: string, status: string) {
    if (!tenantId) return
    const booking = bookings.find((b) => b.id === id)

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      alert(error.message)
      return
    }

    if (booking && (status === 'confirmed' || status === 'declined' || status === 'cancelled')) {
      const manageUrl = booking.manage_token
        ? `https://${params.subdomain}.trimbooking.co.uk/manage/${booking.manage_token}`
        : undefined

      fetch('/api/send-booking-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: status,
          tenantName,
          customerEmail: booking.customer_email,
          customerName: booking.customer_name,
          serviceName: booking.services?.name,
          staffName: booking.staff?.name,
          startTime: booking.start_time,
          manageUrl,
        }),
      }).catch(() => {})
    }

    setSelected(null)
    await loadBookings(tenantId)
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
    const { error } = await supabase
      .from('bookings')
      .update({ amount_paid: value })
      .eq('id', selected.id)
      .eq('tenant_id', tenantId)
    setSavingAmount(false)

    if (error) {
      setAmountError(error.message)
      return
    }

    const updated = { ...selected, amount_paid: value }
    setSelected(updated)
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
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

  const now = new Date()
  const staffScoped = bookings.filter((b) => staffFilter === 'all' || b.staff_id === staffFilter)
  const listVisible = staffScoped.filter((b) => {
    if (filter === 'pending') return b.status === 'pending'
    if (filter === 'upcoming') return new Date(b.start_time) >= now && b.status !== 'declined' && b.status !== 'cancelled'
    return true
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i)

  function bookingsForDay(day: Date) {
    return staffScoped.filter((b) => {
      const bd = new Date(b.start_time)
      return (
        bd.getFullYear() === day.getFullYear() &&
        bd.getMonth() === day.getMonth() &&
        bd.getDate() === day.getDate() &&
        b.status !== 'declined' &&
        b.status !== 'cancelled'
      )
    })
  }

  function bookingStyle(b: Booking) {
    const start = new Date(b.start_time)
    const end = new Date(b.end_time)
    const startMins = (start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes()
    const endMins = (end.getHours() - DAY_START_HOUR) * 60 + end.getMinutes()
    const top = (startMins / 60) * PX_PER_HOUR
    const height = Math.max(((endMins - startMins) / 60) * PX_PER_HOUR, 24)
    return { top, height }
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container" style={{ maxWidth: view === 'calendar' ? 960 : 720 }}>
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, color: 'var(--brand)' }}>Bookings</h1>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setView('calendar')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: view === 'calendar' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: view === 'calendar' ? 'var(--brand)' : '#fff',
                color: view === 'calendar' ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: view === 'list' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: view === 'list' ? 'var(--brand)' : '#fff',
                color: view === 'list' ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              List
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            onClick={() => setStaffFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: staffFilter === 'all' ? '2px solid var(--brand)' : '1px solid #ddd',
              background: staffFilter === 'all' ? 'var(--brand)' : '#fff',
              color: staffFilter === 'all' ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            All staff
          </button>
          {staffList.map((s) => (
            <button
              key={s.id}
              onClick={() => setStaffFilter(s.id)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: staffFilter === s.id ? '2px solid var(--brand)' : '1px solid #ddd',
                background: staffFilter === s.id ? 'var(--brand)' : '#fff',
                color: staffFilter === s.id ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {view === 'calendar' ? (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                ← Prev
              </button>
              <div style={{ fontWeight: 600 }}>
                {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <button
                onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Next →
              </button>
            </div>

            <div style={{ display: 'flex', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <div style={{ width: 50, flexShrink: 0, borderRight: '1px solid #eee' }}>
                <div style={{ height: 36, borderBottom: '1px solid #eee' }} />
                {hours.map((h) => (
                  <div key={h} style={{ height: PX_PER_HOUR, fontSize: '0.7rem', color: '#999', textAlign: 'right', paddingRight: 6, borderBottom: '1px solid #f3f3f3', boxSizing: 'border-box' }}>
                    {h}:00
                  </div>
                ))}
              </div>

              {days.map((day, i) => {
                const isToday = day.toDateString() === now.toDateString()
                return (
                  <div key={i} style={{ flex: 1, position: 'relative', borderRight: i < 6 ? '1px solid #eee' : 'none', minWidth: 90 }}>
                    <div
                      style={{
                        height: 36,
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: isToday ? '#f8f4ff' : '#fafafa',
                        color: isToday ? 'var(--brand)' : '#666',
                      }}
                    >
                      <span>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 400 }}>{day.getDate()}</span>
                    </div>
                    <div style={{ position: 'relative', height: hours.length * PX_PER_HOUR }}>
                      {hours.map((h) => (
                        <div key={h} style={{ height: PX_PER_HOUR, borderBottom: '1px solid #f3f3f3', boxSizing: 'border-box' }} />
                      ))}
                      {bookingsForDay(day).map((b) => {
                        const { top, height } = bookingStyle(b)
                        const colors = statusColors(b.status)
                        return (
                          <div
                            key={b.id}
                            onClick={() => selectBooking(b)}
                            title={`${b.customer_name} — ${b.services?.name}`}
                            style={{
                              position: 'absolute',
                              top,
                              height,
                              left: 3,
                              right: 3,
                              background: colors.bg,
                              borderLeft: `3px solid ${colors.border}`,
                              borderRadius: 4,
                              padding: '2px 5px',
                              fontSize: '0.68rem',
                              color: colors.text,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              lineHeight: 1.2,
                            }}
                          >
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {b.customer_name}
                            </div>
                            <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {b.services?.name}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {(['pending', 'upcoming', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: filter === f ? '2px solid var(--brand)' : '1px solid #ddd',
                    background: filter === f ? 'var(--brand)' : '#fff',
                    color: filter === f ? '#fff' : '#000',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {listVisible.length === 0 && <p style={{ color: '#666' }}>No bookings to show.</p>}

            <div className="card-list">
              {listVisible.map((booking) => (
                <div key={booking.id} onClick={() => selectBooking(booking)} className="card">
                  <div>
                    <div className="card-title">{booking.customer_name}</div>
                    <div className="card-sub">{booking.services?.name} with {booking.staff?.name}</div>
                    <div className="card-sub">
                      {new Date(booking.start_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                      textTransform: 'capitalize',
                      background: statusColors(booking.status).bg,
                      color: statusColors(booking.status).text,
                    }}
                  >
                    {booking.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <p className="card-sub" style={{ marginTop: 0 }}>{selected.services?.name} with {selected.staff?.name}</p>
              <p className="card-sub">
                {new Date(selected.start_time).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="card-sub">{selected.customer_phone}</p>
              <p className="card-sub">{selected.customer_email}</p>

              <div
                style={{
                  display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  textTransform: 'capitalize', margin: '0.5rem 0 1rem',
                  background: statusColors(selected.status).bg,
                  color: statusColors(selected.status).text,
                }}
              >
                {selected.status}
              </div>

              <div style={{ paddingTop: '0.25rem', borderTop: '1px solid #eee' }}>
                {selected.services?.price != null && (
                  <p className="card-sub" style={{ margin: '0.75rem 0 0.5rem' }}>
                    Treatment cost: <strong>{money(selected.services.price)}</strong>
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

              <CustomerHistoryView
                tenantId={tenantId}
                customerEmail={selected.customer_email}
                excludeBookingId={selected.id}
              />

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                {selected.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(selected.id, 'confirmed')}
                      style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, 'declined')}
                      style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                    >
                      Decline
                    </button>
                  </>
                )}
                {selected.status === 'confirmed' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'cancelled')}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer' }}
                  >
                    Cancel appointment
                  </button>
                )}
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
