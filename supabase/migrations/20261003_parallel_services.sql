-- "Parallel treatment" services — a service that runs a long time but
-- doesn't need the staff member's constant attention throughout (colour
-- processing, a perm, a wax strip setting, etc). The owner marks the
-- service as allowing parallel booking and defines which parts of its
-- total duration actually need the staff member present ("contact
-- windows") — everything else in the duration is free for another
-- customer's appointment with the same staff member.
--
-- Example from the request: a 180-minute service needs 45 minutes of
-- contact at the start and 20 minutes at the end, so
-- contact_windows = [[0, 45], [160, 180]] — minutes 45 to 160 are open.
--
-- Run this in the Supabase SQL editor.

alter table services
  add column if not exists allow_parallel boolean not null default false,
  add column if not exists contact_windows jsonb;

comment on column services.allow_parallel is
  'When true, this service does not need the staff member''s constant attention for its full duration. contact_windows then defines which parts of it do; everything else is open for another booking with the same staff member. When false (the default), the whole duration needs the staff member, same as before this feature existed.';
comment on column services.contact_windows is
  'Array of [start_minute, end_minute] pairs, relative to a booking''s start_time, only read when allow_parallel is true. e.g. [[0,45],[160,180]] on a 180-minute service needs the staff member for the first 45 minutes and the last 20, leaving minutes 45-160 open for someone else. Null or empty falls back to treating the whole duration as one contact window.';

-- Returns one row per "contact segment" (the actual minutes a staff member
-- is tied to a booking) for every live booking of theirs in a date range —
-- this is what availability for a NEW booking is checked against, not the
-- bookings' full start/end span, so a parallel service's non-contact time
-- is correctly left open. A non-parallel service (or a parallel one with no
-- windows configured) falls back to a single segment spanning its whole
-- duration, so ordinary bookings behave exactly as they did before this
-- migration.
--
-- No customer details are returned — same reasoning as the rest of the
-- public booking flow not exposing other customers' information — so this
-- is safe to grant to anon.
-- p_exclude_booking_id lets a reschedule-in-progress leave its own booking
-- out of the blocker list (it hasn't moved yet, so without this it would
-- block the customer from keeping their existing time).
drop function if exists get_staff_contact_windows(uuid, uuid, timestamptz, timestamptz);

create function get_staff_contact_windows(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_exclude_booking_id uuid default null
)
returns table (
  segment_start timestamptz,
  segment_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      b.start_time + make_interval(mins => (w.value ->> 0)::numeric::int) as segment_start,
      b.start_time + make_interval(mins => (w.value ->> 1)::numeric::int) as segment_end
    from bookings b
    join services sv on sv.id = b.service_id
    cross join lateral jsonb_array_elements(
      case
        when sv.allow_parallel and sv.contact_windows is not null and jsonb_array_length(sv.contact_windows) > 0
          then sv.contact_windows
        else jsonb_build_array(jsonb_build_array(0, round(extract(epoch from (b.end_time - b.start_time)) / 60)))
      end
    ) as w(value)
    where b.tenant_id = p_tenant_id
      and b.staff_id = p_staff_id
      and b.status not in ('cancelled', 'declined')
      and b.start_time < p_range_end
      and b.end_time > p_range_start
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id);
end;
$$;

grant execute on function get_staff_contact_windows(uuid, uuid, timestamptz, timestamptz, uuid) to anon, authenticated;
