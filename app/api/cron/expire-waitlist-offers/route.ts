import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendWaitlistOfferEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

type ExpiredRow = {
  tenant_id: string
  staff_id: string
  offered_slot_start: string
  offered_slot_end: string
}

// Runs on a schedule (vercel.json) rather than at the exact 24h mark —
// offers may sit expired for up to one sweep interval before the next
// person in line is found, which is an acceptable trade-off against the
// cost of a much more frequent cron.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: expired, error: expireError } = await supabaseAdmin.rpc('waitlist_expire_stale_offers')

  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 })
  }

  let offered = 0

  for (const row of (expired || []) as ExpiredRow[]) {
    const { data: matchRows } = await supabaseAdmin.rpc('match_waitlist_for_cancellation', {
      p_tenant_id: row.tenant_id,
      p_staff_id: row.staff_id,
      p_slot_start: row.offered_slot_start,
      p_slot_end: row.offered_slot_end,
    })
    const match = matchRows?.[0]
    if (!match) continue

    const [{ data: tenant }, { data: staff }, { data: service }] = await Promise.all([
      supabaseAdmin.from('tenants').select('name, subdomain').eq('id', row.tenant_id).maybeSingle(),
      supabaseAdmin.from('staff').select('name').eq('id', row.staff_id).maybeSingle(),
      supabaseAdmin.from('services').select('name').eq('id', match.service_id).maybeSingle(),
    ])

    if (!tenant) continue

    const result = await sendWaitlistOfferEmail({
      tenantName: tenant.name,
      subdomain: tenant.subdomain,
      customerEmail: match.customer_email,
      customerName: match.customer_name,
      serviceName: service?.name,
      staffName: staff?.name,
      offeredStart: match.offered_slot_start,
      offerToken: match.offer_token,
    })

    if (!result.error) offered += 1
  }

  return NextResponse.json({ expired: (expired || []).length, offered })
}
