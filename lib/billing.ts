// Pricing: £20.00/month base fee, which includes up to 4 staff members, then
// +£2.50/month for each staff member beyond that. All amounts here are in
// pence to avoid floating point rounding issues; format with formatPence()
// when displaying.

export const BASE_FEE_PENCE = 2000 // £20.00
export const INCLUDED_STAFF = 4
export const EXTRA_STAFF_FEE_PENCE = 250 // £2.50

export function monthlyAmountPence(staffCount: number): number {
  const extraStaff = Math.max(0, staffCount - INCLUDED_STAFF)
  return BASE_FEE_PENCE + extraStaff * EXTRA_STAFF_FEE_PENCE
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

// Start of the next calendar month, in UTC, at midnight — used both as an
// invoice's period_end and as the tenant's next_invoice_at.
export function startOfNextMonth(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

export function startOfMonth(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
}

function daysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// The invoice raised at signup: covers from today through the end of the
// current calendar month, charged as a fraction of that month's fee based on
// how many days of the month remain (today included).
export function prorateSignupInvoice(signupDate: Date, staffCount: number) {
  const periodStart = new Date(Date.UTC(signupDate.getUTCFullYear(), signupDate.getUTCMonth(), signupDate.getUTCDate()))
  const periodEndExclusive = startOfNextMonth(signupDate) // first day of next month
  const totalDaysInMonth = daysInMonth(signupDate)
  const daysRemaining = Math.round(
    (periodEndExclusive.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
  )

  const fullMonthAmount = monthlyAmountPence(staffCount)
  const amountPence = Math.round((fullMonthAmount * daysRemaining) / totalDaysInMonth)

  // period_end is inclusive (last day of the month), matching how a full
  // month's invoice reports its period.
  const periodEndInclusive = new Date(periodEndExclusive.getTime() - 24 * 60 * 60 * 1000)

  return {
    periodStart: toDateOnly(periodStart),
    periodEnd: toDateOnly(periodEndInclusive),
    staffCount,
    amountPence,
    isProration: true,
    daysRemaining,
    totalDaysInMonth,
  }
}

// A regular full-month invoice, raised in advance on the 1st for the coming
// calendar month.
export function fullMonthInvoice(monthStart: Date, staffCount: number) {
  const periodStart = startOfMonth(monthStart)
  const periodEndExclusive = startOfNextMonth(monthStart)
  const periodEndInclusive = new Date(periodEndExclusive.getTime() - 24 * 60 * 60 * 1000)

  return {
    periodStart: toDateOnly(periodStart),
    periodEnd: toDateOnly(periodEndInclusive),
    staffCount,
    amountPence: monthlyAmountPence(staffCount),
    isProration: false,
  }
}
