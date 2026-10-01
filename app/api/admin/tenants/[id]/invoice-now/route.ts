import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'
import { startOfNextMonth } from '@/lib/billing'
import { invoiceTenantForMonth } from '@/lib/billingCron'

// Admin-triggered equivalent of one iteration of the monthly cron
// (app/api/cron/send-invoices), for a single tenant — mainly for testing the
// billing flow on demand instead of waiting for next_invoice_at, but also
// useful for manually invoicing a shop early for any reason. Raises a real
// full-month invoice regardless of next_invoice_at or whether this tenant is
// marked "paid" yet, and (same as the cron) pushes next_invoice_at on to next
// month either way.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { id } = await params

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, subdomain, owner_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !tenant) {
    return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
  }

  const now = new Date()
  const outcome = await invoiceTenantForMonth(tenant, now)

  await supabaseAdmin
    .from('tenants')
    .update({ next_invoice_at: startOfNextMonth(now).toISOString() })
    .eq('id', tenant.id)

  return NextResponse.json({ ok: true, ...outcome })
}
