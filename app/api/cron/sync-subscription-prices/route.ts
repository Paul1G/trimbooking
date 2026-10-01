import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { syncSubscriptionPrice } from '@/lib/stripeBilling'

export const dynamic = 'force-dynamic'

// Runs daily. A subscription's monthly amount is set once, at checkout, from
// the staff count at that moment — if staff are added or removed afterwards,
// nothing updates it automatically. This keeps it matching current staff
// count (proration_behavior: 'none', so the new amount only applies from the
// next renewal, never a surprise mid-cycle charge) — the same staleness
// tradeoff the regular invoice-per-period model already has, where a
// mid-month staff change only shows up on the following month's invoice.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, subdomain, stripe_subscription_item_id')
    .eq('billing_method', 'subscription')
    .eq('disabled', false)
    .not('stripe_subscription_item_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { subdomain: string; staffCount: number; synced: boolean }[] = []

  for (const tenant of tenants || []) {
    const { count: staffCount } = await supabaseAdmin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const synced = await syncSubscriptionPrice(tenant.stripe_subscription_item_id as string, staffCount || 0)
    results.push({ subdomain: tenant.subdomain, staffCount: staffCount || 0, synced })
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), results })
}
