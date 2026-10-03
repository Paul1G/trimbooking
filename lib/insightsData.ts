'use client'

// Loads the rows lib/insights.ts works on, for the two places insights are
// shown. Supabase/PostgREST returns at most 1,000 rows per request, so a busy
// shop's full history has to be paged through — a single .select() would
// quietly stop at 1,000 and every total would be wrong.

import { supabase } from '@/lib/supabase'
import type { CapacityInputs, HolidayRow, InsightBooking, StaffSchedule } from '@/lib/insights'

const PAGE = 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data as T[]) || []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

type ShopBookingRow = {
  id: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  start_time: string
  end_time: string
  status: string
  no_show: boolean | null
  amount_paid: number | null
  staff_id: string | null
  services: { name: string; price: number | null } | null
}

// Whole shop — for the owner/admin Insights page. Customers are keyed by
// email, the same way the Customers page groups them.
export async function loadShopInsights(
  tenant: { id: string; opening_hours: Record<string, [string, string]> | null }
): Promise<{ bookings: InsightBooking[]; capacity: CapacityInputs }> {
  const [rows, staffRes, holRes] = await Promise.all([
    fetchAllPages<ShopBookingRow>((from, to) =>
      supabase
        .from('bookings')
        .select('id, customer_name, customer_email, customer_phone, start_time, end_time, status, no_show, amount_paid, staff_id, services:service_id(name, price)')
        .eq('tenant_id', tenant.id)
        .order('start_time', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    ),
    supabase.from('staff').select('id, name, working_hours, breaks').eq('tenant_id', tenant.id).order('name'),
    supabase.from('staff_holidays').select('staff_id, start_date, end_date').eq('tenant_id', tenant.id),
  ])

  const bookings: InsightBooking[] = rows.map((b) => {
    const email = (b.customer_email || '').trim()
    return {
      id: b.id,
      start: new Date(b.start_time),
      end: new Date(b.end_time || b.start_time),
      status: b.status,
      noShow: Boolean(b.no_show),
      price: b.services?.price ?? null,
      paid: b.amount_paid,
      customerKey: email ? email.toLowerCase() : `name:${(b.customer_name || '').trim().toLowerCase()}`,
      customerName: b.customer_name || email || 'Unknown',
      customerEmail: email || null,
      customerPhone: b.customer_phone,
      staffId: b.staff_id,
      serviceName: b.services?.name ?? null,
    }
  })

  return {
    bookings,
    capacity: {
      staff: (staffRes.data as StaffSchedule[]) || [],
      shopHours: tenant.opening_hours,
      holidays: (holRes.data as HolidayRow[]) || [],
    },
  }
}

type MyBookingRow = {
  id: string
  customer_name: string | null
  start_time: string
  end_time: string
  status: string
  amount_paid: number | null
  service_name: string | null
  service_price: number | null
}

// One staff member's own data, through the same SECURITY DEFINER function
// their portal already uses (staff_get_my_bookings), so they only ever see
// their own bookings and earnings. That function doesn't return customer
// contact details, so clients are keyed by name here.
export async function loadMyInsights(
  tenant: { id: string; opening_hours: Record<string, [string, string]> | null },
  staffId: string
): Promise<{ bookings: InsightBooking[]; capacity: CapacityInputs }> {
  const rangeStart = new Date(2000, 0, 1).toISOString()
  const rangeEnd = new Date(new Date().getFullYear() + 2, 0, 1).toISOString()

  const [rows, staffRes, holRes] = await Promise.all([
    fetchAllPages<MyBookingRow>((from, to) =>
      supabase
        .rpc('staff_get_my_bookings', { p_tenant_id: tenant.id, p_start: rangeStart, p_end: rangeEnd })
        .range(from, to)
    ),
    supabase.from('staff').select('id, name, working_hours, breaks').eq('id', staffId),
    supabase.from('staff_holidays').select('staff_id, start_date, end_date').eq('tenant_id', tenant.id),
  ])

  const bookings: InsightBooking[] = rows.map((b) => ({
    id: b.id,
    start: new Date(b.start_time),
    end: new Date(b.end_time || b.start_time),
    status: b.status,
    noShow: false,
    price: b.service_price,
    paid: b.amount_paid,
    customerKey: `name:${(b.customer_name || '').trim().toLowerCase()}`,
    customerName: b.customer_name || 'Unknown',
    customerEmail: null,
    customerPhone: null,
    staffId,
    serviceName: b.service_name,
  }))

  const holidays = ((holRes.data as HolidayRow[]) || []).filter((h) => h.staff_id == null || h.staff_id === staffId)

  return {
    bookings,
    capacity: {
      staff: (staffRes.data as StaffSchedule[]) || [],
      shopHours: tenant.opening_hours,
      holidays,
    },
  }
}
