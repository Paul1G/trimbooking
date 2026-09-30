-- Tightens the earnings access rule: the OWNER should be able to see a staff
-- member's booking schedule (who's booked in, when, what for, status), but
-- NOT their earnings — expected price per appointment, and what was actually
-- taken. Only the staff member themselves can see and enter their own
-- earnings (via staff_get_my_bookings / staff_update_my_payment, unchanged).
--
-- owner_get_staff_bookings and owner_update_staff_payment (added earlier
-- this session) exposed price/amount data to the owner, which is no longer
-- the intended behaviour. Rather than removing those functions outright,
-- this revokes the owner's ability to call them at all — enforced at the
-- database level, not just hidden in the dashboard UI — and adds a
-- schedule-only replacement with no price or amount columns for the
-- dashboard's per-staff calendar page to use instead.
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
      s.name as service_name
    from bookings b
    left join services s on s.id = b.service_id
    where b.tenant_id = p_tenant_id
      and b.staff_id = p_staff_id
      and b.start_time >= p_range_start
      and b.start_time <= p_range_end
    order by b.start_time asc;
end;
$$;

grant execute on function owner_get_staff_schedule(uuid, uuid, timestamptz, timestamptz) to authenticated;

revoke execute on function owner_get_staff_bookings(uuid, uuid, timestamptz, timestamptz) from authenticated;
revoke execute on function owner_update_staff_payment(uuid, uuid, numeric) from authenticated;
