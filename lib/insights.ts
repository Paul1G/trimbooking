// Business insights for the owner's Insights dashboard and each staff
// member's own "My insights" page. Everything here is pure calculation over
// booking rows that the page has already loaded — no Supabase calls — so the
// same numbers come out whichever page (and whichever access rules) supplied
// the rows.
//
// Conventions shared with the staff portal's earnings figures:
// - A visit "counts" when it's confirmed, already started, and not a no-show.
// - Its value is what was actually recorded as paid, falling back to the
//   service's list price when nothing was entered ("paid in full unless
//   amended").
// - All dates are local (the browser's timezone, i.e. UK time for UK shops).

import { dayKeyFor, isClosedByHoliday } from '@/lib/availability'

export type InsightBooking = {
  id: string
  start: Date
  end: Date
  status: string
  noShow: boolean
  price: number | null
  paid: number | null
  customerKey: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  staffId: string | null
  serviceName: string | null
}

export type StaffSchedule = {
  id: string
  name: string
  working_hours: Record<string, [string, string]> | null
  breaks: Record<string, [string, string][]> | null
  // Only present on the shop-wide load (loadShopInsights) — an owner is
  // allowed to see an employed team member's earnings (same gating as
  // owner_get_staff_bookings), but never a self-employed one's.
  employment_status?: 'self_employed' | 'employed' | null
}

export type HolidayRow = { staff_id: string | null; start_date: string; end_date: string }

export type CapacityInputs = {
  staff: StaffSchedule[]
  shopHours: Record<string, [string, string]> | null
  holidays: HolidayRow[]
}

export type PeriodKind = 'week' | 'lastMonth' | 'taxYear'

export type Period = {
  kind: PeriodKind
  start: Date
  end: Date
  label: string
  compareStart: Date
  compareEnd: Date
  compareLabel: string
}

const DAY_MS = 24 * 60 * 60 * 1000

// ---------- small helpers ----------

export function bookingValue(b: InsightBooking): number {
  if (b.paid != null) return Number(b.paid)
  return b.price != null ? Number(b.price) : 0
}

export function isCompletedVisit(b: InsightBooking, now: Date): boolean {
  return b.status === 'confirmed' && !b.noShow && b.start.getTime() <= now.getTime()
}

function inRange(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Monday
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function minusYear(d: Date): Date {
  const x = new Date(d)
  x.setFullYear(x.getFullYear() - 1)
  return x
}

// UK tax year runs 6 April – 5 April.
export function taxYearStart(now: Date): Date {
  const y = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6) ? now.getFullYear() : now.getFullYear() - 1
  return new Date(y, 3, 6)
}

