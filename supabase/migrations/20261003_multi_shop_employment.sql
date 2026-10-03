-- Two independent features:
--
-- 1. Lets the same person (same email / same Supabase auth login) be an
--    owner and/or staff member across more than one shop. The underlying
--    schema already allowed this (tenants.owner_id and staff.user_id are
--    both just FKs to auth.users, and app/api/staff/invite/route.ts already
--    reuses an existing auth user for a staff invite at a second shop) — the
--    only real gap was app/api/signup/route.ts hard-failing whenever the
--    email already had ANY account. That's fixed in the signup route
--    itself (verifies the submitted password against the existing account,
--    then reuses its user id as the new tenant's owner_id, rather than
--    failing). This migration adds the one piece of server-side support
--    that needs: a way for a signed-in person to see every shop their own
--    login is attached to, by name — themselves only, not surfaced to any
--    shop's owner about a staff member.
--
-- 2. Lets an owner mark a staff member as "employed" rather than the
--    default "self_employed". An employed member no longer sees their own
--    earnings/money details in their own /staff portal (the portal UI
--    gates this off staff_get_my_employment_status below) — instead the
--    OWNER sees their full schedule and earnings from the dashboard, which
--    requires re-enabling owner_get_staff_bookings / owner_update_staff_payment
--    (deliberately revoked in 20260930_owner_schedule_only.sql, when every
--    staff member was assumed self-employed and owner earnings visibility
--    was considered a mistake). They're reinstated here, but narrower than
--    before: gated to only ever work for a staff member who's actually
--    marked 'employed', enforced inside the function itself rather than
--    just by what the dashboard UI chooses to call.
--
-- Run this in the Supabase SQL editor.

alter table staff add column if not exists employment_status text not null default 'self_employed'
  check (employment_status in ('self_employed', 'employed'));

-- Additive — does not touch the existing staff_get_my_data RPC (its exact
-- current definition predates this migrations folder and isn't in git, so
-- it's safer to add a small new function than to guess its full shape with
-- create or replace). The staff portal calls this once, alongside
-- staff_get_my_data, to decide whether to show money at all.
create or replace function staff_get_my_employment_status(
  p_tenant_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select employment_status into v_status
  from staff
  where tenant_id = p_tenant_id and user_id = auth.uid();

  if v_status is null then
    raise exception 'Not authorized';
  end if;

  return v_status;
end;
$$;

grant execute on function staff_get_my_employment_status(uuid) to authenticated;

-- Every shop (as owner, or as staff with their own login) the CALLING
-- user is linked to — never anyone else's. There's no tenant_id parameter
-- on purpose: this always answers for auth.uid() alone, so it can't be used
-- to probe another person's associations.
create or replace function my_shop_associations()
returns table (
  tenant_id uuid,
  tenant_name text,
  subdomain text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select t.id, t.name, t.subdomain, 'owner'::text as role
    from tenants t
    where t.owner_id = auth.uid()
    union all
    select t.id, t.name, t.subdomain, 'staff'::text as role
    from staff s
    join tenants t on t.id = s.tenant_id
    where s.user_id = auth.uid()
      -- A staff row that's really just the owner's own login linked to their
      -- own shop (see the isSelf case in dashboard/staff/page.tsx) would
      -- otherwise duplicate the 'owner' row above for the same shop.
      and t.owner_id is distinct from auth.uid()
    order by 2;
end;
$$;

grant execute on function my_shop_associations() to authenticated;

-- Re-grant owner_get_staff_bookings / owner_update_staff_payment, now gated
-- so they only ever work for a staff member marked 'employed' — a
-- self-employed staff member's earnings stay visible only in their own
-- portal, exactly as 20260930_owner_schedule_only.sql intended, this just
-- carves out the employed case.
create or replace function owner_get_staff_bookings(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns table (
  id uuid,
  customer_name text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  amount_paid numeric,
  service_name text,
  service_price numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from tenants t
    where t.id = p_tenant_id and t.owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from staff s
    where s.id = p_staff_id and s.tenant_id = p_tenant_id and s.employment_status = 'employed'
  ) then
    raise exception 'Staff member not found';
  end if;

  return query
    select
      b.id,
      b.customer_name,
      b.start_time,
      b.end_time,
      b.status,
      b.amount_paid,
      sv.name as service_name,
      sv.price as service_price
    from bookings b
    left join services sv on sv.id = b.service_id
    where b.tenant_id = p_tenant_id
      and b.staff_id = p_staff_id
      and b.start_time >= p_range_start
      and b.start_time <= p_range_end
    order by b.start_time asc;
end;
$$;

create or replace function owner_update_staff_payment(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from tenants t
    where t.id = p_tenant_id and t.owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from staff s
    join bookings b on b.staff_id = s.id
    where b.id = p_booking_id and s.tenant_id = p_tenant_id and s.employment_status = 'employed'
  ) then
    raise exception 'Not authorized';
  end if;

  update bookings
  set amount_paid = p_amount
  where id = p_booking_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Booking not found';
  end if;
end;
$$;

grant execute on function owner_get_staff_bookings(uuid, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function owner_update_staff_payment(uuid, uuid, numeric) to authenticated;
