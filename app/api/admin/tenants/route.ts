import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Owner emails live in auth.users, not the tenants table, so look each one
  // up via the admin API rather than joining across schemas.
  const withOwners = await Promise.all(
    (tenants || []).map(async (t) => {
      let ownerEmail: string | null = null
      if (t.owner_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(t.owner_id)
        ownerEmail = userData.user?.email || null
      }
      return { ...t, owner_email: ownerEmail }
    })
  )

  return NextResponse.json({ tenants: withOwners })
}