function taxYearLabel(start: Date): string {
  const y = start.getFullYear()
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`
}

const monthFmt = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
export const shortDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function getPeriod(kind: PeriodKind, now: Date = new Date()): Period {
  if (kind === 'week') {
    const start = startOfWeek(now)
    return {
      kind,
      start,
      end: now,
      label: 'This week',
      compareStart: addDays(start, -7),
      compareEnd: new Date(now.getTime() - 7 * DAY_MS),
      compareLabel: 'same point last week',
    }
  }
  if (kind === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    const compareStart = minusYear(start)
    return {
      kind,
      start,
      end,
      label: monthFmt(start),
      compareStart,
      compareEnd: minusYear(end),
      compareLabel: monthFmt(compareStart),
    }
  }
  const start = taxYearStart(now)
  const compareStart = minusYear(start)
  return {
    kind,
    start,
    end: now,
    label: `Tax year ${taxYearLabel(start)}`,
    compareStart,
    compareEnd: minusYear(now),
    compareLabel: `same point in ${taxYearLabel(compareStart)}`,
  }
}

// ---------- capacity (for utilisation) ----------

function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

// The minutes of a given day a staff member can actually be booked: the
// overlap of their hours and the shop's hours, minus their breaks, and
// nothing at all on a staff or shop-wide holiday. Same rules the booking page
// uses to offer slots (lib/availability.ts), so "100% utilised" means "no
// bookable time left". Uses today's schedule settings for every date — there
// is no history of past rotas, which is fine for a trend view.
export function staffWindowsForDay(date: Date, staff: StaffSchedule, inputs: CapacityInputs): [number, number][] {
  const staffHols = inputs.holidays.filter((h) => h.staff_id === staff.id)
  const shopHols = inputs.holidays.filter((h) => h.staff_id == null)
  if (isClosedByHoliday(date, staffHols) || isClosedByHoliday(date, shopHols)) return []

  const key = dayKeyFor(date)
  const sh = staff.working_hours?.[key]
  if (!sh) return []
  const shop = inputs.shopHours ? inputs.shopHours[key] : sh
  if (!shop) return []

  const open = Math.max(toMins(sh[0]), toMins(shop[0]))
  const close = Math.min(toMins(sh[1]), toMins(shop[1]))
  if (open >= close) return []

  let windows: [number, number][] = [[open, close]]
  for (const [bs, be] of staff.breaks?.[key] || []) {
    const b0 = toMins(bs)
    const b1 = toMins(be)
    const next: [number, number][] = []
    for (const [w0, w1] of windows) {
      if (b1 <= w0 || b0 >= w1) {
        next.push([w0, w1])
        continue
      }
      if (b0 > w0) next.push([w0, b0])
      if (b1 < w1) next.push([b1, w1])
    }
    windows = next
  }
  return windows
}

function overlapMins(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

// Bookable minutes between start and end (clipped to the exact instants, so
// "this week" only counts capacity up to now).
export function capacityMinutes(start: Date, end: Date, inputs: CapacityInputs, staffIds?: Set<string>): number {
  let total = 0
  for (let day = new Date(start.getFullYear(), start.getMonth(), start.getDate()); day < end; day = addDays(day, 1)) {
    const dayStartMs = day.getTime()
    const clip0 = Math.max(0, (start.getTime() - dayStartMs) / 60000)
    const clip1 = Math.min(24 * 60, (end.getTime() - dayStartMs) / 60000)
    if (clip1 <= clip0) continue
    for (const s of inputs.staff) {
      if (staffIds && !staffIds.has(s.id)) continue
      for (const [w0, w1] of staffWindowsForDay(day, s, inputs)) total += overlapMins(w0, w1, clip0, clip1)
    }
  }
  return total
}

function bookedMinutes(b: InsightBooking, start: Date, end: Date): number {
  const s = Math.max(b.start.getTime(), start.getTime())
  const e = Math.min(b.end.getTime(), end.getTime())
  return Math.max(0, (e - s) / 60000)
}

// Time that was taken out of the diary: confirmed bookings, no-shows
// included (the chair was still held for them).
function isBookedTime(b: InsightBooking): boolean {
  return b.status === 'confirmed'
}

// ---------- period summary / KPIs ----------

export type Summary = {
  revenue: number
  visits: number
  clients: number
  newClients: number
  avgSpend: number
  bookedMins: number
  capacityMins: number
  utilisation: number | null // 0..1
  noShows: number
  cancellations: number
}

export function firstVisitMap(bookings: InsightBooking[], now: Date): Map<string, number> {
  const first = new Map<string, number>()
  for (const b of bookings) {
    if (!isCompletedVisit(b, now)) continue
    const t = b.start.getTime()
    const cur = first.get(b.customerKey)
    if (cur == null || t < cur) first.set(b.customerKey, t)
  }
  return first
}

export function summarise(
  bookings: InsightBooking[],
  start: Date,
  end: Date,
  inputs: CapacityInputs,
  now: Date,
  firstVisits: Map<string, number>,
  staffIds?: Set<string>
): Summary {
  let revenue = 0
  let visits = 0
  let bookedMins = 0
  let noShows = 0
  let cancellations = 0
  const clients = new Set<string>()
  let newClients = 0
  const end2 = end.getTime() > now.getTime() ? now : end

  for (const b of bookings) {
    if (staffIds && (!b.staffId || !staffIds.has(b.staffId))) continue
    if (!inRange(b.start, start, end2)) continue
    if (b.status === 'cancelled') cancellations++
    if (b.status === 'confirmed' && b.noShow) noShows++
    if (isBookedTime(b)) bookedMins += bookedMinutes(b, start, end2)
    if (!isCompletedVisit(b, now)) continue
    visits++
    revenue += bookingValue(b)
    if (!clients.has(b.customerKey)) {
      clients.add(b.customerKey)
      const f = firstVisits.get(b.customerKey)
      if (f != null && f >= start.getTime() && f < end2.getTime()) newClients++
    }
  }

  const capacityMins = capacityMinutes(start, end2, inputs, staffIds)
  return {
    revenue,
    visits,
    clients: clients.size,
    newClients,
    avgSpend: visits ? revenue / visits : 0,
    bookedMins,
    capacityMins,
    utilisation: capacityMins > 0 ? Math.min(1, bookedMins / capacityMins) : null,
    noShows,
    cancellations,
  }
}

// Percentage change, or null when there's nothing to compare against.
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

// ---------- week on week ----------

export type WeekPoint = { weekStart: Date; revenue: number; visits: number; isCurrent: boolean }

export function weeklySeries(bookings: InsightBooking[], now: Date, weeks: number): WeekPoint[] {
  const thisWeek = startOfWeek(now)
  const points: WeekPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    points.push({ weekStart: addDays(thisWeek, -7 * i), revenue: 0, visits: 0, isCurrent: i === 0 })
  }
  const firstMs = points[0].weekStart.getTime()
  for (const b of bookings) {
    if (!isCompletedVisit(b, now)) continue
    const ws = startOfWeek(b.start).getTime()
    if (ws < firstMs) continue
    // Index by date difference rather than ms/7days so a clock change week
    // still lands in the right bucket.
    const idx = points.findIndex((p) => p.weekStart.getTime() === ws)
    if (idx < 0) continue
    points[idx].revenue += bookingValue(b)
    points[idx].visits++
  }
  return points
}

// Best full week in the last year (the current, unfinished week is excluded so
// a strong Monday can't look like a record).
export function bestWeek(series52: WeekPoint[], metric: 'revenue' | 'visits'): WeekPoint | null {
  let best: WeekPoint | null = null
  for (const p of series52) {
    if (p.isCurrent) continue
    if (p[metric] <= 0) continue
    if (!best || p[metric] > best[metric]) best = p
  }
  return best
}

// ---------- clients ----------

export type ClientStat = {
  key: string
  name: string
  email: string | null
  phone: string | null
  visits: number
  spend: number
  lastVisit: Date | null
}

function clientStats(bookings: InsightBooking[], now: Date, start?: Date, end?: Date): Map<string, ClientStat> {
  const map = new Map<string, ClientStat>()
  const sorted = [...bookings].sort((a, b) => a.start.getTime() - b.start.getTime())
  for (const b of sorted) {
    if (!isCompletedVisit(b, now)) continue
    if (start && end && !inRange(b.start, start, end)) continue
    const cur = map.get(b.customerKey) || {
      key: b.customerKey,
      name: b.customerName,
      email: b.customerEmail,
      phone: b.customerPhone,
      visits: 0,
      spend: 0,
      lastVisit: null,
    }
    cur.visits++
    cur.spend += bookingValue(b)
    cur.lastVisit = b.start
    // Latest details win, same as the Customers page.
    cur.name = b.customerName || cur.name
    cur.email = b.customerEmail || cur.email
    cur.phone = b.customerPhone || cur.phone
    map.set(b.customerKey, cur)
  }
  return map
}

export function topClients(
  bookings: InsightBooking[],
  start: Date,
  end: Date,
  now: Date,
  by: 'spend' | 'visits',
  n = 10
): ClientStat[] {
  return Array.from(clientStats(bookings, now, start, end).values())
    .sort((a, b) => (by === 'spend' ? b.spend - a.spend || b.visits - a.visits : b.visits - a.visits || b.spend - a.spend))
    .slice(0, n)
}

export type LapsedClient = ClientStat & { daysSince: number }

// Clients whose last visit was more than `days` ago and who have nothing
// booked in. Most valuable (lifetime spend, then visits) first — those are
// the ones worth a call.
export function lapsedClients(bookings: InsightBooking[], now: Date, days = 90): LapsedClient[] {
  const upcoming = new Set<string>()
  for (const b of bookings) {
    if ((b.status === 'pending' || b.status === 'confirmed') && b.start.getTime() > now.getTime()) upcoming.add(b.customerKey)
  }
  const cutoff = now.getTime() - days * DAY_MS
  const out: LapsedClient[] = []
  for (const c of clientStats(bookings, now).values()) {
    if (!c.lastVisit || c.lastVisit.getTime() >= cutoff || upcoming.has(c.key)) continue
    out.push({ ...c, daysSince: Math.floor((now.getTime() - c.lastVisit.getTime()) / DAY_MS) })
  }
  return out.sort((a, b) => b.spend - a.spend || b.visits - a.visits || a.daysSince - b.daysSince)
}

// ---------- busy / quiet ----------

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type HeatCell = { day: number; hour: number; booked: number; capacity: number; visits: number }

export type Heatmap = {
  cells: HeatCell[] // day 0 = Monday
  hours: number[] // hours that have any capacity or bookings
  byDay: { day: number; booked: number; capacity: number; visits: number }[]
  weeks: number
}

// Over the last `weeks` whole weeks: how much of each weekday/hour was booked
// versus bookable.
export function busyQuietHeatmap(
  bookings: InsightBooking[],
  inputs: CapacityInputs,
  now: Date,
  weeks = 12,
  staffIds?: Set<string>
): Heatmap {
  const end = startOfWeek(now)
  const start = addDays(end, -7 * weeks)
  const grid: HeatCell[] = []
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid.push({ day: d, hour: h, booked: 0, capacity: 0, visits: 0 })
  const cell = (d: number, h: number) => grid[d * 24 + h]

  for (let day = new Date(start); day < end; day = addDays(day, 1)) {
    const d = (day.getDay() + 6) % 7
    for (const s of inputs.staff) {
      if (staffIds && !staffIds.has(s.id)) continue
      for (const [w0, w1] of staffWindowsForDay(day, s, inputs)) {
        for (let h = Math.floor(w0 / 60); h * 60 < w1; h++) cell(d, h).capacity += overlapMins(w0, w1, h * 60, h * 60 + 60)
      }
    }
  }

  for (const b of bookings) {
    if (!isBookedTime(b) || !inRange(b.start, start, end)) continue
    if (staffIds && (!b.staffId || !staffIds.has(b.staffId))) continue
    const d = (b.start.getDay() + 6) % 7
    const s0 = b.start.getHours() * 60 + b.start.getMinutes()
    const s1 = s0 + Math.max(0, (b.end.getTime() - b.start.getTime()) / 60000)
    cell(d, b.start.getHours()).visits++
    for (let h = Math.floor(s0 / 60); h * 60 < s1 && h < 24; h++) cell(d, h).booked += overlapMins(s0, s1, h * 60, h * 60 + 60)
  }

  const used = new Set<number>()
  for (const c of grid) if (c.capacity > 0 || c.booked > 0) used.add(c.hour)
  const hours = Array.from(used).sort((a, b) => a - b)
  const byDay = WEEKDAYS.map((_, d) => {
    const cs = grid.filter((c) => c.day === d)
    return {
      day: d,
      booked: cs.reduce((s, c) => s + c.booked, 0),
      capacity: cs.reduce((s, c) => s + c.capacity, 0),
      visits: cs.reduce((s, c) => s + c.visits, 0),
    }
  })
  return { cells: grid, hours, byDay, weeks }
}

export function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${suffix}`
}

