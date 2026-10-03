type WorkingHours = Record<string, [string, string]>
type BreakWindows = Record<string, [string, string][]>
type HolidayRange = { start_date: string; end_date: string }

// Renders a Date as its own local calendar date ("YYYY-MM-DD") — NOT
// `d.toISOString().split('T')[0]`, which converts to UTC first. For anyone
// in a positive UTC offset (e.g. UK during BST, UTC+1), a Date built from
// local midnight sits at 23:00 the previous day in UTC, so toISOString()
// silently returns the day before. That mismatch is exactly what made
// "next day" look like it did nothing (it round-tripped back to the same
// date) and made bookings save under the wrong calendar day.
export function toDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateStr(d: Date): string {
  return toDateStr(d)
}

export function isClosedByHoliday(date: Date, holidays: HolidayRange[]): boolean {
  const d = dateStr(date)
  return holidays.some((h) => d >= h.start_date && d <= h.end_date)
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function dayKeyFor(date: Date): string {
  return DAY_NAMES[date.getDay()]
}

export function getSlotsForDay(
  date: Date,
  staffWorkingHours: WorkingHours,
  shopOpeningHours: WorkingHours,
  durationMinutes: number,
  existingBookings: { start_time: string; end_time: string }[],
  staffHolidays: HolidayRange[] = [],
  shopHolidays: HolidayRange[] = [],
  staffBreaks: BreakWindows = {},
  // [start_minute, end_minute] pairs, relative to the candidate booking's own
  // start, for the service being booked. When set (a parallel-treatment
  // service), only these windows of the candidate need to be free of other
  // bookings/breaks — the rest of its duration can overlap another
  // customer's appointment with the same staff member. Omit/empty for an
  // ordinary service, which needs its whole span free, same as before this
  // existed.
  contactWindows?: [number, number][]
): string[] {
  if (isClosedByHoliday(date, staffHolidays) || isClosedByHoliday(date, shopHolidays)) {
    return []
  }

  const dayKey = dayKeyFor(date)

  const staffHours = staffWorkingHours[dayKey]
  const shopHours = shopOpeningHours[dayKey]

  // Staff not scheduled, or shop closed, that day
  if (!staffHours || !shopHours) return []

  // The window is the overlap of staff hours and shop hours — whichever is tighter wins
  const [staffOpenH, staffOpenM] = staffHours[0].split(':').map(Number)
  const [staffCloseH, staffCloseM] = staffHours[1].split(':').map(Number)
  const [shopOpenH, shopOpenM] = shopHours[0].split(':').map(Number)
  const [shopCloseH, shopCloseM] = shopHours[1].split(':').map(Number)

  const dayStart = new Date(date)
  const dayEnd = new Date(date)

  const openMins = Math.max(staffOpenH * 60 + staffOpenM, shopOpenH * 60 + shopOpenM)
  const closeMins = Math.min(staffCloseH * 60 + staffCloseM, shopCloseH * 60 + shopCloseM)

  if (openMins >= closeMins) return [] // no overlap between staff hours and shop hours

  dayStart.setHours(0, openMins, 0, 0)
  dayEnd.setHours(0, closeMins, 0, 0)

  // Turn today's break windows into absolute start/end times, same as bookings
  const breaksToday = (staffBreaks[dayKey] || []).map(([start, end]) => {
    const [bsH, bsM] = start.split(':').map(Number)
    const [beH, beM] = end.split(':').map(Number)
    const bStart = new Date(date)
    bStart.setHours(bsH, bsM, 0, 0)
    const bEnd = new Date(date)
    bEnd.setHours(beH, beM, 0, 0)
    return { start_time: bStart.toISOString(), end_time: bEnd.toISOString() }
  })

  const blockers = [...existingBookings, ...breaksToday]

  // The segments of the candidate booking that actually need the staff
  // member free, relative to its own start. An ordinary service (or a
  // parallel one with no windows configured) is just its whole duration.
  const ownWindows: [number, number][] =
    contactWindows && contactWindows.length > 0 ? contactWindows : [[0, durationMinutes]]

  const slots: string[] = []
  const slotLength = 15

  for (
    let t = new Date(dayStart);
    t.getTime() + durationMinutes * 60000 <= dayEnd.getTime();
    t.setMinutes(t.getMinutes() + slotLength)
  ) {
    const slotStart = new Date(t)

    const overlaps = ownWindows.some(([winStart, winEnd]) => {
      const segStart = new Date(slotStart.getTime() + winStart * 60000)
      const segEnd = new Date(slotStart.getTime() + winEnd * 60000)
      return blockers.some((b) => {
        const bStart = new Date(b.start_time)
        const bEnd = new Date(b.end_time)
        return segStart < bEnd && segEnd > bStart
      })
    })

    if (!overlaps) {
      slots.push(
        slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      )
    }
  }

  return slots
}
