'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getSlotsForDay } from '@/lib/availability'

type Staff = { id: string; name: string; role: string; working_hours: any }
type Service = { id: string; name: string; duration_minutes: number; price: number }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(?:(?:\+44|0)(?:7\d{9}|1\d{9}|2\d{9}|3\d{9}))$/.test(cleaned)
}

export default function BookingForm({
  tenantId,
  service,
  staffList,
}: {
  tenantId: string
  service: Service
  staffList: Staff[]
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '')
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  useEffect(() => {
    async function loadSlots() {
      if (!selectedStaff) return
      setLoading(true)
      setSelectedSlot(null)

      const dayStart = new Date(selectedDate + 'T00:00:00')
      const dayEnd = new Date(selectedDate + 'T23:59:59')

      const { data: existingBookings } = await supabase
        .from('available_slots')
        .select('start_time, end_time')
        .eq('staff_id', selectedStaff.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .neq('status', 'cancelled')

      const daySlots = getSlotsForDay(
        new Date(selectedDate + 'T12:00:00'),
        selectedStaff.working_hours,
        service.duration_minutes,
        existingBookings || []
      )
      setSlots(daySlots)
      setLoading(false)
    }
    loadSlots()
  }, [selectedStaffId, selectedDate, selectedStaff, service.duration_minutes])

  async function handleConfirm() {
    if (!selectedSlot || !name || !phone || !email) {
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

    const [h, m] = selectedSlot.split(':').map(Number)
    const startTime = new Date(selectedDate + 'T00:00:00')
    startTime.setHours(h, m, 0, 0)
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)

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
    })

    if (insertError) {
      setError('Something went wrong: ' + insertError.message)
      return
    }
    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="confirm-box">
        <h3 style={{ marginTop: 0 }}>Booking request sent!</h3>
        <p>{service.name} with {selectedStaff?.name} on {selectedDate} at {selectedSlot}.</p>
        <p style={{ color: '#666' }}>The shop will confirm your appointment shortly.</p>
        <p style={{ marginBottom: 0, color: '#166534' }}>A confirmation has been noted for {email}.</p>
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
          onChange={(e) => setSelectedStaffId(e.target.value)}
        >
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Date</label>
        <input
          type="date"
          className="field-input"
          value={selectedDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Available times</h2>
      {loading && <p>Loading...</p>}
      {!loading && slots.length === 0 && <p>No availability that day. Try another date.</p>}
      <div className="slot-grid">
        {slots.map((slot) => (
          <button
            key={slot}
            className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
            onClick={() => setSelectedSlot(slot)}
          >
            {slot}
          </button>
        ))}
      </div>

      {selectedSlot && (
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
