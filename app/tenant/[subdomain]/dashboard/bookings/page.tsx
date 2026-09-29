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

export default function BookingsPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [checking, setChecking] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'upcoming' | 'all'>('pending')

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
  const visible = bookings.filter((b) => {
    if (filter === 'pending') return b.status === 'pending'
    if (filter === 'upcoming') return new Date(b.start_time) >= now && b.status !== 'declined' && b.status !== 'cancelled'
    return true
  })

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Bookings</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['pending', 'upcoming', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
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

        {visible.length === 0 && <p style={{ color: '#666' }}>No bookings to show.</p>}

        <div className="card-list">
          {visible.map((booking) => (
            <div key={booking.id} className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="card-title">{booking.customer_name}</div>
                  <div className="card-sub">
                    {booking.services?.name} with {booking.staff?.name}
                  </div>
                  <div className="card-sub">
                    {new Date(booking.start_time).toLocaleString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="card-sub">{booking.customer_phone} · {booking.customer_email}</div>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    height: 'fit-content',
                    textTransform: 'capitalize',
                    background:
                      booking.status === 'pending' ? '#fef9c3' :
                      booking.status === 'confirmed' ? '#dcfce7' :
                      booking.status === 'declined' ? '#fee2e2' : '#f3f4f6',
                    color:
                      booking.status === 'pending' ? '#854d0e' :
                      booking.status === 'confirmed' ? '#166534' :
                      booking.status === 'declined' ? '#991b1b' : '#374151',
                  }}
                >
                  {booking.status}
                </div>
              </div>

              {booking.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => updateStatus(booking.id, 'confirmed')}
                    style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatus(booking.id, 'declined')}
                    style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                  >
                    Decline
                  </button>
                </div>
              )}

              {booking.status === 'confirmed' && (
                <div>
                  <button
                    onClick={() => updateStatus(booking.id, 'cancelled')}
                    style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer' }}
                  >
                    Cancel appointment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
