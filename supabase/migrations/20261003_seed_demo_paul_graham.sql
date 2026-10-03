-- DATA SEED, not a schema change — turns paul-graham.trimbooking.co.uk into
-- a fully-populated demonstration account: 4 barbers, men's grooming
-- services, shop opening hours, each barber's own working hours + breaks,
-- a few holidays (past and upcoming), and a working diary of bookings
-- spanning 3 months back to 3 months forward from whenever this is run.
--
-- Run by hand in the Supabase SQL editor (this repo has no migration
-- runner — see README.md). The tenant row for "paul-graham" must already
-- exist (i.e. that shop has already signed up) before running this.
--
-- Safe to re-run: it first wipes any existing staff/services/holidays/
-- bookings for THIS tenant only, then rebuilds everything from scratch, so
-- running it again just regenerates a fresh demo diary.
-- Also marks the shop "comped" (free access) since it's a demo, not a real
-- paying customer — see 20261003_comped_tenants.sql.

set timezone = 'Europe/London';

do $$
declare
  v_tenant_id uuid;
  v_marcus_id uuid;
  v_jamal_id  uuid;
  v_connor_id uuid;
  v_ellis_id  uuid;
  v_svc_cut   uuid;
  v_svc_fade  uuid;
  v_svc_beard uuid;
  v_svc_shave uuid;
  v_svc_combo uuid;
  v_svc_kids  uuid;
begin
  select id into v_tenant_id from tenants where subdomain = 'paul-graham';
  if v_tenant_id is null then
    raise exception 'No tenant found with subdomain "paul-graham" — create the shop (sign it up) first, then re-run this script.';
  end if;

  -- Clean slate for this tenant only, so the script can be re-run safely.
  delete from bookings where tenant_id = v_tenant_id;
  delete from staff_holidays where tenant_id = v_tenant_id;
  delete from staff_services where staff_id in (select id from staff where tenant_id = v_tenant_id);
  delete from staff where tenant_id = v_tenant_id;
  delete from services where tenant_id = v_tenant_id;

  -- Shop setup — open Mon–Sat, comped as a demo account. Also give it a
  -- proper brand colour: every CSS "--brand" accent (insights bars, the
  -- heatmap, calendar highlights, buttons) reads straight from this column,
  -- and a shop signed up the normal way defaults to near-black (#111111)
  -- until the owner visits Branding — which made everything that leans on
  -- --brand look washed-out/greyscale for this demo account.
  update tenants
  set
    comped = true,
    brand_color = '#1d3557',
    opening_hours = '{
      "mon": ["09:00", "18:00"],
      "tue": ["09:00", "18:00"],
      "wed": ["09:00", "18:00"],
      "thu": ["09:00", "18:00"],
      "fri": ["09:00", "19:00"],
      "sat": ["08:30", "17:00"]
    }'::jsonb
  where id = v_tenant_id;

  -- Services — men's grooming only.
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Men''s Haircut', 30, 18) returning id into v_svc_cut;
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Skin Fade', 45, 22) returning id into v_svc_fade;
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Beard Trim', 15, 10) returning id into v_svc_beard;
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Hot Towel Shave', 30, 20) returning id into v_svc_shave;
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Cut & Beard Combo', 45, 28) returning id into v_svc_combo;
  insert into services (tenant_id, name, duration_minutes, price)
    values (v_tenant_id, 'Kids Cut (Under 12)', 20, 12) returning id into v_svc_kids;

  -- Staff — 4 barbers, each with their own working hours and a daily break.
  insert into staff (tenant_id, name, role, employment_status, working_hours, breaks, auto_confirm_bookings)
  values (
    v_tenant_id, 'Marcus Bailey', 'Senior Barber', 'employed',
    '{"mon":["09:00","17:30"],"tue":["09:00","17:30"],"wed":["09:00","17:30"],"thu":["09:00","17:30"],"fri":["09:00","18:30"],"sat":["08:30","16:00"]}'::jsonb,
    '{"mon":[["13:00","13:30"]],"tue":[["13:00","13:30"]],"wed":[["13:00","13:30"]],"thu":[["13:00","13:30"]],"fri":[["13:00","13:30"]],"sat":[["12:30","13:00"]]}'::jsonb,
    true
  ) returning id into v_marcus_id;

  insert into staff (tenant_id, name, role, employment_status, working_hours, breaks, auto_confirm_bookings)
  values (
    v_tenant_id, 'Jamal Osei', 'Barber', 'self_employed',
    '{"tue":["10:00","18:00"],"wed":["10:00","18:00"],"thu":["10:00","18:00"],"fri":["10:00","19:00"],"sat":["09:00","17:00"]}'::jsonb,
    '{"tue":[["14:00","14:30"]],"wed":[["14:00","14:30"]],"thu":[["14:00","14:30"]],"fri":[["14:00","14:30"]],"sat":[["13:00","13:30"]]}'::jsonb,
    true
  ) returning id into v_jamal_id;

  insert into staff (tenant_id, name, role, employment_status, working_hours, breaks, auto_confirm_bookings)
  values (
    v_tenant_id, 'Connor Walsh', 'Barber', 'self_employed',
    '{"mon":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","18:00"],"sat":["08:30","16:30"]}'::jsonb,
    '{"mon":[["12:30","13:00"]],"wed":[["12:30","13:00"]],"thu":[["12:30","13:00"]],"fri":[["12:30","13:00"]],"sat":[["12:00","12:30"]]}'::jsonb,
    true
  ) returning id into v_connor_id;

  insert into staff (tenant_id, name, role, employment_status, working_hours, breaks, auto_confirm_bookings)
  values (
    v_tenant_id, 'Ellis Moore', 'Apprentice Barber', 'self_employed',
    '{"wed":["09:30","16:00"],"thu":["09:30","16:00"],"fri":["09:30","16:00"],"sat":["09:00","15:00"]}'::jsonb,
    '{"wed":[["13:00","13:30"]],"thu":[["13:00","13:30"]],"fri":[["13:00","13:30"]],"sat":[["12:30","13:00"]]}'::jsonb,
    true
  ) returning id into v_ellis_id;

  -- Which services each barber offers — the apprentice doesn't do shaves yet.
  insert into staff_services (staff_id, service_id) values
    (v_marcus_id, v_svc_cut), (v_marcus_id, v_svc_fade), (v_marcus_id, v_svc_beard),
    (v_marcus_id, v_svc_shave), (v_marcus_id, v_svc_combo),
    (v_jamal_id, v_svc_cut), (v_jamal_id, v_svc_fade), (v_jamal_id, v_svc_beard), (v_jamal_id, v_svc_combo),
    (v_connor_id, v_svc_cut), (v_connor_id, v_svc_beard), (v_connor_id, v_svc_shave), (v_connor_id, v_svc_combo),
    (v_ellis_id, v_svc_cut), (v_ellis_id, v_svc_beard), (v_ellis_id, v_svc_kids);

  -- Holidays — a business-wide closure plus personal leave, mixing past and upcoming.
  insert into staff_holidays (tenant_id, staff_id, start_date, end_date, reason) values
    (v_tenant_id, null, current_date - 10, current_date - 9, 'Shop closed — refurbishment'),
    (v_tenant_id, v_marcus_id, current_date - 55, current_date - 48, 'Annual leave'),
    (v_tenant_id, v_jamal_id, current_date - 20, current_date - 16, 'Annual leave'),
    (v_tenant_id, v_connor_id, current_date + 14, current_date + 18, 'Annual leave'),
    (v_tenant_id, v_ellis_id, current_date + 40, current_date + 42, 'Annual leave'),
    (v_tenant_id, v_marcus_id, current_date + 70, current_date + 75, 'Annual leave');
