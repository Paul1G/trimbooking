'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../tenant.css'

type Holiday = {
  id: string
  staff_id: string | null
  start_date: string
  end_date: string
  reason: string | null
}

type Staff = {
  id: string
  name: string
}

export default function HolidaysPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [checking, setChecking] = useState(true)

  const [adding, setAdding] = useState(false)
  const [staffId, setStaffId] = useState<string>('') // '' = whole shop
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

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

      const { data: staff } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .order('name')
      setStaffList(staff || [])

      await loadHolidays(tenant.id)
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function loadHolidays(tid: string) {
    const { data } = await supabase
      .from('staff_holidays')
      .select('*')
      .eq('tenant_id', tid)
      .order('start_date', { ascending: false })
    setHolidays(data || [])
  }

  function staffName(id: string | null) {
    if (!id) return 'Whole shop'
    return staffList.find((s) => s.id === id)?.name || 'Unknown'
  }

  async function addHoliday() {
    if (!startDate || !endDate) {
      setError('Please choose a start and end date.')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }
    if (!tenantId) return

    const { error: insertError } = await supabase.from('staff_holidays').insert({
      tenant_id: tenantId,
      staff_id: staffId || null,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setAdding(false)
    setStaffId('')
    setStartDate('')
    setEndDate('')
    setReason('')
    setError('')
    await loadHolidays(tenantId)
  }

  async function deleteHoliday(id: string) {
    if (!tenantId) return
    if (!confirm('Remove this closure?')) return

    const { error: deleteError } = await supabase
      .from('staff_holidays')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      alert(deleteError.message)
      return
    }
    await loadHolidays(tenantId)
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

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Holidays &amp; Closures</h1>
          <p>Block out staff holidays, sick days, or shop-wide closures like bank holidays.</p>
        </div>

        <div className="card-list">
          {holidays.map((h) => (
            <div key={h.id} className="card" style={{ cursor: 'default' }}>
              <div>
                <div className="card-title">{staffName(h.staff_id)}</div>
                <div className="card-sub">
                  {new Date(h.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {h.start_date !== h.end_date && (
                    <> – {new Date(h.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </div>
                {h.reason && <div className="card-sub">{h.reason}</div>}
              </div>
              <button
                onClick={() => deleteHoliday(h.id)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          ))}
          {holidays.length === 0 && <p style={{ color: '#666' }}>No holidays or closures added yet.</p>}
        </div>

        {adding ? (
          <div className="card" style={{ marginTop: '1.5rem', cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginTop: 0 }}>Add closure</h3>

            <div className="field-group">
              <label className="field-label">Who</label>
              <select className="field-input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Whole shop</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Start date</label>
              <input className="field-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">End date</label>
              <input className="field-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">Reason (optional)</label>
              <input className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Christmas, Annual leave" />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={addHoliday}>Save</button>
              <button
                onClick={() => { setAdding(false); setError('') }}
                style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setAdding(true)}>
            + Add closure
          </button>
        )}
      </div>
    </div>
  )
}
