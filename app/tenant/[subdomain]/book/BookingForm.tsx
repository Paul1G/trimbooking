'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AvailabilityPicker, { WorkingHours, BreakWindows } from '../AvailabilityPicker'

type Staff = {
  id: string
  name: string
  role: string
  working_hours: WorkingHours
  breaks?: BreakWindows | null
}
type Service = { id: string; name: string; duration_minutes: number; price: number }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(?:(?:\+44|0)(?:7\d{9}|1\d{9}|2\d{9}|3\d{9}))$/.test(cleaned)
}

function randomToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function formatDateTime(dateStr: string, slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Step = 'details' | 'review' | 'done'

export default function BookingForm({
  tenantId,
  tenantName,
  subdomain,
  service,
  staffList,
  shopOpeningHours,
}: {
  tenantId: string
  tenantName: string
  subdomain: string
  service: Service
  staffList: Staff[]
  shopOpeningHours: WorkingHours
}) {
  const [step, setStep] = useState<Step>('details')
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '')
  const [selection, setSelection] = useState<{ date: string; slot: string } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmedManageUrl, setConfirmedManageUrl] = useState('')
  const [error, setError] = useState('')

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  function handleReview() {
    if (!selection || !name || !phone || !email) {
      setError('Please fill in your name, phone number, and email.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isValidUKPhone(phone)) {
      setError('Please enter a valid UK phone number, e.g. 07123 456789 or 0131 281 1942.')
      return
    }
    setError('')
    setStep('review')
  }

  async function handleFinalConfirm() {
    if (!selection) return
    setSubmitting(true)
    setError('')

    const [h, m] = selection.slot.split(':').map(Number)
    const startTime = new Date(selection.date + 'T00:00:00')
    startTime.setHours(h, m, 0, 0)
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)
    const manageToken = randomToken()

    const { error: insertError } = await supabase.from('bookings').insert({
      tenant_id: tenantId,
      staff_id: selectedStaffId,
      service_id: service.id,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      status: 'pending',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      manage_token: manageToken,
    })

    if (insertError) {
      setSubmitting(false)
      setError('Something went wrong: ' + insertError.message)
      return
    }

    const manageUrl = `https://${subdomain}.trimbooking.co.uk/manage/${manageToken}`
    setConfirmedManageUrl(manageUrl)

    // Fire the confirmation email, but don't block the UI on it
    fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'requested',
        tenantName,
        customerEmail: email,
        customerName: name,
        serviceName: service.name,
        staffName: selectedStaff?.name,
        startTime: startTime.toISOString(),
        manageUrl,
      }),
    }).catch(() => {
      // Booking already succeeded in the database; a failed email shouldn't block the user
    })

    setSubmitting(false)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="confirm-box">
        <h3 style={{ marginTop: 0 }}>Booking request sent!</h3>
        <p>{service.name} with {selectedStaff?.name} on {selection && formatDateTime(selection.date, selection.slot)}.</p>
        <p style={{ color: '#666' }}>The shop will confirm your appointment shortly.</p>
        <p style={{ color: '#166534' }}>A confirmation has been noted for {email}.</p>
        {confirmedManageUrl && (
          <p style={{ marginBottom: 0 }}>
            <a href={confirmedManageUrl}>Manage or reschedule this booking</a>
          </p>
        )}
      </div>
    )
  }

  if (step === 'review' && selection) {
    return (
      <div>
        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div className="card-title" style={{ fontSize: '1.1rem' }}>{service.name}</div>
              <div className="card-sub">with {selectedStaff?.name}</div>
            </div>
            <span
              style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                background: '#fef9c3', color: '#854d0e', whiteSpace: 'nowrap',
              }}
            >
              Not booked yet
            </span>
          </div>

          <p style={{ margin: '0 0 0.4rem' }}>{formatDateTime(selection.date, selection.slot)}</p>
          <p className="card-sub" style={{ margin: 0 }}>£{service.price} · {service.duration_minutes} min</p>

          <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0 0.75rem' }} />

          <p style={{ margin: '0 0 0.2rem' }}>{name}</p>
          <p className="card-sub" style={{ margin: 0 }}>{phone}</p>
          <p className="card-sub" style={{ margin: 0 }}>{email}</p>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Please check these details before confirming — the shop will use them to reach you about your appointment.
        </p>

        {error && <p className="error-text">{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={handleFinalConfirm} disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm booking'}
          </button>
          <button
            onClick={() => setStep('details')}
            disabled={submitting}
            style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="field-group">
        <label className="field-label">Staff member</label>
        <select
          className="field-input"
          value={selectedStaffId}
          onChange={(e) => { setSelectedStaffId(e.target.value); setSelection(null) }}
        >
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
          ))}
        </select>
      </div>

      {selectedStaff && (
        <AvailabilityPicker
          tenantId={tenantId}
          staff={selectedStaff}
          durationMinutes={service.duration_minutes}
          shopOpeningHours={shopOpeningHours}
          onSelect={setSelection}
        />
      )}

      {selection && (
        <div style={{ marginTop: '2rem' }}>
          <div className="field-group">
            <label className="field-label">Your name</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Phone number</label>
            <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Email address</label>
            <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" onClick={handleReview}>Review booking</button>
        </div>
      )}
    </div>
  )
}
