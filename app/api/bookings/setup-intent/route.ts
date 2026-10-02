import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createNoShowSetupIntent } from '@/lib/stripeNoShow'

// Public route, called from the customer-facing booking form (no auth — a
// customer booking an appointment isn't a TrimBooking account holder) only
// when the shop they're booking with has no-show protection turned on.
// Only ever creates a SetupIntent (save a card, charge nothing) — never a
// charge.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const tenantId = body.tenantId as string | undefined
  const customerName = (body.customerName as string | undefined)?.trim()
  const customerEmail = (body.customerEmail as string | undefined)?.trim()

  if (!tenantId || !customerName || !customerEmail) {
    return NextResponse.json({ error: 'Missing tenantId, customerName or customerEmail.' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, no_show_protection_enabled, disabled')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant || tenant.disabled || !tenant.no_show_protection_enabled) {
    return NextResponse.json({ error: 'No-show protection is not enabled for this shop.' }, { status: 400 })
  }

  const result = await createNoShowSetupIntent({ tenantId, customerName, customerEmail })
  if (!result) {
    return NextResponse.json({ error: 'Could not start card setup.' }, { status: 500 })
  }

  return NextResponse.json(result)
}
