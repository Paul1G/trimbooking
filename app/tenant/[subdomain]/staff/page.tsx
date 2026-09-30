'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WeeklyHoursEditor, { WorkingHours } from '../dashboard/WeeklyHoursEditor'
import BreaksEditor, { BreakWindows } from '../dashboard/BreaksEditor'
import { toDateStr } from '@/lib/availability'
import '../tenant.css'

type MyData = {
  id: string
  name: string
  role: string
  access_level: 'admin' | 'user'
  working_hours: WorkingHours | null
  breaks: BreakWindows | null
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

export default function StaffPortalPage() {
  const router = useRouter()
  const params = useParams()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [checking, setChecking] = useState(true)
  const [me, setMe] = useState<MyData | null>(null)

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [dayError, setDayError] = useState('')

  const [monthExpected, setMonthExpected] = useState(0)
  const [monthActual, setMonthActual] = useState(0)
  const [monthLoading, setMonthLoading] = useState(false)

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [workingHours, setWorkingHours] = useState<WorkingHours>({})
  const [breaks, setBreaks] = useState<BreakWindows>({})
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleStatus, setScheduleStatus] = useState('')

  const [tab, setTab] = useState<'earnings' | 'schedule'>('earnings')

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
        .select('id, brand_color, disabled')
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
      setWorkingHours((myData as MyData).working_hours || {})
      setBreaks((myData as MyData).breaks || {})
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

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

    const { data, error } = await supabase.rpc('staff_get_my_bookings', {
      p_tenant_id: tenantId,
      p_start: dayStart.toISOString(),
      p_end: dayEnd.toISOString(),
    })

    const bookings = (data as Booking[]) || []
    setDayBookings(bookings)
    setDayError(error ? error.message : '')

    const nextAmounts: Record<string, string> = {}
    for (const b of bookings) {
      nextAmounts[b.id] = b.amount_paid != null ? String(b.amount_paid) : ''
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

  async function saveSchedule() {
    if (!tenantId) return
    setScheduleSaving(true)
    setScheduleStatus('')

    const { error } = await supabase.rpc('staff_update_my_schedule', {
      p_tenant_id: tenantId,
      p_working_hours: workingHours,
      p_breaks: breaks,
    })

    setScheduleSaving(false)
    if (error) {
      setScheduleStatus(error.message)
      return
    }
    setScheduleStatus('Saved!')
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
    .reduce((sum, b) => sum + (b.amount_paid != null ? Number(b.amount_paid) : 0), 0)

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
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

        <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0 0' }}>
          <button
            onClick={() => setTab('earnings')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: tab === 'earnings' ? '2px solid var(--brand)' : '1px solid #ddd',
              background: tab === 'earnings' ? 'var(--brand)' : '#fff',
              color: tab === 'earnings' ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            Bookings &amp; earnings
          </button>
          <button
            onClick={() => setTab('schedule')}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: tab === 'schedule' ? '2px solid var(--brand)' : '1px solid #ddd',
              background: tab === 'schedule' ? 'var(--brand)' : '#fff',
              color: tab === 'schedule' ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            My schedule
          </button>
        </div>

        {tab === 'earnings' && (
        <>
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
                      </>
                    ) : (
                      <span style={{ fontSize: '0.9rem' }}>
                        {b.amount_paid != null ? money(Number(b.amount_paid)) : '—'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        </>
        )}

        {tab === 'schedule' && (
        <div className="card" style={{ marginTop: '1.5rem', cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
          <h3 style={{ marginTop: 0 }}>My working hours</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
            {isAdmin
              ? 'The days and hours you are available to book.'
              : 'The days and hours you are available to book. Ask the shop owner to make changes.'}
          </p>
          {isAdmin ? (
            <WeeklyHoursEditor value={workingHours} onChange={setWorkingHours} />
          ) : (
            <ReadOnlyHours value={workingHours} />
          )}

          <h3 style={{ marginTop: '1.5rem' }}>My breaks</h3>
          {isAdmin ? (
            <BreaksEditor value={breaks} onChange={setBreaks} />
          ) : (
            <ReadOnlyBreaks value={breaks} />
          )}

          {isAdmin && (
            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={saveSchedule} disabled={scheduleSaving}>
                {scheduleSaving ? 'Saving...' : 'Save schedule'}
              </button>
              {scheduleStatus && <span style={{ fontSize: '0.85rem', color: '#166534' }}>{scheduleStatus}</span>}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

function ReadOnlyHours({ value }: { value: WorkingHours }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {Object.keys(DAY_LABELS).map((key) => (
        <div key={key} style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem' }}>
          <span style={{ width: 110 }}>{DAY_LABELS[key]}</span>
          <span style={{ color: value[key] ? 'inherit' : '#999' }}>
            {value[key] ? `${value[key][0]} to ${value[key][1]}` : 'Closed'}
          </span>
        </div>
      ))}
    </div>
  )
}

function ReadOnlyBreaks({ value }: { value: BreakWindows }) {
  const days = Object.keys(value).filter((k) => (value[k] || []).length > 0)
  if (days.length === 0) return <p style={{ color: '#999', fontSize: '0.9rem' }}>No breaks set.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {days.map((key) => (
        <div key={key} style={{ fontSize: '0.9rem' }}>
          <strong>{DAY_LABELS[key] || key}:</strong>{' '}
          {(value[key] || []).map((w) => `${w[0]}–${w[1]}`).join(', ')}
        </div>
      ))}
    </div>
  )
}