end $$;

-- Bookings — a working diary for every barber across the date range, built
-- from their own working hours, breaks and holidays, skipping Sundays.
do $$
declare
  v_tenant_id   uuid;
  v_start_date  date := (current_date - interval '3 months')::date;
  v_end_date    date := (current_date + interval '3 months')::date;
  v_day         date;
  v_staff       record;
  v_day_key     text;
  v_hours       jsonb;
  v_day_start   timestamp;
  v_day_end     timestamp;
  v_break       jsonb;
  v_has_break   boolean;
  v_break_start timestamp;
  v_break_end   timestamp;
  v_on_holiday  boolean;
  v_cursor      timestamp;
  v_service_id  uuid;
  v_duration    int;
  v_price       numeric;
  v_roll        numeric;
  v_customer_name  text;
  v_customer_email text;
  v_customer_phone text;
  v_token       text;
  v_status      text;
  v_is_past     boolean;
  v_first_names text[] := array['James','Oliver','Harry','Jack','George','Noah','Charlie','Thomas','Leo','Jacob','Daniel','Ryan','Liam','Mohammed','Adam','Lucas','Freddie','Finley','Alfie','Dylan'];
  v_last_names  text[] := array['Smith','Jones','Taylor','Williams','Brown','Davies','Evans','Wilson','Roberts','Johnson','Walker','Wright','Robinson','Thompson','White','Hughes','Edwards','Green','Hall','Baker'];
