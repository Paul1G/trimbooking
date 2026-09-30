import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendTrialEndedEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Runs daily. Any shop that isn't marked paid and whose 30-day trial has
// passed gets switched off — this reuses the same `disabled` flag the admin
// panel's Enable/Disable toggle uses, so every existing check (public pages,
// owner login/dashboard, staff portal) already enforces it. The admin panel
// is where a trial gets extended or a shop gets marked as paid, either of
// which stops it being caught here again.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: expired, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, subdomain, owner_id, paid, disabled, trial_ends_at')
    .eq('paid', false)
    .eq('disabled', false)
    .lt('trial_ends_at', new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { subdomain: string; emailed: boolean }[] = []

  for (const tenant of expired || []) {
    await supabaseAdmin.from('tenants').update({ disabled: true }).eq('id', tenant.id)

    let emailed = false
    if (tenant.owner_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
      const ownerEmail = userData.user?.email
      if (ownerEmail) {
        const result = await sendTrialEndedEmail({ ownerEmail, shopName: tenant.name, subdomain: tenant.subdomain })
        emailed = !result.error
      }
    }
    results.push({ subdomain: tenant.subdomain, emailed })
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), disabled: results })
}
