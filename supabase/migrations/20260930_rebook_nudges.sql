-- Log of automated "you're due to rebook" nudge emails, so the cron job
-- never emails the same customer twice for the same overdue cycle.
--
-- One row is written per (tenant, customer) the moment a nudge is sent, and
-- it records which was that customer's most recent confirmed booking at the
-- time. The cron only sends again once that customer has a *newer* most
-- recent confirmed booking than the one on file here — i.e. once they've
-- actually been back in and a new cycle has started.
--
-- Only ever read/written by the cron job via the service-role key, so no
-- client-facing RLS policy is needed.
--
-- Run this in the Supabase SQL editor.

create table if not exists rebook_nudges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_email text not null,
  last_booking_id uuid not null references bookings(id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists rebook_nudges_tenant_email_idx
  on rebook_nudges (tenant_id, customer_email);
