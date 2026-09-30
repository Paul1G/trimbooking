'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import WeeklyHoursEditor, { WorkingHours } from '../WeeklyHoursEditor'
import BreaksEditor, { BreakWindows } from '../BreaksEditor'
import '../../tenant.css'

type Staff = {
  id: string
  name: string
  role: string
  photo_url: string | null
  bio: string | null
  working_hours: WorkingHours | null
  breaks: BreakWindows | null
}

type Service = {
  id: string
  name: string
}

export default function StaffPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [checking, setChecking] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [workingHours, setWorkingHours] = useState<WorkingHours>({})
  const [breaks, setBreaks] = useState<BreakWindows>({})
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
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
      await loadStaff(tenant.id)

      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .order('name')
      setAllServices(services || [])

      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function loadStaff(tid: string) {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('tenant_id', tid)
      .order('name')
    setStaffList(data || [])
  }

  async function startAdd() {
    setEditingId('new')
    setName('')
    setRole('')
    setBio('')
    setPhotoUrl('')
    setWorkingHours({})
    setBreaks({})
    setSelectedServiceIds([])
    setError('')
  }

  async function startEdit(member: Staff) {
    setEditingId(member.id)
    setName(member.name)
    setRole(member.role || '')
    setBio(member.bio || '')
    setPhotoUrl(member.photo_url || '')
    setWorkingHours(member.working_hours || {})
    setBreaks(member.breaks || {})
    setError('')

    const { data: links } = await supabase
      .from('staff_services')
      .select('service_id')
      .eq('staff_id', member.id)
    setSelectedServiceIds((links || []).map((l) => l.service_id))
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  async function saveStaff() {
    if (!name) {
      setError('Please enter a name.')
      return
    }
    if (!tenantId) return

    let staffId = editingId

    if (editingId === 'new') {
      const { data: inserted, error: insertError } = await supabase
        .from('staff')
        .insert({
          tenant_id: tenantId,
          name,
          role,
          bio: bio || null,
          photo_url: photoUrl || null,
          working_hours: workingHours,
          breaks: breaks,
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }
      staffId = inserted.id
    } else {
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          name,
          role,
          bio: bio || null,
          photo_url: photoUrl || null,
          working_hours: workingHours,
          breaks: breaks,
        })
        .eq('id', editingId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Clear existing service links, then re-add selected ones
      await supabase.from('staff_services').delete().eq('staff_id', editingId)
    }

    if (staffId && selectedServiceIds.length > 0) {
      const rows = selectedServiceIds.map((serviceId) => ({
        staff_id: staffId,
        service_id: serviceId,
      }))
      const { error: linkError } = await supabase.from('staff_services').insert(rows)
      if (linkError) {
        setError(linkError.message)
        return
      }
    }

    setEditingId(null)
    await loadStaff(tenantId)
  }

  async function deleteStaff(id: string) {
    if (!tenantId) return
    if (!confirm('Delete this staff member? This cannot be undone.')) return

    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      alert(deleteError.message)
      return
    }
    await loadStaff(tenantId)
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
          <h1>Staff</h1>
        </div>

        <div className="card-list">
          {staffList.map((member) => (
            <div key={member.id} className="card" style={{ cursor: 'default' }}>
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="avatar" />
              ) : (
                <div className="avatar-fallback">{member.name[0]}</div>
              )}
              <div style={{ flex: 1 }}>
                <div className="card-title">{member.name}</div>
                <div className="card-sub">{member.role}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => startEdit(member)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteStaff(member.id)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingId ? (
          <div className="card" style={{ marginTop: '1.5rem', cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginTop: 0 }}>{editingId === 'new' ? 'Add staff member' : 'Edit staff member'}</h3>

            <div className="field-group">
              <label className="field-label">Name</label>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">Role</label>
              <input className="field-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Stylist" />
            </div>

            <div className="field-group">
              <label className="field-label">Bio (optional)</label>
              <input className="field-input" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="field-group">
              <label className="field-label">Photo URL (optional)</label>
              <input className="field-input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Paste the public URL from Supabase Storage" />
            </div>

            <div className="field-group">
              <label className="field-label">Services offered</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {allServices.map((service) => (
                  <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Working hours</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
                The days and hours this person is available to book. Customers can only book within
                both this and the shop&apos;s opening hours.
              </p>
              <WeeklyHoursEditor value={workingHours} onChange={setWorkingHours} />
            </div>

            <div className="field-group">
              <label className="field-label">Breaks</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
                Block out lunch, meetings, or any other time within their working hours that
                shouldn&apos;t be bookable. Add as many as needed per day.
              </p>
              <BreaksEditor value={breaks} onChange={setBreaks} />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={saveStaff}>Save</button>
              <button
                onClick={cancelEdit}
                style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={startAdd}>
            + Add staff member
          </button>
        )}
      </div>
    </div>
  )
}
