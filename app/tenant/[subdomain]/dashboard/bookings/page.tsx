'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../tenant.css'

type Booking = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  start_time: string
  end_time: string
  status: string
  staff: { name: string } | null
  services: { name: string } | null
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
  const [brandColor, setBrandColor] = useState('#000000')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [checking, setChecking] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'upcoming' | 'all'>('pending')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
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

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      await loadBookings(tenant.id)
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function loadBookings(tid: string) {
    const { data } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, customer_email, start_time, end_time, status, staff:staff_id(name), services:service_id(name)')
      .eq('tenant_id', tid)
      .order('start_time', { ascending: true })
    setBookings((data as any) || [])
  }

  async function updateStatus(id: string, status: string) {
    if (!tenantId) return
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      alert(error.message)
      return
    }
    setSelected(null)
    await loadBookings(tenantId)
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
  const listVisible = bookings.filter((b) => {
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
    return bookings.filter((b) => {
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
                            onClick={() => setSelected(b)}
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
                <div key={booking.id} onClick={() => setSelected(booking)} className="card">
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

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
