'use client'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

export type WorkingHours = Record<string, [string, string]>

export default function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: WorkingHours
  onChange: (v: WorkingHours) => void
}) {
  function toggleDay(dayKey: string, open: boolean) {
    const next = { ...value }
    if (open) {
      next[dayKey] = ['09:00', '17:00']
    } else {
      delete next[dayKey]
    }
    onChange(next)
  }

  function setTime(dayKey: string, index: 0 | 1, time: string) {
    const current = value[dayKey] || ['09:00', '17:00']
    const next = { ...value }
    const updated: [string, string] = [...current] as [string, string]
    updated[index] = time
    next[dayKey] = updated
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {DAYS.map((day) => {
        const isOpen = Boolean(value[day.key])
        const hours = value[day.key] || ['09:00', '17:00']
        return (
          <div
            key={day.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: 110, fontSize: '0.85rem' }}>
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
                  value={hours[0]}
                  onChange={(e) => setTime(day.key, 0, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.85rem' }}
                />
                <span style={{ color: '#999' }}>to</span>
                <input
                  type="time"
                  value={hours[1]}
                  onChange={(e) => setTime(day.key, 1, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.85rem' }}
                />
              </>
            ) : (
              <span style={{ color: '#999', fontSize: '0.85rem' }}>Closed</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
