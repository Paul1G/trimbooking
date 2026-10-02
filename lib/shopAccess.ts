// A shop's dashboard has two tiers of access: the account owner (tenants.owner_id),
// and any staff member the owner has promoted to "admin" (staff.is_shop_admin).
// Admins get the day-to-day operational dashboard — services, staff, hours,
// bookings, customers, holidays, branding, no-show settings — but not billing,
// and not another staff member's individual calendar/earnings view. Only the
// owner can grant or revoke admin (enforced server-side by the
// owner_set_staff_admin RPC, not just by hiding the control in the UI).
//
// This helper is the single place that decides owner-vs-admin-vs-neither, so
// every dashboard page (and any server route that needs the same check) stays
// consistent rather than re-deriving it with its own owner_id comparison.
//
// Works with either the browser client (lib/supabase) or the service-role
// client (lib/supabaseAdmin) — both expose the same .from(...) query builder
// shape, which is all this needs.
export type ShopRole = 'owner' | 'admin'

// Intentionally untyped return: this just needs to accept both the browser
// and service-role clients, which have incompatible generic Database type
// params for a stricter signature.
type MinimalSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
}

export async function resolveShopRole(
  db: MinimalSupabase,
  tenant: { id: string; owner_id: string | null },
  userId: string
): Promise<ShopRole | null> {
  if (tenant.owner_id && tenant.owner_id === userId) {
    return 'owner'
  }

  const { data: staffRow } = await db
    .from('staff')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('user_id', userId)
    .eq('is_shop_admin', true)
    .maybeSingle()

  return staffRow ? 'admin' : null
}
