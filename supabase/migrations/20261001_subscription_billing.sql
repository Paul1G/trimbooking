-- Lets a shop owner choose, for themselves, between the two ways of paying
-- the TrimBooking platform fee:
--   'invoice'      — the existing model: a Stripe Invoice is raised each
--                    period with a pay-by-link email, nothing is charged
--                    automatically, no card is stored.
--                    (the pre-existing default behaviour, unchanged)
--   'subscription' — a real Stripe Subscription: the owner adds a card once
--                    via Stripe Checkout, and is charged automatically each
--                    month with no manual click.
--
-- Run this in the Supabase SQL editor.

alter table tenants
  add column if not exists billing_method text not null default 'invoice' check (billing_method in ('invoice', 'subscription')),
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_item_id text;

comment on column tenants.billing_method is
  'Which of the two platform-billing flows this tenant''s owner has chosen. See app/tenant/[subdomain]/dashboard/billing.';
