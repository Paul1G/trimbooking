// Shared logic for turning a customer's past confirmed visits into a
// rebooking cadence — used by both the owner's customer-history page (to
// show "usually every ~6 weeks, due 12 October") and the rebook-nudge cron
// (to decide who's actually overdue and should get an email).

export type PastVisit = {
  id: string
  start_time: string
}

export type RebookInfo = {
  visitCount: number
  lastVisit: string | null
  avgIntervalDays: number | null
  nextExpectedVisit: string | null
}

// Computes a customer's typical rebooking interval from their past confirmed
// visits. Needs at least two visits to have a gap to measure — with only one
// visit there's nothing yet to compare it to, so no cadence can be inferred.
export function computeRebookInfo(pastVisits: PastVisit[]): RebookInfo {
  const sorted = [...pastVisits].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  if (sorted.length === 0) {
    return { visitCount: 0, lastVisit: null, avgIntervalDays: null, nextExpectedVisit: null }
  }

  const lastVisit = sorted[sorted.length - 1].start_time

  if (sorted.length < 2) {
    return { visitCount: 1, lastVisit, avgIntervalDays: null, nextExpectedVisit: null }
  }

  const dayMs = 24 * 60 * 60 * 1000
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].start_time).getTime()
    const curr = new Date(sorted[i].start_time).getTime()
    intervals.push((curr - prev) / dayMs)
  }
  const avgIntervalDays = intervals.reduce((sum, n) => sum + n, 0) / intervals.length
  const nextExpectedVisit = new Date(new Date(lastVisit).getTime() + avgIntervalDays * dayMs).toISOString()

  return { visitCount: sorted.length, lastVisit, avgIntervalDays, nextExpectedVisit }
}

// "Due" means today has reached (or passed) their expected next-visit date.
export function isDueToRebook(info: RebookInfo, now: Date = new Date()): boolean {
  if (!info.nextExpectedVisit) return false
  return now.getTime() >= new Date(info.nextExpectedVisit).getTime()
}

export function formatIntervalDays(days: number): string {
  const weeks = days / 7
  if (weeks >= 3) {
    const rounded = Math.round(weeks)
    return `~${rounded} week${rounded === 1 ? '' : 's'}`
  }
  const rounded = Math.round(days)
  return `~${rounded} day${rounded === 1 ? '' : 's'}`
}
