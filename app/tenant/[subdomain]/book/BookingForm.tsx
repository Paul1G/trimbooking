'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getSlotsForDay } from '@/lib/availability'

type Staff = { id: string; name: string; role: string; working_hours: any }
type Service = { id: string; name: string; duration_minutes: number; price: number }

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
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fff0', borderRadius: 8 }}>
        <h3>Booking confirmed!</h3>
        <p>
          {service.name} with {selectedStaff?.name} on {selectedDate} at {selectedSlot}.
        </p>
        <p>A confirmation has been noted for {email}.</p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Staff member:
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          style={{ display: 'block', marginTop: 4, padding: 8, width: '100%' }}
        >
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.role}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Date:
        <input
          type="date"
          value={selectedDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ display: 'block', marginTop: 4, padding: 8, width: '100%' }}
        />
      </label>

      <h3>Available times</h3>
      {loading && <p>Loading...</p>}
      {!loading && slots.length === 0 && <p>No availability that day. Try another date.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => setSelectedSlot(slot)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: selectedSlot === slot ? '2px solid #333' : '1px solid #ccc',
              background: selectedSlot === slot ? '#333' : '#fff',
              color: selectedSlot === slot ? '#fff' : '#000',
              cursor: 'pointer',
            }}
          >
            {slot}
          </button>
        ))}
      </div>

      {selectedSlot && (
        <div style={{ marginTop: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Your name:
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ display: 'block', marginTop: 4, padding: 8, width: '100%' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Phone number:
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ display: 'block', marginTop: 4, padding: 8, width: '100%' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Email address:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: 'block', marginTop: 4, padding: 8, width: '100%' }}
            />
          </label>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button
            onClick={handleConfirm}
            style={{ padding: '10px 20px', background: '#333', color: '#fff', borderRadius: 6, border: 'none' }}
          >
            Confirm booking
          </button>
        </div>
      )}
    </div>
  )
}
