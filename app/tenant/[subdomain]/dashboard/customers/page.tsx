'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveShopRole } from '@/lib/shopAccess'
import Link from 'next/link'
import { computeRebookInfo, formatIntervalDays, isDueToRebook, type PastVisit } from '@/lib/rebooking'
import '../../tenant.css'

type BookingRow = {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  start_time: string
  status: string
  services: { name: string } | null
  staff: { name: string } | null
}

type Customer = {
  key: string
  name: string
  email: string
  phone: string | null
  bookings: BookingRow[]
}

export default function CustomersPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'due'>('all')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

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
      setBrandColor(tenant.brand_color)
      await loadBookings(tenant.id)
      setChecking(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.subdomain, router])

  async function loadBookings(tid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_email, customer_phone, start_time, status, services:service_id(name), staff:staff_id(name)')
      .eq('tenant_id', tid)
      .order('start_time', { ascending: true })
    setBookings((data as any) || [])
    setLoading(false)
  }

  const customers = useMemo(() => {
    const map = new Map<string, Customer>()
    for (const b of bookings) {
      if (!b.customer_email) continue
      const key = b.customer_email.toLowerCase().trim()
      const existing = map.get(key)
      if (existing) {
        existing.bookings.push(b)
        // Keep the most recently used name/phone for this customer.
        existing.name = b.customer_name || existing.name
        existing.phone = b.customer_phone || existing.phone
      } else {
        map.set(key, {
          key,
          name: b.customer_name,
          email: b.customer_email,
          phone: b.customer_phone,
          bookings: [b],
        })
      }
    }
    return Array.from(map.values())
  }, [bookings])

  const now = new Date()

  const rows = useMemo(() => {
    return customers.map((c) => {
      const pastConfirmed: PastVisit[] = c.bookings
        .filter((b) => b.status === 'confirmed' && new Date(b.start_time) < now)
        .map((b) => ({ id: b.id, start_time: b.start_time }))
      const info = computeRebookInfo(pastConfirmed)
      const upcoming = c.bookings.some(
        (b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.start_time) > now
      )
      const due = !upcoming && isDueToRebook(info, now)
      return { customer: c, info, due, upcoming }
    })
  }, [customers, now])

  const visible = rows
    .filter((r) => {
      if (filter === 'due' && !r.due) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return r.customer.name.toLowerCase().includes(q) || r.customer.email.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1
      const aLast = a.info.lastVisit ? new Date(a.info.lastVisit).getTime() : 0
      const bLast = b.info.lastVisit ? new Date(b.info.lastVisit).getTime() : 0
      return bLast - aLast
    })

  const dueCount = rows.filter((r) => r.due).length

  if (checking) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Customers</h1>
          <p>
            Visit history for every customer, and who looks overdue to rebook based on how often they usually come in.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', flex: '1 1 220px', fontSize: '0.9rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: filter === 'all' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: filter === 'all' ? 'var(--brand)' : '#fff',
                color: filter === 'all' ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setFilter('due')}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: filter === 'due' ? '2px solid var(--brand)' : '1px solid #ddd',
                background: filter === 'due' ? 'var(--brand)' : '#fff',
                color: filter === 'due' ? '#fff' : '#000',
                cursor: 'pointer',
              }}
            >
              Due to rebook ({dueCount})
            </button>
          </div>
        </div>

        {loading && <p>Loading...</p>}
        {!loading && visible.length === 0 && <p style={{ color: '#666' }}>No customers to show.</p>}

        <div className="card-list">
          {visible.map(({ customer, info, due }) => {
            const isExpanded = expandedKey === customer.key
            const history = [...customer.bookings].sort(
              (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            )

            if (isExpanded) {
              return (
                <div key={customer.key} className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div className="card-title">{customer.name}</div>
                      <div className="card-sub">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</div>
                    </div>
                    <button
                      onClick={() => setExpandedKey(null)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Collapse
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#555' }}>
                    <div><strong>{info.visitCount}</strong> visit{info.visitCount === 1 ? '' : 's'}</div>
                    {info.lastVisit && (
                      <div>Last visit: <strong>{new Date(info.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                    )}
                    {info.avgIntervalDays != null && (
                      <div>Usually every: <strong>{formatIntervalDays(info.avgIntervalDays)}</strong></div>
                    )}
                    {due && (
                      <div style={{ color: '#166534', fontWeight: 700 }}>Due to rebook</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {history.map((b) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0', borderTop: '1px solid #eee', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <div>
                          {new Date(b.start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}{b.services?.name || 'Service'}{b.staff?.name ? ` with ${b.staff.name}` : ''}
                        </div>
                        <div style={{ textTransform: 'capitalize', color: '#666' }}>{b.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={customer.key}
                className="card"
                onClick={() => setExpandedKey(customer.key)}
                style={{ flexWrap: 'wrap' }}
              >
                <div style={{ flex: '1 1 220px' }}>
                  <div className="card-title">{customer.name}</div>
                  <div className="card-sub">{customer.email}</div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555', textAlign: 'right', flex: '1 1 200px' }}>
                  <div>{info.visitCount} visit{info.visitCount === 1 ? '' : 's'}</div>
                  {info.lastVisit && (
                    <div style={{ color: '#888' }}>
                      Last: {new Date(info.lastVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
                {due ? (
                  <span
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                      background: '#dcfce7', color: '#166534', whiteSpace: 'nowrap',
                    }}
                  >
                    Due to rebook
                  </span>
                ) : info.avgIntervalDays != null ? (
                  <span style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap' }}>
                    every {formatIntervalDays(info.avgIntervalDays)}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
