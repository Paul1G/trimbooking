-- Lets the account owner promote a staff member to "shop admin": access to
-- the day-to-day dashboard (services, staff, hours, bookings, customers,
-- holidays, branding, no-show settings) without being the actual owner.
-- Deliberately excludes billing/subscription management and any staff
-- member's individual calendar/earnings view — those stay owner-only (or,
-- for a staff member's own earnings, visible only to that staff member via
-- their own /staff portal), same as today. See lib/shopAccess.ts for where
-- this is read.
--
-- This is a distinct concept from the existing staff.access_level column,
-- which only governs a staff member's permissions inside their OWN /staff
-- portal (e.g. whether they can edit their own recorded payments) — it has
-- no bearing on dashboard access.
alter table staff add column if not exists is_shop_admin boolean not null default false;

-- The rest of this app's staff-table edits (name, role, hours, etc.) go
-- straight from the browser via the anon/user client with no RLS on this
-- table, relying on the dashboard UI alone to gate who can reach the edit
-- form. Promotion to admin is a meaningfully bigger grant of access than
-- any of those fields, so it gets the same treatment as this codebase's
-- other sensitive, owner-only actions (see owner_get_staff_schedule,
-- owner_update_staff_payment): a SECURITY DEFINER function that checks
-- tenant ownership itself, so the "only the owner can promote/demote an
-- admin" rule holds even if someone bypasses the dashboard's own UI.
create or replace function owner_set_staff_admin(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_is_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from tenants
    where id = p_tenant_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  update staff
  set is_shop_admin = p_is_admin
  where id = p_staff_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

grant execute on function owner_set_staff_admin(uuid, uuid, boolean) to authenticated;
