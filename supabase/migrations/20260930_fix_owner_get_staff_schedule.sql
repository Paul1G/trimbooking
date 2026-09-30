-- Fixes "column reference \"id\" is ambiguous" in owner_get_staff_schedule.
--
-- The function's RETURNS TABLE declares an output column named `id`, and
-- PL/pgSQL treats that as a variable visible throughout the function body —
-- including inside the `where id = p_staff_id` / `where id = p_tenant_id`
-- checks, which also touch tables with their own `id` column. Postgres can't
-- tell which `id` is meant, so it refuses to run the query at all. Qualifying
-- every column reference with its table alias resolves it.
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

-- owner_get_staff_bookings has the identical bug (its RETURNS TABLE also
-- declares an `id` column). It's currently revoked from `authenticated` and
-- unused by the app, but fixed here too for correctness in case it's ever
-- needed again.
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
    where s.id = p_staff_id and s.tenant_id = p_tenant_id
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
