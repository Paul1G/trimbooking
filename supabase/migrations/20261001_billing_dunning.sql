-- Dunning for recurring platform billing: a 5-day grace period after an
-- invoice's due date, with a daily reminder email during the grace window,
-- and automatic disable (same as a trial running out) if it still isn't
-- paid once the grace period ends.
--
-- Run this in the Supabase SQL editor.

alter table invoices
  add column if not exists due_date date,
  add column if not exists last_reminder_sent_at timestamptz;

comment on column invoices.due_date is
  'Mirrors the Stripe Invoice''s own due_date (days_until_due from when it was raised). Drives the dunning cron (app/api/cron/billing-dunning) — null for invoices raised before this column existed.';

comment on column invoices.last_reminder_sent_at is
  'Last time the dunning cron sent an overdue-payment reminder for this invoice, so it sends at most one per day during the grace period.';
