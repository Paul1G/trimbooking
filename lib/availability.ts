type WorkingHours = Record<string, [string, string]>
type HolidayRange = { start_date: string; end_date: string }

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function isClosedByHoliday(date: Date, holidays: HolidayRange[]): boolean {
  const d = dateStr(date)
  return holidays.some((h) => d >= h.start_date && d <= h.end_date)
}

export function getSlotsForDay(
  date: Date,
  staffWorkingHours: WorkingHours,
  shopOpeningHours: WorkingHours,
  durationMinutes: number,
  existingBookings: { start_time: string; end_time: string }[],
  staffHolidays: HolidayRange[] = [],
  shopHolidays: HolidayRange[] = []
): string[] {
  if (isClosedByHoliday(date, staffHolidays) || isClosedByHoliday(date, shopHolidays)) {
    return []
  }

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const dayKey = dayNames[date.getDay()]

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

  const slots: string[] = []
  const slotLength = 15

  for (
    let t = new Date(dayStart);
    t.getTime() + durationMinutes * 60000 <= dayEnd.getTime();
    t.setMinutes(t.getMinutes() + slotLength)
  ) {
    const slotStart = new Date(t)
    const slotEnd = new Date(t.getTime() + durationMinutes * 60000)

    const overlaps = existingBookings.some((b) => {
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      return slotStart < bEnd && slotEnd > bStart
    })

    if (!overlaps) {
      slots.push(
        slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      )
    }
  }

  return slots
}
