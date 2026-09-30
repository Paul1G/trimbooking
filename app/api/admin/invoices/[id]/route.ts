import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'
import { sendInvoiceEmail } from '@/lib/email'

// Marks an invoice paid/pending/void, or resends its invoice email — the
// only two actions the admin panel needs since invoices are otherwise
// created automatically (signup, or the monthly cron).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('*, tenants(id, name, subdomain, owner_id)')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }

  if (body.resend) {
    const tenant = invoice.tenants as { id: string; name: string; subdomain: string; owner_id: string | null } | null
    if (!tenant?.owner_id) {
      return NextResponse.json({ error: 'This shop has no owner account to email.' }, { status: 400 })
    }
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
    const ownerEmail = userData.user?.email
    if (!ownerEmail) {
      return NextResponse.json({ error: 'Could not find an email address for this shop\'s owner.' }, { status: 400 })
    }

    const result = await sendInvoiceEmail({
      ownerEmail,
      shopName: tenant.name,
      subdomain: tenant.subdomain,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      staffCount: invoice.staff_count,
      amountPence: invoice.amount_pence,
      isProration: invoice.is_proration,
    })
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    await supabaseAdmin
      .from('invoices')
      .update({ status: invoice.status === 'pending' ? 'sent' : invoice.status, sent_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.status === 'string' && ['pending', 'sent', 'paid', 'void'].includes(body.status)) {
    update.status = body.status
    update.paid_at = body.status === 'paid' ? new Date().toISOString() : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('invoices').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
