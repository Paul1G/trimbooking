'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toDateStr } from '@/lib/availability'
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
        {isOwnerToo && <Link href="/dashboard" className="back-link">← Back to dashboard</Link>}

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
      </div>
    </div>
  )
}
