'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../../tenant.css'

type Booking = {
  id: string
  customer_name: string
  start_time: string
  end_time: string
  status: string
  amount_paid: number | null
  services: { name: string; price: number } | null
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
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

export default function StaffCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.staffId as string

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [staffName, setStaffName] = useState('')
  const [checking, setChecking] = useState(true)

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

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
    loadMonth(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDate])

  async function loadDay(dateStr: string) {
    setLoadingDay(true)
    const dayStart = new Date(dateStr + 'T00:00:00')
    const dayEnd = new Date(dateStr + 'T23:59:59')

    const { data } = await supabase
      .from('bookings')
      .select('id, customer_name, start_time, end_time, status, amount_paid, services:service_id(name, price)')
      .eq('staff_id', staffId)
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString())
      .order('start_time', { ascending: true })

    const bookings = (data as any) || []
    setDayBookings(bookings)

    const nextAmounts: Record<string, string> = {}
    for (const b of bookings) {
      nextAmounts[b.id] = b.amount_paid != null ? String(b.amount_paid) : ''
    }
    setAmounts(nextAmounts)
    setLoadingDay(false)
  }

  async function loadMonth(dateStr: string) {
    setMonthLoading(true)
    const d = new Date(dateStr + 'T00:00:00')
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const { data } = await supabase
      .from('bookings')
      .select('status, amount_paid, services:service_id(price)')
      .eq('staff_id', staffId)
      .gte('start_time', monthStart.toISOString())
      .lte('start_time', monthEnd.toISOString())

    const rows = (data as any) || []
    let expected = 0
    let actual = 0
    for (const r of rows) {
      if (r.status !== 'confirmed') continue
      expected += r.services?.price || 0
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
    const raw = amounts[bookingId]
    const value = raw === '' ? null : Number(raw)
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      alert('Please enter a valid amount.')
      return
    }

    setSavingId(bookingId)
    const { error } = await supabase
      .from('bookings')
      .update({ amount_paid: value })
      .eq('id', bookingId)
      .eq('staff_id', staffId)

    setSavingId(null)
    if (error) {
      alert(error.message)
      return
    }

    await loadDay(selectedDate)
    await loadMonth(selectedDate)
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
    .reduce((sum, b) => sum + (b.services?.price || 0), 0)
  const dayActual = dayBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.amount_paid != null ? Number(b.amount_paid) : 0), 0)

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

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
          {dayBookings.map((b) => {
            const colors = statusColors(b.status)
            const time = new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={b.id} className="card" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div className="card-title">{time} · {b.customer_name}</div>
                  <div className="card-sub">
                    {b.services?.name} {b.services?.price != null && `· expected ${money(b.services.price)}`}
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
                      placeholder={b.services?.price != null ? String(b.services.price) : '0.00'}
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
          })}
        </div>
      </div>
    </div>
  )
}
