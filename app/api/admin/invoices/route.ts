import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

// Lists every invoice raised so far, most recent first, with the shop's name
// and subdomain attached so the admin panel doesn't need a second lookup per
// row. This is read-only visibility into what's owed and what's been paid —
// invoices themselves are only ever created by signup or the monthly cron.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data: invoices, error } = await supabaseAdmin
    .from('invoices')
    .select('*, tenants(name, subdomain)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices: invoices || [] })
}
