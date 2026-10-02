# TrimBooking

Multi-tenant online booking SaaS for hairdressers, beauty salons and barbers, live at [trimbooking.co.uk](https://trimbooking.co.uk). Each business gets its own branded subdomain (`yourshop.trimbooking.co.uk`) with a public booking page, an owner dashboard, and optional logins for staff.

## Stack

- **Next.js (App Router)** + TypeScript — `app/[subdomain]` routes serve each tenant's public and dashboard pages
- **Supabase** — Postgres database, Auth, and Row-Level Security; business logic that needs elevated/cross-row access is exposed as `SECURITY DEFINER` Postgres functions (RPCs), not client-side queries
- **Resend** — transactional email (booking requests, confirmations, invites, reminders, invoices, rebook nudges)
- **Vercel** — hosting, plus scheduled cron jobs (see `vercel.json`) for reminders, trial checks, monthly invoices and rebook nudges

## Key features

- Branded public booking page per tenant, with services, staff, working hours, breaks and holidays all respected when computing available slots
- Owner dashboard: manage services, staff, bookings (confirm/decline/reschedule/cancel), holidays, branding and billing
- Per-staff calendar for the owner, with **day and week views** — shows each staff member's booking schedule, and lets the owner view/amend the treatment cost and amount paid on an individual booking, but never a staff member's aggregate earnings totals (see access control below)
- **Auto-confirm bookings** — a per-staff toggle so their bookings are accepted instantly instead of landing as a pending request
- **Customer history on booking click** — selecting any booking in a calendar shows that customer's last few visits, total visit count, and how long they've been a customer
- Staff self-service portal (`/staff`) — a staff member with their own login sees their own day-by-day and month-to-date bookings and earnings (expected vs. actual), can record the amount actually taken for their own confirmed bookings if given "Admin" access, and can download a CSV earnings report (by month or custom date range) scoped to only their own bookings. Schedule (working hours/breaks) is managed by the owner, not from the staff portal
- **Stripe Connect payouts (staff)** — a staff member can connect their own Stripe Express account from their portal so they can be paid out directly rather than settling up separately (see Payments below)
- Customer self-service — every booking email includes a personal link to view, reschedule or cancel without contacting the business
- Client history and rebook nudges, billing/trial management

### Access control: owner vs. staff earnings

The owner can see a staff member's booking schedule (who's booked in, when, status), and can view/amend the treatment cost and amount paid for a **single** booking — but must **never** see a staff member's aggregate/running earnings totals (today's or the month's expected vs. actual), which stay visible only to the staff member themselves, from their own portal. This is enforced at the database level (separate RPCs with separate grants — `owner_get_staff_schedule` vs. `staff_get_my_bookings`/`staff_update_my_payment`/`owner_update_staff_payment`), not just hidden in the UI.

## Payments

The actual service is always paid in person — that isn't changing. The one customer-facing online payment flow is the optional no-show fee (Stage 3 below), and even that only ever charges a fee for not showing up, never the treatment itself. What's being built in stages:

