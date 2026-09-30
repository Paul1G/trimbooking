'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getSlotsForDay, toDateStr } from '@/lib/availability'

export type WorkingHours = Record<string, [string, string]>
export type BreakWindows = Record<string, [string, string][]>
export type PickerStaff = {
  id: string
  working_hours: WorkingHours
  breaks?: BreakWindows | null
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

// Shared week-strip + time-slot picker, used both for a new booking and for
// rescheduling an existing one. `excludeBookingId` lets a reschedule ignore
// the booking being moved when checking for overlaps against itself.
export default function AvailabilityPicker({
  tenantId,
  staff,
  durationMinutes,
  shopOpeningHours,
  initialDate,
  excludeStartTime,
  onSelect,
}: {
  tenantId: string
  staff: PickerStaff
  durationMinutes: number
  shopOpeningHours: WorkingHours
  initialDate?: Date
  excludeStartTime?: string
  onSelect: (selection: { date: string; slot: string } | null) => void
}) {
  const startingDate = useMemo(() => {
    if (initialDate) return initialDate
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  }, [initialDate])

  const [weekStart, setWeekStart] = useState(() => startOfWeek(startingDate))
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(startingDate))
  const [daySlots, setDaySlots] = useState<Record<string, string[]>>({})
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      setLoading(true)

      const rangeStart = new Date(weekStart)
      const rangeEnd = new Date(weekStart)
      rangeEnd.setDate(rangeEnd.getDate() + 6)
      rangeEnd.setHours(23, 59, 59, 999)

      const { data: existingBookingsRaw } = await supabase
        .from('available_slots')
        .select('start_time, end_time')
        .eq('staff_id', staff.id)
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString())
        .neq('status', 'cancelled')

      // When rescheduling, the booking's own current slot still shows up here
      // (it hasn't moved yet) — drop it so the customer can keep their existing time.
      const existingBookings = (existingBookingsRaw || []).filter(
        (b) => !excludeStartTime || b.start_time !== excludeStartTime
      )

      const { data: staffHolidays } = await supabase
        .from('staff_holidays')
        .select('start_date, end_date')
        .eq('staff_id', staff.id)

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
          staff.working_hours,
          shopOpeningHours || {},
          durationMinutes,
          existingBookings || [],
          staffHolidays || [],
          shopHolidays || [],
          staff.breaks || {}
        )
      }
      setDaySlots(nextDaySlots)
      setSelectedSlot(null)
      onSelect(null)
      setLoading(false)
    }
    loadWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff.id, weekStart, durationMinutes, excludeStartTime])

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
    onSelect(null)
  }

  function selectSlot(slot: string) {
    setSelectedSlot(slot)
    onSelect({ date: selectedDate, slot })
  }

  const selectedDaySlots = daySlots[selectedDate] || []
  const selectedDayObj = weekDays.find((d) => toDateStr(d) === selectedDate)

  return (
    <div>
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
            onClick={() => selectSlot(slot)}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  )
}
