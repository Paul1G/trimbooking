-- Lets the owner see a booking's treatment cost and record the actual
-- payment taken, from the booking popup on their calendars — but only for
-- the single booking they're looking at, never a summary of earnings.
--
-- This narrows (not reverses) the owner-sees-schedule-not-earnings rule from
-- 20260930_owner_schedule_only.sql: that migration's goal was to stop the
-- owner's per-staff calendar from showing EARNINGS SUMMARIES (today's/
-- month's expected vs. actual totals, which belong to the staff member's own
-- portal). Showing one booking's price, and being able to key in what a
-- customer actually paid — e.g. when the owner takes payment themselves, or
-- is correcting an entry — isn't a summary and doesn't expose anyone's
-- running totals, so it's fine for the owner's calendars to carry it
-- per-booking. The per-staff portal's own totals are unaffected.
--
-- Run this in the Supabase SQL editor. (Run 20261001_owner_schedule_customer_
-- contact.sql first if you haven't already — this builds on its 8-column
-- version of owner_get_staff_schedule.)

drop function if exists owner_get_staff_schedule(uuid, uuid, timestamptz, timestamptz);

create function owner_get_staff_schedule(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns table (
  id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  service_name text,
  service_price numeric,
  amount_paid numeric
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
    where s.id = p_staff_id and s.tenant_id = p_tenant_id
  ) then
    raise exception 'Staff member not found';
  end if;

  return query
    select
      b.id,
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      b.start_time,
      b.end_time,
      b.status,
      sv.name as service_name,
      sv.price as service_price,
      b.amount_paid
    from bookings b
    left join services sv on sv.id = b.service_id
    where b.tenant_id = p_tenant_id
      and b.staff_id = p_staff_id
      and b.start_time >= p_range_start
      and b.start_time <= p_range_end
    order by b.start_time asc;
end;
$$;

grant execute on function owner_get_staff_schedule(uuid, uuid, timestamptz, timestamptz) to authenticated;

-- Already exists from 20260930_owner_staff_earnings.sql but was revoked by
-- 20260930_owner_schedule_only.sql — re-created (unchanged) and re-granted
-- so the owner can amend a booking's payment again. Still scoped to a single
-- booking, by id, and still checks the caller owns the tenant.
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

grant execute on function owner_update_staff_payment(uuid, uuid, numeric) to authenticated;
