-- Stage 2 of payment integration: automates platform billing (salon ->
-- TrimBooking) with real Stripe invoices, instead of the invoice row + email
-- + manually-toggled-paid flow being the whole story.
--
-- The existing `invoices` table stays the source of truth for the admin
-- panel's UI (nothing there needs to change shape) — these columns just let
-- each row carry a link to its real Stripe Invoice object, so the panel can
-- show (and Stripe can collect) a genuine, hosted, payable invoice rather
-- than "payment instructions will follow separately".
--
-- Run this in the Supabase SQL editor.

alter table tenants
  add column if not exists stripe_customer_id text;

alter table invoices
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_hosted_invoice_url text,
  add column if not exists stripe_status text;

comment on column invoices.stripe_status is
  'Mirrors the Stripe Invoice''s own status (draft/open/paid/void/uncollectible), kept in sync by the billing webhook. Null if Stripe wasn''t configured when this invoice was raised.';
