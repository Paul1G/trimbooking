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

export type BreakWindows = Record<string, [string, string][]>

export default function BreaksEditor({
  value,
  onChange,
}: {
  value: BreakWindows
  onChange: (v: BreakWindows) => void
}) {
  function addBreak(dayKey: string) {
    const next = { ...value }
    const dayBreaks = next[dayKey] ? [...next[dayKey]] : []
    dayBreaks.push(['12:00', '13:00'])
    next[dayKey] = dayBreaks
    onChange(next)
  }

  function removeBreak(dayKey: string, index: number) {
    const next = { ...value }
    const dayBreaks = (next[dayKey] || []).filter((_, i) => i !== index)
    if (dayBreaks.length > 0) {
      next[dayKey] = dayBreaks
    } else {
      delete next[dayKey]
    }
    onChange(next)
  }

  function setBreakTime(dayKey: string, index: number, slot: 0 | 1, time: string) {
    const next = { ...value }
    const dayBreaks = (next[dayKey] || []).map((b, i) => {
      if (i !== index) return b
      const updated: [string, string] = [...b] as [string, string]
      updated[slot] = time
      return updated
    })
    next[dayKey] = dayBreaks
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {DAYS.map((day) => {
        const dayBreaks = value[day.key] || []
        return (
          <div
            key={day.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ width: 110, fontSize: '0.85rem', paddingTop: '0.4rem', flexShrink: 0 }}>
              {day.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              {dayBreaks.length === 0 && (
                <span style={{ color: '#999', fontSize: '0.85rem', paddingTop: '0.4rem' }}>No breaks</span>
              )}
              {dayBreaks.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="time"
                    value={b[0]}
                    onChange={(e) => setBreakTime(day.key, i, 0, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.85rem' }}
                  />
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>to</span>
                  <input
                    type="time"
                    value={b[1]}
                    onChange={(e) => setBreakTime(day.key, i, 1, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.85rem' }}
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
