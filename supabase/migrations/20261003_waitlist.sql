-- Waitlist for cancelled slots.
--
-- A customer can ask to be notified if a suitable opening appears with a
-- given staff member for a given service. When a booking with that staff
-- member is cancelled or declined, the oldest still-waiting entry whose
-- service fits inside the freed time window is automatically offered that
-- slot by email, with 24 hours to accept or decline before it's offered to
-- the next person in line.
--
-- Per-staff on/off switch: for an employed staff member only the owner may
-- turn this on (owner_set_staff_waitlist), for a self-employed staff member
-- only they themselves may (staff_update_my_waitlist) — mirroring how
-- owner_update_staff_payment / staff_update_my_payment are already split in
-- 20261003_multi_shop_employment.sql.
--
-- Run this in the Supabase SQL editor.

alter table staff add column if not exists waitlist_enabled boolean not null default false;
comment on column staff.waitlist_enabled is
  'Customers can join this staff member''s waitlist and be auto-offered a cancelled slot. Owner sets this for employed staff; self-employed staff set it themselves.';

create table if not exists waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'accepted', 'declined', 'expired', 'cancelled', 'booked')),
  offer_token uuid,
  offered_slot_start timestamptz,
  offered_slot_end timestamptz,
  offer_sent_at timestamptz,
  offer_expires_at timestamptz,
  resulting_booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table waitlist_entries is
  'Customers waiting for a cancellation to free up a suitable slot with a given staff member/service. One "waiting" entry is offered per freed slot, oldest first; declining or letting the 24h offer expire moves to the next one.';

create index if not exists waitlist_entries_staff_status_idx on waitlist_entries (staff_id, status);
create index if not exists waitlist_entries_offer_token_idx on waitlist_entries (offer_token);

grant select, insert on waitlist_entries to anon, authenticated;
grant update on waitlist_entries to authenticated;

-- A customer joining the waitlist is a plain anon insert, same convention
-- as booking creation itself (see BookingForm.tsx) — but the insert is
-- still gated server-side so turning a shop's waitlist off actually stops
-- new entries, rather than relying on the booking page simply not showing
-- the option.
create or replace function waitlist_entries_check_enabled()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from staff s
    where s.id = new.staff_id and s.tenant_id = new.tenant_id and s.waitlist_enabled
  ) then
    raise exception 'Waitlist is not enabled for this staff member';
  end if;
  return new;
end;
$$;

drop trigger if exists waitlist_entries_check_enabled_trigger on waitlist_entries;
create trigger waitlist_entries_check_enabled_trigger
  before insert on waitlist_entries
  for each row execute function waitlist_entries_check_enabled();

-- Owner toggles the waitlist for one of their EMPLOYED staff members only —
-- mirrors owner_update_staff_payment's authorization shape exactly.
create or replace function owner_set_staff_waitlist(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_enabled boolean
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
    where s.id = p_staff_id and s.tenant_id = p_tenant_id and s.employment_status = 'employed'
  ) then
    raise exception 'Staff member not found';
  end if;

  update staff set waitlist_enabled = p_enabled where id = p_staff_id and tenant_id = p_tenant_id;
end;
$$;

