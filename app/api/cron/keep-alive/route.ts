import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Supabase pauses free-plan projects after 7 days with no database activity.
// This makes sure there's always at least one real query against the database
// every day, regardless of whether the other cron jobs find anything to do —
// a stopgap while running on the free plan with no paying customers yet.
// Once this project is upgraded to a paid Supabase plan, this route (and its
// entry in vercel.json) can be deleted — paid projects are never paused.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin.from('tenants').select('id').limit(1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() })
}
