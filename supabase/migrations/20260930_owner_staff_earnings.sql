-- Owner-side access to a staff member's bookings/earnings, via SECURITY
-- DEFINER functions rather than a direct table update from the browser.
--
-- This mirrors staff_get_my_bookings / staff_update_my_payment, which already
-- exist for a staff member looking at their own data. The owner's staff
-- calendar page (Enter the actual payment received for each appointment) was
-- the one place still reading/writing the `bookings` table directly from the
-- client, relying on whatever row-level security policy happens to apply to
-- UPDATE — if that policy doesn't cover it, Supabase reports success but
-- silently changes zero rows, which is what made manually entered payments
-- fail to show up in the totals.
--
-- These functions make the access rule explicit instead of implicit: the
-- caller must be the OWNER of the tenant that staff member belongs to.
-- A staff member (or anyone else) calling these gets 'Not authorized' — they
-- only ever see their own earnings through the staff_* functions, never
-- another staff member's, and never through these owner-only ones.
--
-- Run this in the Supabase SQL editor.

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
    select 1 from tenants
    where id = p_tenant_id and owner_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from staff
    where id = p_staff_id and tenant_id = p_tenant_id
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
      s.name as service_name,
      s.price as service_price
    from bookings b
    left join services s on s.id = b.service_id
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
    select 1 from tenants
    where id = p_tenant_id and owner_id = auth.uid()
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
