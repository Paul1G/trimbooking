import type { SupabaseClient } from '@supabase/supabase-js'

// Call this right after a booking's status becomes 'cancelled' or
// 'declined' (freeing up [slotStart, slotEnd) with that staff member).
// Looks for the oldest waiting customer whose service fits the freed
// window (match_waitlist_for_cancellation, supabase/migrations/20261003_waitlist.sql),
// and if one is found, emails them the offer. Never throws — a failure
// here shouldn't block the cancellation itself, same as the existing
// fire-and-forget booking-status emails.
export async function offerFreedSlotToWaitlist({
  supabase,
  tenantId,
  staffId,
  slotStart,
  slotEnd,
  tenantName,
  subdomain,
  staffName,
}: {
  supabase: SupabaseClient
  tenantId: string
  staffId: string
  slotStart: string
  slotEnd: string
  tenantName: string
  subdomain: string
  staffName?: string
}) {
  try {
    const { data, error } = await supabase.rpc('match_waitlist_for_cancellation', {
      p_tenant_id: tenantId,
      p_staff_id: staffId,
      p_slot_start: slotStart,
      p_slot_end: slotEnd,
    })

    if (error || !data || data.length === 0) return

    const match = data[0]

    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', match.service_id)
      .maybeSingle()

    await fetch('/api/send-waitlist-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantName,
        subdomain,
        customerEmail: match.customer_email,
        customerName: match.customer_name,
        serviceName: service?.name,
        staffName,
        offeredStart: match.offered_slot_start,
        offerToken: match.offer_token,
      }),
    })
  } catch {
    // Best-effort — the cancellation itself has already succeeded.
  }
}