begin
  select id into v_tenant_id from tenants where subdomain = 'paul-graham';
  if v_tenant_id is null then
    raise exception 'No tenant found with subdomain "paul-graham".';
  end if;

  for v_staff in (select id, working_hours, breaks from staff where tenant_id = v_tenant_id) loop
    v_day := v_start_date;
    while v_day <= v_end_date loop
      v_day_key := case extract(isodow from v_day)
        when 1 then 'mon' when 2 then 'tue' when 3 then 'wed' when 4 then 'thu'
        when 5 then 'fri' when 6 then 'sat' else 'sun' end;

      if v_day_key = 'sun' then
        v_day := v_day + 1;
        continue;
      end if;

      v_hours := v_staff.working_hours -> v_day_key;
      if v_hours is null then
        v_day := v_day + 1;
        continue;
      end if;

      select exists(
        select 1 from staff_holidays
        where tenant_id = v_tenant_id
          and (staff_id is null or staff_id = v_staff.id)
          and v_day between start_date and end_date
      ) into v_on_holiday;

      if v_on_holiday then
        v_day := v_day + 1;
        continue;
      end if;

      v_day_start := v_day + (v_hours ->> 0)::time;
      v_day_end := v_day + (v_hours ->> 1)::time;

      v_break := v_staff.breaks -> v_day_key;
      if v_break is not null and jsonb_array_length(v_break) > 0 then
        v_has_break := true;
        v_break_start := v_day + (v_break -> 0 ->> 0)::time;
        v_break_end := v_day + (v_break -> 0 ->> 1)::time;
      else
        v_has_break := false;
      end if;

      v_cursor := v_day_start;
      while v_cursor < v_day_end loop
        if v_has_break and v_cursor >= v_break_start and v_cursor < v_break_end then
          v_cursor := v_break_end;
          continue;
        end if;

        v_roll := random();
        if v_roll < 0.45 then
          select ss.service_id, s.duration_minutes, s.price
            into v_service_id, v_duration, v_price
          from staff_services ss
          join services s on s.id = ss.service_id
          where ss.staff_id = v_staff.id
          order by random()
          limit 1;

          if v_service_id is null
             or v_cursor + (v_duration || ' minutes')::interval > v_day_end
             or (v_has_break and v_cursor < v_break_start and v_cursor + (v_duration || ' minutes')::interval > v_break_start)
          then
            v_cursor := v_cursor + interval '30 minutes';
            continue;
          end if;

          v_customer_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int]
            || ' ' || v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
          v_customer_email := lower(regexp_replace(v_customer_name, '\s+', '.', 'g')) || floor(random() * 900 + 100)::int::text || '@example.com';
          v_customer_phone := '07' || lpad(floor(random() * 900000000)::bigint::text, 9, '0');
          v_token := md5(random()::text || clock_timestamp()::text);
          v_is_past := v_day < current_date;

          if v_is_past then
            v_roll := random();
            if v_roll < 0.06 then
              -- a no-show: booking was confirmed, customer never arrived
              insert into bookings (
                tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
                status, start_time, end_time, manage_token, no_show, no_show_fee_amount, no_show_fee_status
              ) values (
                v_tenant_id, v_staff.id, v_service_id, v_customer_name, v_customer_phone, v_customer_email,
                'confirmed', v_cursor, v_cursor + (v_duration || ' minutes')::interval, v_token,
                true, round(v_price * 0.5, 2), 'charged'
              );
            elsif v_roll < 0.11 then
              -- cancelled ahead of time, nothing charged
              insert into bookings (
                tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
                status, start_time, end_time, manage_token
              ) values (
                v_tenant_id, v_staff.id, v_service_id, v_customer_name, v_customer_phone, v_customer_email,
                'cancelled', v_cursor, v_cursor + (v_duration || ' minutes')::interval, v_token
              );
            else
              -- a completed, paid visit
              insert into bookings (
                tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
                status, start_time, end_time, manage_token, amount_paid
              ) values (
                v_tenant_id, v_staff.id, v_service_id, v_customer_name, v_customer_phone, v_customer_email,
                'confirmed', v_cursor, v_cursor + (v_duration || ' minutes')::interval, v_token, v_price
              );
            end if;
          else
            v_status := case when random() < 0.8 then 'confirmed' else 'pending' end;
            insert into bookings (
              tenant_id, staff_id, service_id, customer_name, customer_phone, customer_email,
              status, start_time, end_time, manage_token
            ) values (
              v_tenant_id, v_staff.id, v_service_id, v_customer_name, v_customer_phone, v_customer_email,
              v_status, v_cursor, v_cursor + (v_duration || ' minutes')::interval, v_token
            );
          end if;

          v_cursor := v_cursor + (v_duration || ' minutes')::interval + interval '15 minutes';
        else
          v_cursor := v_cursor + interval '30 minutes';
        end if;
      end loop;

      v_day := v_day + 1;
    end loop;
  end loop;
end $$;
