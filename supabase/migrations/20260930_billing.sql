-- Billing: prorated signup invoice + monthly invoicing by staff count.
--
-- This project has no migration runner wired up (schema changes are applied
-- by hand in the Supabase SQL editor), so run this file there directly.
--
-- Pricing: £20.00/month base, including up to 4 staff members, then
-- +£2.50/month for each staff member beyond 4. All amounts are stored in
-- pence to avoid floating point issues.

-- Tracks when each tenant is next due to be invoiced, so the monthly cron
-- can find who to bill without recomputing it from scratch every run.
alter table tenants
  add column if not exists next_invoice_at timestamptz;

-- One row per invoice (the prorated first one at signup, then one per
-- calendar month). This is what the admin panel reads to show what's owed
-- and what's been paid, and what the cron emails out.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  staff_count integer not null,
  amount_pence integer not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'paid', 'void')),
  is_proration boolean not null default false,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoices_tenant_id_idx on invoices(tenant_id);
create index if not exists invoices_status_idx on invoices(status);
