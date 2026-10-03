'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveShopRole } from '@/lib/shopAccess'
import Link from 'next/link'
import '../../tenant.css'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
  no_show_fee: number | null
  allow_parallel: boolean
  contact_windows: [number, number][] | null
}

type WindowDraft = { start: string; end: string }

export default function ServicesPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [services, setServices] = useState<Service[]>([])
  const [checking, setChecking] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [noShowFee, setNoShowFee] = useState('')
  const [noShowFeeMode, setNoShowFeeMode] = useState<string | null>(null)
  const [allowParallel, setAllowParallel] = useState(false)
  const [contactWindows, setContactWindows] = useState<WindowDraft[]>([])
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

      const role = tenant ? await resolveShopRole(supabase, tenant, user.id) : null
      if (!tenant || !role) {
        router.push('/login')
        return
      }

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      setNoShowFeeMode(tenant.no_show_fee_mode || null)
      await loadServices(tenant.id)
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function loadServices(tid: string) {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tid)
      .order('price')
    setServices(data || [])
  }

  function startAdd() {
    setEditingId('new')
    setName('')
    setDuration('')
    setPrice('')
    setNoShowFee('')
    setAllowParallel(false)
    setContactWindows([])
    setError('')
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setName(service.name)
    setDuration(String(service.duration_minutes))
    setPrice(String(service.price))
    setNoShowFee(service.no_show_fee != null ? String(service.no_show_fee) : '')
    setAllowParallel(!!service.allow_parallel)
    setContactWindows(
      (service.contact_windows || []).map(([start, end]) => ({ start: String(start), end: String(end) }))
    )
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  function addContactWindow() {
    setContactWindows((w) => [...w, { start: '', end: '' }])
  }

  function updateContactWindow(index: number, field: 'start' | 'end', value: string) {
    setContactWindows((w) => w.map((win, i) => (i === index ? { ...win, [field]: value } : win)))
  }

  function removeContactWindow(index: number) {
    setContactWindows((w) => w.filter((_, i) => i !== index))
  }

  // Parses the draft windows, validating them against the service's own
  // duration, and sorts them so the overlap check below only has to compare
  // neighbours. Returns null (with setError already called) when invalid.
  function parseContactWindows(durationMinutes: number): [number, number][] | null {
    if (contactWindows.some(({ start, end }) => start === '' || end === '')) {
      setError('Please fill in every contact window, or remove the empty ones.')
      return null
    }

    const parsed = contactWindows.map(({ start, end }) => [Number(start), Number(end)] as [number, number])

    if (parsed.some(([start, end]) => isNaN(start) || isNaN(end))) {
      setError('Contact window minutes must be numbers.')
      return null
    }
    if (parsed.some(([start, end]) => start < 0 || end > durationMinutes || start >= end)) {
      setError(`Contact windows must fall within 0–${durationMinutes} minutes, with the end after the start.`)
      return null
    }

    const sorted = [...parsed].sort((a, b) => a[0] - b[0])
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][0] < sorted[i - 1][1]) {
        setError('Contact windows can\'t overlap each other.')
        return null
      }
    }

    return sorted
  }

  async function saveService() {
    if (!name || !duration || !price) {
      setError('Please fill in all fields.')
      return
    }
    if (!tenantId) return

    const noShowFeeValue = noShowFee === '' ? null : Number(noShowFee)
    const durationValue = Number(duration)

    let contactWindowsValue: [number, number][] | null = null
    if (allowParallel) {
      if (contactWindows.length === 0) {
        setError('Add at least one contact window, or turn off parallel treatment.')
        return
      }
      const parsed = parseContactWindows(durationValue)
      if (!parsed) return
      contactWindowsValue = parsed
    }

    setError('')

    if (editingId === 'new') {
      const { error: insertError } = await supabase.from('services').insert({
        tenant_id: tenantId,
        name,
        duration_minutes: durationValue,
        price: Number(price),
        no_show_fee: noShowFeeValue,
        allow_parallel: allowParallel,
        contact_windows: contactWindowsValue,
      })
      if (insertError) {
        setError(insertError.message)
        return
      }
    } else {
      const { error: updateError } = await supabase
        .from('services')
        .update({
          name,
          duration_minutes: durationValue,
          price: Number(price),
          no_show_fee: noShowFeeValue,
          allow_parallel: allowParallel,
          contact_windows: contactWindowsValue,
        })
        .eq('id', editingId)
        .eq('tenant_id', tenantId)
      if (updateError) {
        setError(updateError.message)
        return
      }
    }

    setEditingId(null)
    await loadServices(tenantId)
  }

  async function deleteService(id: string) {
    if (!tenantId) return
    if (!confirm('Delete this service? This cannot be undone.')) return

    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      alert(deleteError.message)
      return
    }
    await loadServices(tenantId)
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

  // Shared between the add and edit forms — a service that doesn't need the
  // staff member's constant attention (colour processing, a perm, etc.) can
  // have its non-contact time opened up for another booking with the same
  // staff member.
  function renderParallelFields() {
    return (
      <>
        <div className="field-group">
          <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allowParallel}
              onChange={(e) => setAllowParallel(e.target.checked)}
            />
            Allow parallel treatment
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            For a service that runs a long time but doesn&apos;t need constant attention — the non-contact
            time is opened up so this staff member can take another booking in it.
          </p>
        </div>

        {allowParallel && (
          <div className="field-group">
            <label className="field-label">Contact windows (minutes into the appointment)</label>
            {contactWindows.map((win, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  className="field-input"
                  type="number"
                  placeholder="Start"
                  value={win.start}
                  onChange={(e) => updateContactWindow(i, 'start', e.target.value)}
                  style={{ maxWidth: 100 }}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  className="field-input"
                  type="number"
                  placeholder="End"
                  value={win.end}
                  onChange={(e) => updateContactWindow(i, 'end', e.target.value)}
                  style={{ maxWidth: 100 }}
                />
                <span style={{ color: 'var(--text-muted)' }}>min</span>
                <button
                  type="button"
                  onClick={() => removeContactWindow(i)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addContactWindow}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
            >
              + Add contact window
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              e.g. a 180-minute colour service needing 45 minutes at the start and 20 at the end is two
              windows: 0 to 45, and 160 to 180.
            </p>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Services</h1>
        </div>

        <div className="card-list">
          {services.map((service) =>
            editingId === service.id ? (
              <div
                key={service.id}
                className="card"
                style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <h3 style={{ marginTop: 0 }}>Edit service</h3>

                <div className="field-group">
                  <label className="field-label">Name</label>
                  <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="field-group">
                  <label className="field-label">Duration (minutes)</label>
                  <input className="field-input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>

                <div className="field-group">
                  <label className="field-label">Price (£)</label>
                  <input className="field-input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>

                {noShowFeeMode === 'per_service' && (
                  <div className="field-group">
                    <label className="field-label">No-show fee (£, optional)</label>
                    <input className="field-input" type="number" step="0.01" min={0} value={noShowFee} onChange={(e) => setNoShowFee(e.target.value)} />
                  </div>
                )}

                {renderParallelFields()}

                {error && <p className="error-text">{error}</p>}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" onClick={saveService}>Save</button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={service.id} className="card" style={{ cursor: 'default' }}>
                <div>
                  <div className="card-title">
                    {service.name}
                    {service.allow_parallel && (
                      <span
                        style={{
                          marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                          borderRadius: 999, background: '#ede9fe', color: '#6d28d9', verticalAlign: 'middle',
                        }}
                      >
                        Parallel
                      </span>
                    )}
                  </div>
                  <div className="card-sub">{service.duration_minutes} min · £{service.price}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => startEdit(service)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {editingId === 'new' ? (
          <div className="card" style={{ marginTop: '1.5rem', cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginTop: 0 }}>Add service</h3>

            <div className="field-group">
              <label className="field-label">Name</label>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">Duration (minutes)</label>
              <input className="field-input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">Price (£)</label>
              <input className="field-input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            {noShowFeeMode === 'per_service' && (
              <div className="field-group">
                <label className="field-label">No-show fee (£, optional)</label>
                <input className="field-input" type="number" step="0.01" min={0} value={noShowFee} onChange={(e) => setNoShowFee(e.target.value)} />
              </div>
            )}

            {renderParallelFields()}

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={saveService}>Save</button>
              <button
                onClick={cancelEdit}
                style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : !editingId ? (
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={startAdd}>
            + Add service
          </button>
        ) : null}
      </div>
    </div>
  )
}
