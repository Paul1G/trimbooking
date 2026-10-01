'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type CustomerVisit = {
  id: string
  start_time: string
  service_name: string | null
  staff_name: string | null
}

export type CustomerHistory = {
  loading: boolean
  error: string
  totalVisits: number
  recentVisits: CustomerVisit[]
  customerSince: string | null
}

const EMPTY: CustomerHistory = {
  loading: false,
  error: '',
  totalVisits: 0,
  recentVisits: [],
  customerSince: null,
}

const RECENT_VISIT_LIMIT = 5

type BookingRow = {
  id: string
  start_time: string
  services: { name: string } | null
  staff: { name: string } | null
}

// Looks up a customer's past confirmed visits at this business, by email —
// the same key the Customers page groups by. Used to show "last few visits"
// and "customer since" wherever the owner clicks a booking in a calendar.
// Scoped to the whole tenant (not just one staff member or date range), so
// it reflects everywhere this customer has actually been seen.
export function useCustomerHistory(
  tenantId: string | null,
  customerEmail: string | null,
  excludeBookingId?: string
): CustomerHistory {
  const [state, setState] = useState<CustomerHistory>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!tenantId || !customerEmail) {
        setState(EMPTY)
        return
      }

      setState((s) => ({ ...s, loading: true, error: '' }))

      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_time, status, services:service_id(name), staff:staff_id(name)')
        .eq('tenant_id', tenantId)
        .ilike('customer_email', customerEmail)
        .eq('status', 'confirmed')
        .order('start_time', { ascending: false })

      if (cancelled) return

      if (error) {
        setState({ ...EMPTY, error: error.message })
        return
      }

      const now = new Date()
      const past = ((data as unknown as BookingRow[]) || []).filter(
        (b) => b.id !== excludeBookingId && new Date(b.start_time) <= now
      )

      const recentVisits: CustomerVisit[] = past.slice(0, RECENT_VISIT_LIMIT).map((b) => ({
        id: b.id,
        start_time: b.start_time,
        service_name: b.services?.name ?? null,
        staff_name: b.staff?.name ?? null,
      }))

      const customerSince = past.length > 0 ? past[past.length - 1].start_time : null

      setState({
        loading: false,
        error: '',
        totalVisits: past.length,
        recentVisits,
        customerSince,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantId, customerEmail, excludeBookingId])

  return state
}

// "2 years 3 months", "4 months", "3 weeks" — how long someone has been a
// customer, from their first confirmed visit to now.
export function formatCustomerTenure(sinceIso: string, now: Date = new Date()): string {
  const since = new Date(sinceIso)
  let months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth())
  if (now.getDate() < since.getDate()) months -= 1
  months = Math.max(0, months)

  if (months >= 12) {
    const years = Math.floor(months / 12)
    const remMonths = months % 12
    const yearPart = `${years} year${years === 1 ? '' : 's'}`
    return remMonths > 0 ? `${yearPart} ${remMonths} month${remMonths === 1 ? '' : 's'}` : yearPart
  }
  if (months >= 1) {
    return `${months} month${months === 1 ? '' : 's'}`
  }
  const days = Math.max(1, Math.round((now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)))
  if (days >= 7) {
    const weeks = Math.round(days / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'}`
  }
  return `${days} day${days === 1 ? '' : 's'}`
}
