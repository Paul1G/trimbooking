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
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '')
  const [selection, setSelection] = useState<{ date: string; slot: string } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedManageUrl, setConfirmedManageUrl] = useState('')
  const [error, setError] = useState('')

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  async function handleConfirm() {
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

    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="confirm-box">
        <h3 style={{ marginTop: 0 }}>Booking request sent!</h3>
        <p>{service.name} with {selectedStaff?.name} on {selection?.date} at {selection?.slot}.</p>
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
          <button className="btn-primary" onClick={handleConfirm}>Confirm booking</button>
        </div>
      )}
    </div>
  )
}
