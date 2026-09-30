import { supabaseAdmin } from './supabaseAdmin'

// Gate for the platform-level /admin area — deliberately separate from any
// tenant's owner_id, since this covers every shop on TrimBooking, not just
// one. Checks the bearer token against a plain email allowlist rather than
// a database flag, so access can be changed by editing an env var alone.
export async function requireAdmin(req: Request): Promise<{ email: string } | null> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user?.email) return null

  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!allowlist.includes(data.user.email.toLowerCase())) return null

  return { email: data.user.email }
}