-- A SELF-EMPLOYED staff member toggles their own waitlist. Deliberately
-- refuses an employed staff member here — that one's owner-controlled only.
create or replace function staff_update_my_waitlist(
  p_tenant_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_employment text;
begin
  select id, employment_status into v_staff_id, v_employment
  from staff
  where tenant_id = p_tenant_id and user_id = auth.uid();

  if v_staff_id is null then
    raise exception 'Not authorized';
  end if;

  if v_employment <> 'self_employed' then
    raise exception 'Employed staff waitlist settings are managed by the shop owner';
  end if;

  update staff set waitlist_enabled = p_enabled where id = v_staff_id;
end;
$$;

-- Mirrors staff_get_my_employment_status (20261003_multi_shop_employment.sql)
-- — the staff portal calls this to know whether to show the toggle as on,
-- or as owner-controlled, without needing a direct read of the staff table.
create or replace function staff_get_my_waitlist(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select waitlist_enabled into v_enabled
  from staff
  where tenant_id = p_tenant_id and user_id = auth.uid();

  if v_enabled is null then
    raise exception 'Not authorized';
  end if;

  return v_enabled;
end;
$$;

grant execute on function owner_set_staff_waitlist(uuid, uuid, boolean) to authenticated;
grant execute on function staff_update_my_waitlist(uuid, boolean) to authenticated;
grant execute on function staff_get_my_waitlist(uuid) to authenticated;

-- Called right after a booking is cancelled/declined, with the freed
-- window. Finds the oldest 'waiting' entry for that staff member whose
-- service fits inside the window, marks it 'offered' with a 24h token, and
-- hands back what the caller needs to send the offer email. Returns no
-- rows if the staff member's waitlist is off, or nothing matches.
create or replace function match_waitlist_for_cancellation(
  p_tenant_id uuid,
  p_staff_id uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
returns table (
  id uuid,
  customer_name text,
  customer_email text,
  service_id uuid,
  offer_token uuid,
  offer_expires_at timestamptz,
  offered_slot_start timestamptz,
  offered_slot_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_service_id uuid;
  v_customer_name text;
  v_customer_email text;
  v_duration int;
  v_token uuid;
  v_expires timestamptz;
  v_offered_end timestamptz;
begin
  if not exists (
    select 1 from staff s
    where s.id = p_staff_id and s.tenant_id = p_tenant_id and s.waitlist_enabled
  ) then
    return;
  end if;

  select we.id, we.service_id, we.customer_name, we.customer_email, sv.duration_minutes
  into v_entry_id, v_service_id, v_customer_name, v_customer_email, v_duration
  from waitlist_entries we
  join services sv on sv.id = we.service_id
  where we.tenant_id = p_tenant_id
    and we.staff_id = p_staff_id
    and we.status = 'waiting'
    and sv.duration_minutes <= round(extract(epoch from (p_slot_end - p_slot_start)) / 60)
  order by we.created_at asc
  limit 1
  for update of we skip locked;

  if v_entry_id is null then
    return;
  end if;

  v_token := gen_random_uuid();
  v_expires := now() + interval '24 hours';
  v_offered_end := p_slot_start + make_interval(mins => v_duration);

  update waitlist_entries
  set status = 'offered',
      offer_token = v_token,
      offered_slot_start = p_slot_start,
      offered_slot_end = v_offered_end,
      offer_sent_at = now(),
      offer_expires_at = v_expires
  where waitlist_entries.id = v_entry_id;

  return query
    select v_entry_id, v_customer_name, v_customer_email, v_service_id,
           v_token, v_expires, p_slot_start, v_offered_end;
end;
$$;

grant execute on function match_waitlist_for_cancellation(uuid, uuid, timestamptz, timestamptz) to anon, authenticated;

-- Public lookup for the "accept or decline" page — the token itself is the
-- authorization, same pattern as manage_get_booking.
create or replace function waitlist_get_offer(p_token uuid)
returns table (
  status text,
  customer_name text,
  service_name text,
  staff_name text,
  tenant_name text,
  offered_slot_start timestamptz,
  offered_slot_end timestamptz,
  offer_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select we.status, we.customer_name, sv.name, s.name, t.name,
           we.offered_slot_start, we.offered_slot_end, we.offer_expires_at
    from waitlist_entries we
    join services sv on sv.id = we.service_id
    join staff s on s.id = we.staff_id
    join tenants t on t.id = we.tenant_id
    where we.offer_token = p_token;
end;
$$;

grant execute on function waitlist_get_offer(uuid) to anon, authenticated;

-- Customer accepts: turns the offer into a real confirmed booking, as long
-- as it hasn't expired and the slot hasn't been taken by something else in
-- the meantime.
create or replace function waitlist_accept_offer(p_token uuid)
returns table (
  ok boolean,
  message text,
  manage_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry waitlist_entries;
  v_manage_token text;
  v_booking_id uuid;
begin
  select * into v_entry from waitlist_entries we where we.offer_token = p_token for update;

  if v_entry.id is null then
    return query select false, 'This waitlist link is not valid.', null::text;
    return;
  end if;

  if v_entry.status <> 'offered' then
    return query select false, 'This offer has already been responded to, or is no longer available.', null::text;
    return;
  end if;

  if v_entry.offer_expires_at < now() then
    update waitlist_entries set status = 'expired' where id = v_entry.id;
    return query select false, 'Sorry, this offer has expired.', null::text;
    return;
  end if;

  if exists (
    select 1 from bookings b
    where b.staff_id = v_entry.staff_id
      and b.status not in ('cancelled', 'declined')
      and b.start_time < v_entry.offered_slot_end
      and b.end_time > v_entry.offered_slot_start
  ) then
    update waitlist_entries set status = 'expired' where id = v_entry.id;
    return query select false, 'Sorry, this slot has just been taken.', null::text;
    return;
  end if;

  v_manage_token := gen_random_uuid()::text;

  insert into bookings (
    tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
    status, start_time, end_time, manage_token
  )
  values (
    v_entry.tenant_id, v_entry.staff_id, v_entry.service_id, v_entry.customer_name,
    v_entry.customer_phone, v_entry.customer_email,
    'confirmed', v_entry.offered_slot_start, v_entry.offered_slot_end, v_manage_token
  )
  returning id into v_booking_id;

  update waitlist_entries
  set status = 'accepted', resulting_booking_id = v_booking_id
  where id = v_entry.id;

  return query select true, 'Booked!', v_manage_token;
end;
$$;

grant execute on function waitlist_accept_offer(uuid) to anon, authenticated;

-- Customer declines: frees the entry up and hands back the slot details so
-- the caller can immediately try the next person in line.
create or replace function waitlist_decline_offer(p_token uuid)
returns table (
  ok boolean,
  message text,
  tenant_id uuid,
  staff_id uuid,
  offered_slot_start timestamptz,
  offered_slot_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry waitlist_entries;
begin
  select * into v_entry from waitlist_entries we where we.offer_token = p_token for update;

  if v_entry.id is null then
    return query select false, 'This waitlist link is not valid.', null::uuid, null::uuid, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_entry.status <> 'offered' then
    return query select false, 'This offer has already been responded to, or is no longer available.', null::uuid, null::uuid, null::timestamptz, null::timestamptz;
    return;
  end if;

  update waitlist_entries set status = 'declined' where id = v_entry.id;

  return query
    select true, 'Declined.', v_entry.tenant_id, v_entry.staff_id, v_entry.offered_slot_start, v_entry.offered_slot_end;
end;
$$;

grant execute on function waitlist_decline_offer(uuid) to anon, authenticated;

-- Cron sweep: expires any offer whose 24h window has passed, and hands back
-- each one's tenant/staff/slot so the caller can try the next person in
-- line for that same freed window.
create or replace function waitlist_expire_stale_offers()
returns table (
  tenant_id uuid,
  staff_id uuid,
  offered_slot_start timestamptz,
  offered_slot_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update waitlist_entries
    set status = 'expired'
    where status = 'offered' and offer_expires_at < now()
    returning waitlist_entries.tenant_id, waitlist_entries.staff_id,
              waitlist_entries.offered_slot_start, waitlist_entries.offered_slot_end;
end;
$$;

grant execute on function waitlist_expire_stale_offers() to authenticated;
