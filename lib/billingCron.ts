import { supabaseAdmin } from './supabaseAdmin'
import { sendInvoiceEmail } from './email'
import { fullMonthInvoice } from './billing'
import { getOrCreateStripeCustomer, createStripeInvoice } from './stripeBilling'

// Shared by app/api/cron/send-invoices (the monthly scheduled run) and
// app/api/admin/tenants/[id]/invoice-now (an admin-triggered one-off run for
// a single tenant, mainly for testing) — raises one regular, full-month
// invoice for a tenant: a DB row, a real Stripe invoice when billing is
// configured, and the email carrying its pay link.
export async function invoiceTenantForMonth(tenant: {
  id: string
  name: string
  subdomain: string
  owner_id: string | null
}, now: Date = new Date()) {
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
              due_date: stripeInvoice.dueDate,
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

  return { staffCount: invoice.staffCount, amountPence: invoice.amountPence, emailed }
}
