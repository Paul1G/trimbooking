'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ScheduleEditor, { WorkingHours, BreakWindows } from '../ScheduleEditor'
import '../../tenant.css'

type Staff = {
  id: string
  name: string
  role: string
  photo_url: string | null
  bio: string | null
  working_hours: WorkingHours | null
  breaks: BreakWindows | null
  email: string | null
  access_level: string | null
  user_id: string | null
  invited_at: string | null
  auto_confirm_bookings: boolean | null
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
  const [email, setEmail] = useState('')
  const [accessLevel, setAccessLevel] = useState<'user' | 'admin'>('user')
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(false)
  const [error, setError] = useState('')
  const [inviteStatus, setInviteStatus] = useState<Record<string, string>>({})
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerUserId, setOwnerUserId] = useState('')

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
      setOwnerEmail(user.email || '')
      setOwnerUserId(user.id)
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
    setEmail('')
    setAccessLevel('user')
    setAutoConfirmBookings(false)
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
    setEmail(member.email || '')
    setAccessLevel(member.access_level === 'admin' ? 'admin' : 'user')
    setAutoConfirmBookings(!!member.auto_confirm_bookings)
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

    // A portal email matching the owner's own login can never go through the
    // normal invite flow (Supabase only allows one login per email) — but
    // that's fine, because it means this profile IS the owner's own account.
    // There's no separate login to create: the owner already has one, so we
    // link this staff row straight to it (user_id = the owner's own auth id)
    // without any invite email. That's what lets the owner then open their
    // own staff portal (/staff) and see/enter their own earnings there —
    // which is the one place earnings are shown, by design.
    const isSelf = !!(email && ownerEmail && email.trim().toLowerCase() === ownerEmail.trim().toLowerCase())
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
          email: email || null,
          access_level: accessLevel,
          auto_confirm_bookings: autoConfirmBookings,
          user_id: isSelf ? ownerUserId : null,
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }
      staffId = inserted.id
    } else {
      // user_id is only ever set here for the isSelf case (linking straight
      // to the owner's own account) — otherwise it's left out of the update
      // entirely so a real invited staff login isn't silently unlinked every
      // time the profile is saved for an unrelated change.
      const updatePayload: Record<string, unknown> = {
        name,
        role,
        bio: bio || null,
        photo_url: photoUrl || null,
        working_hours: workingHours,
        breaks: breaks,
        email: email || null,
        access_level: accessLevel,
        auto_confirm_bookings: autoConfirmBookings,
      }
      if (isSelf) updatePayload.user_id = ownerUserId

      const { error: updateError } = await supabase
        .from('staff')
        .update(updatePayload)
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

  async function sendInvite(member: Staff) {
    if (!member.email) return
    setInvitingId(member.id)
    setInviteStatus((prev) => ({ ...prev, [member.id]: '' }))

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ staffId: member.id, subdomain: params.subdomain }),
    })
    const result = await res.json().catch(() => ({}))

    if (!res.ok) {
      setInviteStatus((prev) => ({ ...prev, [member.id]: result.error || 'Could not send invite.' }))
      setInvitingId(null)
      return
    }

    setInviteStatus((prev) => ({ ...prev, [member.id]: 'Invite sent!' }))
    setInvitingId(null)
    if (tenantId) await loadStaff(tenantId)
  }

  async function deleteStaff(id: string) {
    if (!tenantId) return
    if (!confirm('Delete this staff member? This removes their access to this dashboard and cannot be undone.')) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    // Goes through the API (rather than deleting the row directly) so that,
    // if this staff member has their own login, that login is revoked too —
    // not just their profile hidden from the dashboard.
    const res = await fetch(`/api/staff/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token || ''}` },
    })

    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      alert(result.error || 'Could not delete this staff member.')
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

  // Rendered inline, in place of whichever staff member is being edited (or
  // appended below the list when adding a new one), rather than always
  // appearing at the bottom of the page — otherwise editing the first staff
  // member in a long list dropped the form somewhere you'd have to scroll to
  // find.
  const editForm = editingId ? (
          <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
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
              <label className="field-label">Portal email (optional)</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
                If set, this person can be sent an invite to log in and see their own
                bookings and earnings.
              </p>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              {email && ownerEmail && email.trim().toLowerCase() === ownerEmail.trim().toLowerCase() && (
                <p style={{ fontSize: '0.82rem', color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '0.6rem 0.75rem', margin: '0.6rem 0 0' }}>
                  This is your own login email, so this profile is you — no invite needed. Saving links it straight
                  to your existing account, and you&apos;ll be able to see and enter your own earnings from your{' '}
                  <strong>staff portal</strong> (open it any time from the button that appears on this card once
                  saved). Only use a different email here if this is genuinely a separate person.
                </p>
              )}
            </div>

            {email && (
              <div className="field-group">
                <label className="field-label">Portal access level</label>
                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="accessLevel"
                      checked={accessLevel === 'user'}
                      onChange={() => setAccessLevel('user')}
                    />
                    User (view only)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="accessLevel"
                      checked={accessLevel === 'admin'}
                      onChange={() => setAccessLevel('admin')}
                    />
                    Admin (can edit own payments &amp; schedule)
                  </label>
                </div>

                {editingId !== 'new' && email.trim().toLowerCase() !== ownerEmail.trim().toLowerCase() && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <button
                      onClick={() => {
                        const member = staffList.find((s) => s.id === editingId)
                        if (member) sendInvite({ ...member, email })
                      }}
                      disabled={invitingId === editingId}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      {invitingId === editingId
                        ? 'Sending...'
                        : staffList.find((s) => s.id === editingId)?.user_id
                        ? 'Resend invite'
                        : 'Send invite'}
                    </button>
                    {inviteStatus[editingId] && (
                      <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#166534' }}>
                        {inviteStatus[editingId]}
                      </span>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                      Save any changes to the email above before sending the invite.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoConfirmBookings}
                  onChange={(e) => setAutoConfirmBookings(e.target.checked)}
                />
                Automatically confirm this person&apos;s bookings
              </label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.4rem 0 0' }}>
                New bookings for them skip the &quot;pending&quot; step and go straight to confirmed —
                useful if you trust their availability enough not to review each request.
              </p>
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
              <label className="field-label">Working hours &amp; breaks</label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
                The days and hours this person is available to book — customers can only book
                within both this and the shop&apos;s opening hours — plus any lunch, meetings or
                other time within those hours that shouldn&apos;t be bookable. Add as many breaks
                as needed per day.
              </p>
              <ScheduleEditor
                hours={workingHours}
                onHoursChange={setWorkingHours}
                breaks={breaks}
                onBreaksChange={setBreaks}
              />
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
  ) : null

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Staff</h1>
        </div>

        <div className="card-list">
          {staffList.map((member) =>
            editingId === member.id ? (
              <div key={member.id}>{editForm}</div>
            ) : (
              <div key={member.id} className="card staff-card" style={{ cursor: 'default' }}>
                <div className="staff-card-info">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="avatar" />
                  ) : (
                    <div className="avatar-fallback">{member.name[0]}</div>
                  )}
                  <div>
                    <div className="card-title">{member.name}</div>
                    <div className="card-sub">
                      {member.role}
                      {member.auto_confirm_bookings ? ' · Auto-confirms bookings' : ''}
                    </div>
                  </div>
                </div>
                <div className="staff-actions">
                  <Link
                    href={`/dashboard/staff/${member.id}`}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', textDecoration: 'none', color: 'inherit', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                  >
                    Calendar
                  </Link>
                  {member.user_id && ownerUserId && member.user_id === ownerUserId && (
                    <Link
                      href="/staff"
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', textDecoration: 'none', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                    >
                      My earnings
                    </Link>
                  )}
                  <button
                    onClick={() => startEdit(member)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteStaff(member.id)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {editingId === 'new' ? (
          <div style={{ marginTop: '1.5rem' }}>{editForm}</div>
        ) : !editingId ? (
          <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={startAdd}>
            + Add staff member
          </button>
        ) : null}
      </div>
    </div>
  )
}