function util(booked: number, capacity: number): number {
  return capacity > 0 ? booked / capacity : 0
}

// Plain-English takeaways from the heatmap. Uses utilisation when opening
// hours are set up; otherwise falls back to raw appointment counts.
export function busyQuietInsights(hm: Heatmap): string[] {
  const hasCapacity = hm.byDay.some((d) => d.capacity > 0)
  const totalVisits = hm.byDay.reduce((s, d) => s + d.visits, 0)
  if (totalVisits === 0) return []
  const out: string[] = []
  const pct = (n: number) => `${Math.round(n * 100)}%`

  if (hasCapacity) {
    const days = hm.byDay.filter((d) => d.capacity > 0)
    const busiest = [...days].sort((a, b) => util(b.booked, b.capacity) - util(a.booked, a.capacity))[0]
    const quietest = [...days].sort((a, b) => util(a.booked, a.capacity) - util(b.booked, b.capacity))[0]
    out.push(`${WEEKDAYS[busiest.day]} is your busiest day — ${pct(util(busiest.booked, busiest.capacity))} of bookable time gets booked.`)
    if (quietest.day !== busiest.day) {
      out.push(`${WEEKDAYS[quietest.day]} is the quietest — only ${pct(util(quietest.booked, quietest.capacity))} booked.`)
    }

    // Two-hour blocks are easier to act on than single hours.
    const blocks: { day: number; hour: number; u: number; cap: number }[] = []
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 23; h++) {
        const a = hm.cells[d * 24 + h]
        const b = hm.cells[d * 24 + h + 1]
        const cap = a.capacity + b.capacity
        // Ignore slivers of capacity (e.g. a 15-minute overlap at closing).
        if (a.capacity < 30 * hm.weeks * 0.5 || b.capacity < 30 * hm.weeks * 0.5) continue
        blocks.push({ day: d, hour: h, u: util(a.booked + b.booked, cap), cap })
      }
    }
    if (blocks.length) {
      const peak = [...blocks].sort((a, b) => b.u - a.u)[0]
      const dip = [...blocks].sort((a, b) => a.u - b.u)[0]
      if (peak.u >= 0.85) {
        out.push(`${WEEKDAYS[peak.day]} ${hourLabel(peak.hour)}–${hourLabel(peak.hour + 2)} is nearly always full (${pct(peak.u)}) — worth adding cover, or nudging regulars to quieter times.`)
      } else {
        out.push(`Your peak is ${WEEKDAYS[peak.day]} ${hourLabel(peak.hour)}–${hourLabel(peak.hour + 2)} at ${pct(peak.u)} booked.`)
      }
      if (dip.u <= 0.3 && (dip.day !== peak.day || dip.hour !== peak.hour)) {
        out.push(`${WEEKDAYS[dip.day]} ${hourLabel(dip.hour)}–${hourLabel(dip.hour + 2)} is your quietest slot (${pct(dip.u)} booked) — a good window for an off-peak offer, admin, or a shorter day.`)
      }
    }
  } else {
    const days = hm.byDay.filter((d) => d.visits > 0)
    const busiest = [...days].sort((a, b) => b.visits - a.visits)[0]
    const quietest = [...days].sort((a, b) => a.visits - b.visits)[0]
    out.push(`${WEEKDAYS[busiest.day]} is your busiest day (${Math.round(busiest.visits / hm.weeks)} appointments a week on average).`)
    if (quietest.day !== busiest.day) out.push(`${WEEKDAYS[quietest.day]} is the quietest.`)
    out.push('Set opening hours and staff hours to see how full each slot really is.')
  }
  return out
}

// ---------- per staff ----------

export type StaffRow = {
  id: string
  name: string
  visits: number
  bookedHours: number
  utilisation: number | null
  clients: number
  revenue: number
  employed: boolean
}

export function perStaff(
  bookings: InsightBooking[],
  start: Date,
  end: Date,
  inputs: CapacityInputs,
  now: Date,
  firstVisits: Map<string, number>
): StaffRow[] {
  return inputs.staff
    .map((s) => {
      const sum = summarise(bookings, start, end, inputs, now, firstVisits, new Set([s.id]))
      return {
        id: s.id,
        name: s.name,
        visits: sum.visits,
        bookedHours: sum.bookedMins / 60,
        utilisation: sum.utilisation,
        clients: sum.clients,
        revenue: sum.revenue,
        employed: s.employment_status === 'employed',
      }
    })
    .sort((a, b) => b.visits - a.visits)
}

