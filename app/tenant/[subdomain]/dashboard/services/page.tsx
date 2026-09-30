'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../tenant.css'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
}

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
    setError('')
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setName(service.name)
    setDuration(String(service.duration_minutes))
    setPrice(String(service.price))
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  async function saveService() {
    if (!name || !duration || !price) {
      setError('Please fill in all fields.')
      return
    }
    if (!tenantId) return

    if (editingId === 'new') {
      const { error: insertError } = await supabase.from('services').insert({
        tenant_id: tenantId,
        name,
        duration_minutes: Number(duration),
        price: Number(price),
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
          duration_minutes: Number(duration),
          price: Number(price),
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
                  <div className="card-title">{service.name}</div>
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
