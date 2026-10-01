import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendInvoiceEmail } from '@/lib/email'
import { fullMonthInvoice, startOfNextMonth } from '@/lib/billing'
import { getOrCreateStripeCustomer, createStripeInvoice } from '@/lib/stripeBilling'

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
    const { count: staffCount } = await supabaseAdmin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const invoice = fullMonthInvoice(now, staffCount || 0)

    const { data: invoiceRow } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenant.id,
        period_start: invoice.periodStart,
        period_end: invoice.periodEnd,
        staff_count: invoice.staffCount,
        amount_pence: invoice.amountPence,
        is_proration: false,
      })
      .select('id')
      .maybeSingle()

    let emailed = false
    if (tenant.owner_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
      const ownerEmail = userData.user?.email
      if (ownerEmail) {
        // Raise a real, payable Stripe invoice when platform billing is
        // configured — falls back to no pay link (old behaviour) if Stripe
        // isn't set up or the call fails, same as the signup invoice above.
        let payLink: string | null = null
        const customerId = await getOrCreateStripeCustomer(tenant.id, tenant.name, ownerEmail)
        if (customerId) {
          const stripeInvoice = await createStripeInvoice({
            customerId,
            amountPence: invoice.amountPence,
            description: `TrimBooking — ${tenant.name} (${invoice.periodStart} to ${invoice.periodEnd})`,
          })
          if (stripeInvoice && invoiceRow?.id) {
            payLink = stripeInvoice.hostedInvoiceUrl
            await supabaseAdmin
              .from('invoices')
              .update({
                stripe_invoice_id: stripeInvoice.id,
                stripe_hosted_invoice_url: stripeInvoice.hostedInvoiceUrl,
                stripe_status: stripeInvoice.status,
              })
              .eq('id', invoiceRow.id)
          }
        }

        const result = await sendInvoiceEmail({
          ownerEmail,
          shopName: tenant.name,
          subdomain: tenant.subdomain,
          periodStart: invoice.periodStart,
          periodEnd: invoice.periodEnd,
          staffCount: invoice.staffCount,
          amountPence: invoice.amountPence,
          isProration: false,
          payLink,
        })
        emailed = !result.error
        if (emailed && invoiceRow?.id) {
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', invoiceRow.id)
        }
      }
    }

    // Move this tenant's next invoice on to the month after, regardless of
    // whether the email sent — the invoice row itself is what admin sees as
    // outstanding, and this stops the same tenant being billed twice if the
    // cron is re-run before the month is out.
    await supabaseAdmin
      .from('tenants')
      .update({ next_invoice_at: startOfNextMonth(now).toISOString() })
      .eq('id', tenant.id)

    results.push({ subdomain: tenant.subdomain, staffCount: invoice.staffCount, amountPence: invoice.amountPence, emailed })
  }

  return NextResponse.json({ ranAt: now.toISOString(), invoiced: results })
}
