'use client'

import type { WorkingHours } from './WeeklyHoursEditor'
import type { BreakWindows } from './BreaksEditor'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

export type { WorkingHours, BreakWindows }

// Combines the working-hours and breaks editors into one widget — a single
// row per day, hours and that day's breaks side by side on a wide screen.
// Below the `schedule-editor` breakpoint (see tenant.css) each day's breaks
// drop underneath its hours instead of squeezing into a second column, so
// nothing has to scroll sideways out of its box on a phone.
export default function ScheduleEditor({
  hours,
  onHoursChange,
  breaks,
  onBreaksChange,
}: {
  hours: WorkingHours
  onHoursChange: (v: WorkingHours) => void
  breaks: BreakWindows
  onBreaksChange: (v: BreakWindows) => void
}) {
  function toggleDay(dayKey: string, open: boolean) {
    const next = { ...hours }
    if (open) {
      next[dayKey] = ['09:00', '17:00']
    } else {
      delete next[dayKey]
    }
    onHoursChange(next)
  }

  function setTime(dayKey: string, index: 0 | 1, time: string) {
    const current = hours[dayKey] || ['09:00', '17:00']
    const next = { ...hours }
    const updated: [string, string] = [...current] as [string, string]
    updated[index] = time
    next[dayKey] = updated
    onHoursChange(next)
  }

  function addBreak(dayKey: string) {
    const next = { ...breaks }
    const dayBreaks = next[dayKey] ? [...next[dayKey]] : []
    dayBreaks.push(['12:00', '13:00'])
    next[dayKey] = dayBreaks
    onBreaksChange(next)
  }

  function removeBreak(dayKey: string, index: number) {
    const next = { ...breaks }
    const dayBreaks = (next[dayKey] || []).filter((_, i) => i !== index)
    if (dayBreaks.length > 0) {
      next[dayKey] = dayBreaks
    } else {
      delete next[dayKey]
    }
    onBreaksChange(next)
  }

  function setBreakTime(dayKey: string, index: number, slot: 0 | 1, time: string) {
    const next = { ...breaks }
    const dayBreaks = (next[dayKey] || []).map((b, i) => {
      if (i !== index) return b
      const updated: [string, string] = [...b] as [string, string]
      updated[slot] = time
      return updated
    })
    next[dayKey] = dayBreaks
    onBreaksChange(next)
  }

  return (
    <div className="schedule-editor">
      <div className="schedule-header">
        <div className="schedule-header-hours">Working hours</div>
        <div className="schedule-header-breaks">Breaks</div>
      </div>
      {DAYS.map((day) => {
        const isOpen = Boolean(hours[day.key])
        const dayHours = hours[day.key] || ['09:00', '17:00']
        const dayBreaks = breaks[day.key] || []
        return (
          <div key={day.key} className="schedule-row">
            <div className="schedule-hours">
              <label className="schedule-day-label">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) => toggleDay(day.key, e.target.checked)}
                />
                {day.label}
              </label>
              {isOpen ? (
                <>
                  <input
                    type="time"
                    value={dayHours[0]}
                    onChange={(e) => setTime(day.key, 0, e.target.value)}
                    className="schedule-time-input"
                  />
                  <span className="schedule-to">to</span>
                  <input
                    type="time"
                    value={dayHours[1]}
                    onChange={(e) => setTime(day.key, 1, e.target.value)}
                    className="schedule-time-input"
                  />
                </>
              ) : (
                <span className="schedule-closed">Closed</span>
              )}
            </div>

            <div className="schedule-breaks">
              <div className="schedule-mobile-label">Breaks</div>
              {dayBreaks.length === 0 && <span className="schedule-closed">No breaks</span>}
              {dayBreaks.map((b, i) => (
                <div key={i} className="schedule-break-row">
                  <input
                    type="time"
                    value={b[0]}
                    onChange={(e) => setBreakTime(day.key, i, 0, e.target.value)}
                    className="schedule-time-input"
                  />
                  <span className="schedule-to">to</span>
                  <input
                    type="time"
                    value={b[1]}
                    onChange={(e) => setBreakTime(day.key, i, 1, e.target.value)}
                    className="schedule-time-input"
                  />
                  <button type="button" onClick={() => removeBreak(day.key, i)} className="schedule-remove-btn">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addBreak(day.key)} className="schedule-add-btn">
                + Add break
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
