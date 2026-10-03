-- The staff calendar's booking pop-up (dashboard/staff/[staffId]) is being
-- brought in line with the owner's Bookings calendar pop-up — same contact
-- details, same Accept/Decline/Cancel actions. That needs customer_phone,
-- customer_email (shown in the pop-up and passed to CustomerHistoryView) and
-- manage_token (for the booking-status-change email, same as the Bookings
-- page sends) on both schedule RPCs, which previously only returned the
-- bare minimum for a read-only schedule view.
--
-- Run this in the Supabase SQL editor.

-- Both functions' OUT columns (RETURNS TABLE) are changing, not just their
-- bodies — Postgres won't let create-or-replace change a function's row
-- type, so the old versions have to be dropped first.
drop function if exists owner_get_staff_schedule(uuid, uuid, timestamptz, timestamptz);
drop function if exists owner_get_staff_bookings(uuid, uuid, timestamptz, timestamptz);

create function owner_get_staff_schedule(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  service_name text,
  manage_token text
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
      b.customer_phone,
      b.customer_email,
      b.start_time,
      b.end_time,
      b.status,
      sv.name as service_name,
      b.manage_token
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

create function owner_get_staff_bookings(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  amount_paid numeric,
  service_name text,
  service_price numeric,
  manage_token text
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
      b.customer_phone,
      b.customer_email,
      b.start_time,
      b.end_time,
      b.status,
      b.amount_paid,
      sv.name as service_name,
      sv.price as service_price,
      b.manage_token
    from bookings b
    left join services sv on sv.id = b.service_id
    where b.tenant_id = p_tenant_id
      and b.staff_id = p_staff_id
      and b.start_time >= p_range_start
      and b.start_time <= p_range_end
    order by b.start_time asc;
end;
$$;

grant execute on function owner_get_staff_bookings(uuid, uuid, timestamptz, timestamptz) to authenticated;
