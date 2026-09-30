'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getSlotsForDay } from '@/lib/availability'

type WorkingHours = Record<string, [string, string]>
type BreakWindows = Record<string, [string, string][]>
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

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function isPastDay(d: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export default function BookingForm({
  tenantId,
  tenantName,
  service,
  staffList,
  shopOpeningHours,
}: {
  tenantId: string
  tenantName: string
  service: Service
  staffList: Staff[]
  shopOpeningHours: WorkingHours
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '')

  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  }, [])

  const [weekStart, setWeekStart] = useState(() => startOfWeek(tomorrow))
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(tomorrow))
  const [daySlots, setDaySlots] = useState<Record<string, string[]>>({})
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const currentWeekStart = useMemo(() => startOfWeek(new Date()), [])
  const canGoPrevWeek = weekStart > currentWeekStart

  useEffect(() => {
    async function loadWeek() {
      if (!selectedStaff) return
      setLoading(true)

      const rangeStart = new Date(weekStart)
      const rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + 6)
      rangeEnd.setHours(23, 59, 59, 999)

      const { data: existingBookings } = await supabase
        .from('available_slots')
        .select('start_time, end_time')
        .eq('staff_id', selectedStaff.id)
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString())
        .neq('status', 'cancelled')

      const { data: staffHolidays } = await supabase
        .from('staff_holidays')
        .select('start_date, end_date')
        .eq('staff_id', selectedStaff.id)

      const { data: shopHolidays } = await supabase
        .from('staff_holidays')
        .select('start_date, end_date')
        .is('staff_id', null)
        .eq('tenant_id', tenantId)

      const nextDaySlots: Record<string, string[]> = {}
      for (const day of weekDays) {
        if (isPastDay(day)) {
          nextDaySlots[toDateStr(day)] = []
          continue
        }
        nextDaySlots[toDateStr(day)] = getSlotsForDay(
          day,
          selectedStaff.working_hours,
          shopOpeningHours || {},
          service.duration_minutes,
          existingBookings || [],
          staffHolidays || [],
          shopHolidays || [],
          selectedStaff.breaks || {}
        )
      }
      setDaySlots(nextDaySlots)
      setSelectedSlot(null)
      setLoading(false)
    }
    loadWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId, weekStart, service.duration_minutes])

  function goPrevWeek() {
    if (!canGoPrevWeek) return
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  function goNextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  function selectDay(day: Date) {
    if (isPastDay(day)) return
    setSelectedDate(toDateStr(day))
    setSelectedSlot(null)
  }

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
        <p>{service.name} with {selectedStaff?.name} on {selectedDate} at {selectedSlot}.</p>
        <p style={{ color: '#666' }}>The shop will confirm your appointment shortly.</p>
        <p style={{ marginBottom: 0, color: '#166534' }}>A confirmation has been noted for {email}.</p>
      </div>
    )
  }

  const selectedDaySlots = daySlots[selectedDate] || []
  const selectedDayObj = weekDays.find((d) => toDateStr(d) === selectedDate)

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
        <label className="field-label">Day</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={goPrevWeek}
            disabled={!canGoPrevWeek}
            style={{
              padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff',
              cursor: canGoPrevWeek ? 'pointer' : 'default', opacity: canGoPrevWeek ? 1 : 0.35, flexShrink: 0,
            }}
            aria-label="Previous week"
          >
            ←
          </button>

          <div style={{ display: 'flex', gap: '0.4rem', flex: 1, overflowX: 'auto' }}>
            {weekDays.map((day) => {
              const dStr = toDateStr(day)
              const past = isPastDay(day)
              const count = daySlots[dStr]?.length ?? null
              const isSelected = dStr === selectedDate
              const isToday = toDateStr(new Date()) === dStr
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={past}
                  style={{
                    flex: '1 0 60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '0.5rem 0.3rem',
                    borderRadius: 10,
                    border: isSelected ? '2px solid var(--brand)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--brand)' : '#fff',
                    color: isSelected ? '#fff' : past ? '#ccc' : 'var(--text)',
                    cursor: past ? 'default' : 'pointer',
                    opacity: past ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{day.getDate()}</span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                    {isToday && !past ? 'Today · ' : ''}
                    {loading ? '···' : past ? 'Past' : count === 0 ? 'Full' : `${count} free`}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={goNextWeek}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
            aria-label="Next week"
          >
            →
          </button>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>
        Available times
        {selectedDayObj && (
          <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {selectedDayObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        )}
      </h2>
      {loading && <p>Loading...</p>}
      {!loading && selectedDaySlots.length === 0 && <p>No availability that day. Try another date.</p>}
      <div className="slot-grid">
        {selectedDaySlots.map((slot) => (
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
