import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendInvoiceEmail } from '@/lib/email'
import { prorateSignupInvoice } from '@/lib/billing'
import { getOrCreateStripeCustomer, createStripeInvoice } from '@/lib/stripeBilling'

export const dynamic = 'force-dynamic'

// Runs daily. A shop's 30 days are genuinely free — no invoice exists until
// this raises one, ~7 days before trial_ends_at, covering from the trial's
// end through the rest of that calendar month (same proration math as the
// old signup-time invoice, just anchored to trial_ends_at instead of
// sign-up day). This gives the owner a week's notice and a working Stripe
// pay link before check-trials would otherwise disable them.
//
// Paying this invoice (via /api/stripe/webhook/billing's invoice.paid
// handler) automatically marks the tenant "paid", which is both what stops
// check-trials disabling it and what lets the regular monthly cron
// (send-invoices) pick it up from here on — no admin step required, though
// marking a tenant "paid" by hand in /admin still works at any time too.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, subdomain, owner_id, trial_ends_at')
    .eq('paid', false)
    .eq('disabled', false)
    .is('trial_invoice_sent_at', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', sevenDaysOut.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { subdomain: string; staffCount: number; amountPence: number; emailed: boolean }[] = []

  for (const tenant of tenants || []) {
    const { count: staffCount } = await supabaseAdmin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const proration = prorateSignupInvoice(new Date(tenant.trial_ends_at), staffCount || 0)

    const { data: invoiceRow } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenant.id,
        period_start: proration.periodStart,
        period_end: proration.periodEnd,
        staff_count: proration.staffCount,
        amount_pence: proration.amountPence,
        is_proration: true,
      })
      .select('id')
      .maybeSingle()

    let emailed = false
    if (tenant.owner_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
      const ownerEmail = userData.user?.email
      if (ownerEmail) {
        let payLink: string | null = null
        const customerId = await getOrCreateStripeCustomer(tenant.id, tenant.name, ownerEmail)
        if (customerId) {
          const stripeInvoice = await createStripeInvoice({
            customerId,
            amountPence: proration.amountPence,
            description: `TrimBooking — ${tenant.name} (${proration.periodStart} to ${proration.periodEnd}, trial ending)`,
          })
          if (stripeInvoice && invoiceRow?.id) {
            payLink = stripeInvoice.hostedInvoiceUrl
            await supabaseAdmin
              .from('invoices')
              .update({
                stripe_invoice_id: stripeInvoice.id,
                stripe_hosted_invoice_url: stripeInvoice.hostedInvoiceUrl,
                stripe_status: stripeInvoice.status,
                due_date: stripeInvoice.dueDate,
              })
              .eq('id', invoiceRow.id)
          }
        }

        const result = await sendInvoiceEmail({
          ownerEmail,
          shopName: tenant.name,
          subdomain: tenant.subdomain,
          periodStart: proration.periodStart,
          periodEnd: proration.periodEnd,
          staffCount: proration.staffCount,
          amountPence: proration.amountPence,
          isProration: true,
          payLink,
          trialEndsAt: tenant.trial_ends_at,
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

    // Mark this sent regardless of whether the email itself succeeded, same
    // reasoning as send-invoices advancing next_invoice_at unconditionally —
    // otherwise a transient email failure would cause this to retry (and
    // re-raise a Stripe invoice) every day until the trial ends.
    await supabaseAdmin
      .from('tenants')
      .update({ trial_invoice_sent_at: now.toISOString() })
      .eq('id', tenant.id)

    results.push({ subdomain: tenant.subdomain, staffCount: proration.staffCount, amountPence: proration.amountPence, emailed })
  }

  return NextResponse.json({ ranAt: now.toISOString(), invoiced: results })
}
