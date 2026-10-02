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
// row per day, hours on the left and that day's breaks on the right, so the
// two don't need to be scanned as separate stacked sections.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', padding: '0 0 0.3rem' }}>
        <div style={{ width: 300, fontSize: '0.78rem', fontWeight: 600, color: '#888', flexShrink: 0 }}>
          Working hours
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#888', borderLeft: '1px solid #eee', paddingLeft: '1rem' }}>
          Breaks
        </div>
      </div>
      {DAYS.map((day) => {
        const isOpen = Boolean(hours[day.key])
        const dayHours = hours[day.key] || ['09:00', '17:00']
        const dayBreaks = breaks[day.key] || []
        return (
          <div
            key={day.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ width: 300, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 95, flexShrink: 0, fontSize: '0.85rem' }}>
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
                    style={{ width: 95, padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.8rem' }}
                  />
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>to</span>
                  <input
                    type="time"
                    value={dayHours[1]}
                    onChange={(e) => setTime(day.key, 1, e.target.value)}
                    style={{ width: 95, padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.8rem' }}
                  />
                </>
              ) : (
                <span style={{ color: '#999', fontSize: '0.85rem' }}>Closed</span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                flex: 1,
                borderLeft: '1px solid #eee',
                paddingLeft: '1rem',
              }}
            >
              {dayBreaks.length === 0 && (
                <span style={{ color: '#999', fontSize: '0.85rem', paddingTop: '0.3rem' }}>No breaks</span>
              )}
              {dayBreaks.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="time"
                    value={b[0]}
                    onChange={(e) => setBreakTime(day.key, i, 0, e.target.value)}
                    style={{ width: 95, padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.8rem' }}
                  />
                  <span style={{ color: '#999', fontSize: '0.8rem' }}>to</span>
                  <input
                    type="time"
                    value={b[1]}
                    onChange={(e) => setBreakTime(day.key, i, 1, e.target.value)}
                    style={{ width: 95, padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.8rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeBreak(day.key, i)}
                    style={{
                      border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer',
                      fontSize: '0.8rem', padding: '2px 6px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addBreak(day.key)}
                style={{
                  alignSelf: 'flex-start', border: '1px solid #ddd', background: '#fff',
                  borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', color: '#374151',
                }}
              >
                + Add break
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
