-- Adds customer_email (and customer_phone, for display) to
-- owner_get_staff_schedule's output, so the owner's per-staff calendar can
-- look up a customer's visit history when a booking is clicked — matching
-- the same email-based lookup already used on the Customers page and the
-- main bookings calendar. This is contact info, not earnings: it doesn't
-- touch the owner-sees-schedule-not-earnings rule from
-- 20260930_owner_schedule_only.sql, and the owner already sees customer
-- email/phone elsewhere (e.g. the main Bookings page).
--
-- Run this in the Supabase SQL editor.

create or replace function owner_get_staff_schedule(
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
  service_name text
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
      sv.name as service_name
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
