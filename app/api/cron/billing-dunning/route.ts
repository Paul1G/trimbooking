import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendPaymentReminderEmail, sendPaymentGraceExpiredEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const GRACE_DAYS = 5

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

// Runs daily. Chases unpaid recurring invoices once they're past due: a
// daily reminder email for 5 days, then — if it's still unpaid — the shop
// is switched off and marked unpaid, same as a trial running out. Scoped to
// tenants already marked "paid" (i.e. past their trial), since the initial
// trial-ending invoice has its own hard cutoff at trial_ends_at
// (app/api/cron/check-trials) rather than this grace period.
//
// Paying the invoice at any point — including after the shop's been
// switched off — reactivates it automatically via the billing webhook
// (app/api/stripe/webhook/billing), which flips both `paid` and `disabled`.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const { data: overdueInvoices, error } = await supabaseAdmin
    .from('invoices')
    .select('id, tenant_id, amount_pence, stripe_hosted_invoice_url, due_date, last_reminder_sent_at, tenants(id, name, subdomain, owner_id, paid, disabled)')
    .eq('status', 'sent')
    .not('due_date', 'is', null)
    .lt('due_date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { subdomain: string; daysOverdue: number; action: 'reminder' | 'disabled' | 'skipped'; emailed: boolean }[] = []

  for (const inv of overdueInvoices || []) {
    const tenant = Array.isArray(inv.tenants) ? inv.tenants[0] : inv.tenants
    if (!tenant || !tenant.paid || tenant.disabled) {
      continue // not an active paying tenant, or already switched off
    }

    const daysOverdue = daysBetween(new Date(inv.due_date), now)
    let ownerEmail: string | null = null
    if (tenant.owner_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
      ownerEmail = userData.user?.email || null
    }

    if (daysOverdue > GRACE_DAYS) {
      await supabaseAdmin.from('tenants').update({ paid: false, disabled: true }).eq('id', tenant.id)

      let emailed = false
      if (ownerEmail) {
        const result = await sendPaymentGraceExpiredEmail({
          ownerEmail,
          shopName: tenant.name,
          subdomain: tenant.subdomain,
          amountPence: inv.amount_pence,
          payLink: inv.stripe_hosted_invoice_url,
        })
        emailed = !result.error
      }
      results.push({ subdomain: tenant.subdomain, daysOverdue, action: 'disabled', emailed })
      continue
    }

    // At most one reminder per day, in case this cron is re-run.
    const alreadyRemindedToday = inv.last_reminder_sent_at && inv.last_reminder_sent_at.slice(0, 10) === today
    if (alreadyRemindedToday) {
      results.push({ subdomain: tenant.subdomain, daysOverdue, action: 'skipped', emailed: false })
      continue
    }

    let emailed = false
    if (ownerEmail) {
      const result = await sendPaymentReminderEmail({
        ownerEmail,
        shopName: tenant.name,
        subdomain: tenant.subdomain,
        amountPence: inv.amount_pence,
        payLink: inv.stripe_hosted_invoice_url,
        daysOverdue,
        graceDaysLeft: GRACE_DAYS - daysOverdue + 1,
      })
      emailed = !result.error
    }
    await supabaseAdmin.from('invoices').update({ last_reminder_sent_at: now.toISOString() }).eq('id', inv.id)
    results.push({ subdomain: tenant.subdomain, daysOverdue, action: 'reminder', emailed })
  }

  return NextResponse.json({ ranAt: now.toISOString(), results })
}
