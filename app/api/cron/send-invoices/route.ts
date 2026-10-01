import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { startOfNextMonth } from '@/lib/billing'
import { invoiceTenantForMonth } from '@/lib/billingCron'

export const dynamic = 'force-dynamic'

// Runs on the 1st of each month. Invoices every active (paid, not disabled)
// shop in advance for the month ahead, based on how many staff they have
// right now — staff added mid-month don't change what's owed until the
// following month's invoice, since this only runs once a month.
//
// A shop is only billed once we've marked it "paid" in the admin panel —
// shops still on their free trial are skipped, same as check-trials treats
// paid as the signal that a shop has moved past the trial.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, subdomain, owner_id, paid, disabled, next_invoice_at')
    .eq('paid', true)
    .eq('disabled', false)
    .lte('next_invoice_at', now.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { subdomain: string; staffCount: number; amountPence: number; emailed: boolean }[] = []

  for (const tenant of tenants || []) {
    const outcome = await invoiceTenantForMonth(tenant, now)

    // Move this tenant's next invoice on to the month after, regardless of
    // whether the email sent — the invoice row itself is what admin sees as
    // outstanding, and this stops the same tenant being billed twice if the
    // cron is re-run before the month is out.
    await supabaseAdmin
      .from('tenants')
      .update({ next_invoice_at: startOfNextMonth(now).toISOString() })
      .eq('id', tenant.id)

    results.push({ subdomain: tenant.subdomain, ...outcome })
  }

  return NextResponse.json({ ranAt: now.toISOString(), invoiced: results })
}
