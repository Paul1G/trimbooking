import { createClient } from '@supabase/supabase-js'

// Server-only client using the service role key. This bypasses RLS, so it
// must NEVER be imported into a client component — it's for trusted backend
// operations only (e.g. provisioning a new tenant + auth user during signup).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