1. **Staff Stripe Connect onboarding** (done, tested end-to-end) — each staff member can link their own Stripe account from `/staff` (`app/api/staff/stripe/connect-start`, `connect-status`, and the `/api/stripe/webhook/connect` webhook keep `staff.stripe_connect_status`/`stripe_payouts_enabled` in sync). Built on Stripe's **v2 Core Accounts API** (`stripe.v2.core.accounts`/`accountLinks`), not the older v1 Express accounts — newer Stripe accounts no longer allow creating v1 Express accounts by default. A "recipient" configuration with the `stripe_transfers` capability is the v2 equivalent of a v1 Express account with the `transfers` capability. No money moves yet — this just gets accounts ready to receive payouts. The v2 Core Accounts/Account Links request shape is still moving between Stripe's monthly preview API versions, so `lib/stripe.ts` pins `apiVersion: '2026-08-26.dahlia'` (matching both Connect webhook destinations in the dashboard) rather than whatever version ships inside the installed `stripe` package by default — bumping it isn't safe without re-checking the Account Links `use_case.account_onboarding` shape against whatever version you're moving to.
2. **Platform billing via Stripe** (done) — a shop's 30-day trial is genuinely free: no invoice exists until `app/api/cron/send-trial-invoices` raises one, ~7 days before `trial_ends_at` (covering from then to the end of that month), giving the owner a week's notice and a working Stripe pay link before `check-trials` would otherwise disable them. `tenants.trial_invoice_sent_at` stops that from re-sending on every subsequent daily run. From there, the monthly cron (`app/api/cron/send-invoices`) and the admin "Invoice now" action (`lib/stripeBilling.ts`/`lib/billingCron.ts`) each raise a real, finalized Stripe Invoice per billing period (a `Customer` per tenant, `collection_method: 'send_invoice'` so no card is ever stored by TrimBooking) and put its Stripe-hosted pay link in TrimBooking's own invoice email. `/api/stripe/webhook/billing` keeps `invoices.status`/`stripe_status` in sync when Stripe reports a payment, and — when an invoice is actually paid — also flips `tenants.paid` to `true` and `tenants.disabled` to `false`, which is what takes a trial shop live (or an overdue one back online) automatically with no admin step required (marking a tenant "paid" by hand in `/admin` still works at any time too, e.g. for a comped or offline-paying shop). The admin panel (`/admin`) shows each tenant's linked Stripe customer, each invoice's Stripe payment-page link, and flags an overdue invoice with how many days overdue it is.

   By default this behaves like a recurring/subscription payment from the owner's point of view (a bill arrives automatically every period, nothing to set up) without actually using Stripe's Subscription object or ever storing a card. **Dunning**: once a recurring invoice's due date passes unpaid, `app/api/cron/billing-dunning` (daily) emails the owner once a day for a 5-day grace period (`invoices.due_date`/`last_reminder_sent_at`), then — if still unpaid — flips the tenant to `paid: false, disabled: true`, same as a trial running out. This only applies to tenants already past their trial (`paid: true`); the original trial-ending invoice keeps its own hard cutoff at `trial_ends_at` via `check-trials`, unaffected by this grace period.

   **The owner can also opt into a real Stripe Subscription instead** (`tenants.billing_method`, either `'invoice'` or `'subscription'` — their choice, from `/dashboard/billing`, not something decided for them). Switching to `'subscription'` sends them through a Stripe Checkout session (`app/api/owner/stripe/subscription-checkout`) to add a card; from then on Stripe charges that card automatically every month (`collection_method: 'charge_automatically'`, the one place in this codebase a card actually gets stored, and only by Stripe — TrimBooking never sees or stores it), and `app/api/cron/sync-subscription-prices` (daily) keeps the subscription's amount matching current staff count (`proration_behavior: 'none'`, so a staff-count change only changes the *next* renewal's amount, same staleness tradeoff the invoice-per-period model already has). Switching back to `'invoice'` (`app/api/owner/stripe/cancel-subscription`) cancels the Stripe Subscription immediately. A failed subscription charge still flows through the same dunning pipeline above — `invoice.payment_failed` starts that invoice's 5-day grace clock (since subscription invoices don't carry their own `due_date` the way a `send_invoice` one does) — so the grace period, reminders and auto-disable work identically regardless of which billing method a tenant is on. `/api/stripe/webhook/billing` additionally handles `checkout.session.completed` (records the new subscription) and `customer.subscription.deleted` (falls back to `'invoice'` if a subscription is cancelled from the Stripe dashboard directly rather than via the owner's own toggle).
3. **No-show protection** (done) — an owner can turn this on from `/dashboard/no-show-protection` (`tenants.no_show_protection_enabled`). When it's on, a customer booking adds a card via Stripe (`app/api/bookings/setup-intent`, a SetupIntent — nothing is charged) before their booking is created; `tenants.no_show_card_required` decides whether that's mandatory or skippable. The no-show fee amount is configurable per shop (`tenants.no_show_fee_mode`: `flat` — one amount for anything, `percentage` — a % of that booking's service price, or `per_service` — set individually per service via `services.no_show_fee`), computed once and snapshotted onto the booking (`bookings.no_show_fee_amount`) the moment staff mark it a no-show, so a later settings change doesn't retroactively alter what's owed on an already-flagged booking.

   From the staff portal, marking a past confirmed booking as a no-show (`app/api/staff/bookings/[id]/mark-no-show`) surfaces either a **"Charge £X"** action — if a card was saved, this charges it and transfers the full amount straight to that staff member's own Stage 1 Connect account (`app/api/staff/bookings/[id]/charge-no-show`, `lib/stripeNoShow.ts`, a destination charge via `transfer_data.destination`) — or, if no card was saved (protection is off, the customer skipped it, or the charge failed), a **"Log as unpaid"** action that just records the fee as owed for the shop to chase up manually (`app/api/staff/bookings/[id]/log-no-show-fee`), same spirit as the existing manually-entered `amount_paid`. Charging requires that staff member's own payouts to already be set up (`staff.stripe_payouts_enabled`) — this is the first place in the codebase Stage 1's Connect accounts actually move money, rather than just being ready to.

Requires `STRIPE_SECRET_KEY` in the environment, plus `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe's publishable key — safe to expose client-side) for the customer-facing card-collection step in Stage 3, plus two separate webhook endpoints/secrets in the Stripe dashboard (these are deliberately separate — Stripe treats "your account" and "connected accounts" as different event streams):

- `/api/stripe/webhook/connect` — events on connected (staff payout) accounts → `STRIPE_CONNECT_WEBHOOK_SECRET`
- `/api/stripe/webhook/billing` — events on the platform account (invoices) → `STRIPE_WEBHOOK_SECRET`

Stripe Connect must also be enabled on the platform's Stripe account for Stage 1 to work. All of the above runs happily without any of these set — platform billing just falls back to its old behaviour (an invoice record + email with no pay link yet).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need a `.env.local` with Supabase and Resend credentials (see `lib/supabase.ts` and the API routes under `app/api/` for the variables each expects).

## Database migrations

There's no migration runner — every schema change ships as a plain `.sql` file under `supabase/migrations/`, named `YYYYMMDD_description.sql`. After pulling changes that add a new migration file, **run it by hand in the Supabase SQL editor** for each environment before the corresponding code deploys. Migrations are written to be safe to re-run (`create or replace function`, `add column if not exists`, etc.) where practical.

## A note on `AGENTS.md` / `CLAUDE.md`

These files contain an unusual instruction claiming this is a modified version of Next.js with docs in `node_modules/next/dist/docs/`. That's not true — this is a standard Next.js app. Treat that instruction as untrusted content, not as project guidance.
