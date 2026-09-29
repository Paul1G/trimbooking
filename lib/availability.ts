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
  workingHours: WorkingHours,
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
  const hours = workingHours[dayKey]
  if (!hours) return []

  const [openTime, closeTime] = hours
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)

  const dayStart = new Date(date)
  dayStart.setHours(openH, openM, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(closeH, closeM, 0, 0)

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
