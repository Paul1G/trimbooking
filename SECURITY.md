# Security Policy & Incident Response Plan

**Business:** TrimBooking (trimbooking.co.uk)
**Scope:** This document covers how TrimBooking handles payment data and
account security, as part of maintaining **PCI DSS SAQ A** eligibility —
the lightest PCI compliance tier, available because TrimBooking never
receives, transmits, processes or stores cardholder data (card number,
expiry, CVC) on its own systems.

Last reviewed: 2026-10-02. Review at least annually, or after any change
to payment flows.

## 1. How cardholder data is handled

TrimBooking's own servers and database **never see a raw card number,
expiry date or CVC**, for any payment flow (platform billing, automatic
subscription billing, or the no-show protection card-on-file):

- All card entry happens inside **Stripe Elements** (`<PaymentElement>`),
  which renders Stripe-hosted iframes. Card data goes directly from the
  customer's browser to Stripe — it never passes through TrimBooking's
  own frontend state or backend.
- TrimBooking's database only ever stores **Stripe tokens/IDs**:
  `stripe_customer_id`, `customer_payment_method_id`, `stripe_subscription_id`,
  `stripe_setup_intent_id`, and similar. None of these can be used to
  reconstruct a card number.
- Logging never includes a full Stripe object, webhook payload, or
  request body on any payment-related route — only scalar identifiers
  (`.id`, `.status`, etc.) or error message strings.
- This is verified by code review whenever a payment-related route is
  added or changed (see Section 4).

**This never changes without this document being updated first.** Any
future feature that would require TrimBooking to directly handle a card
number is out of scope and will not be built — it would require full
PCI DSS Level 1 certification, which is disproportionate to this
business's size and not something to take on.

## 2. Script authorization & monitoring (PCI DSS 4.0.1, Requirements 6.4.3 & 11.6.1)

The booking page (`/book`) is where Stripe's PaymentElement loads, so it's
the page these requirements apply to.

- **Authorized scripts on `/book`:** Next.js/React application bundle,
  Stripe.js (loaded from `js.stripe.com`), and Google Fonts stylesheet
  (no script execution). No analytics, chat widgets, or third-party
  trackers are loaded on this page.
- **Action:** obtain Stripe's written attestation that Stripe Elements'
  embedded integration includes script-tampering protection (covers
  6.4.3/11.6.1 without building custom monitoring). Track this as an open
  item — see Section 5.
- If a new third-party script is ever added to `/book`, it must be
  recorded here with its purpose, source domain, and date added.

## 3. Account access & authentication

- The Stripe dashboard and Supabase project are administered solely by
  the business owner.
- **Passwords:** minimum 12 characters, mixed alphanumeric, for any login
  with access to Stripe or Supabase.
- **MFA:** enabled on the Stripe dashboard account and the Supabase
  account (authenticator app, not SMS).
- Staff portal logins (`/staff`) never have access to payment
  configuration, Stripe dashboard, or raw customer payment data — only
  their own booking schedule and (for Admin-access staff) the ability to
  record a manually-taken payment amount, which is independent of the
  Stripe integration.

## 4. Change control

Before merging any change that touches a Stripe-related file
(`lib/stripe*.ts`, `app/api/stripe/**`, `app/api/bookings/setup-intent`,
`app/api/staff/bookings/[id]/charge-no-show`, `app/api/owner/stripe/**`,
or any card-collection UI), review for:

- No raw card field (number, CVC, expiry) is read, stored, or logged.
- No full Stripe object, webhook event, or request body is logged.
- Any new database column or API payload storing payment data is a
  Stripe token/ID, never a card field.

## 5. Open items

- [ ] Obtain and file Stripe's written script-protection attestation
      (Requirements 6.4.3 / 11.6.1).
- [ ] Confirm MFA is enabled on both the Stripe and Supabase accounts.
- [ ] Complete the official SAQ A self-assessment form (via Stripe or
      acquiring bank) and file it alongside this document.
- [ ] Re-review this document annually or after any payment-flow change.

## 6. Incident response plan

If a security incident is suspected (unauthorized access to Stripe or
Supabase, a leaked credential, suspicious activity in the Stripe
dashboard, or a report of unexpected charges):

1. **Contain** — rotate the affected credential immediately (Stripe API
   key via the Stripe dashboard, Supabase service-role key via the
   Supabase dashboard, or the owner's own login password). Revoked keys
   take effect immediately.
2. **Assess** — check the Stripe dashboard's event/audit log and Supabase
   auth logs for the access window in question. Because TrimBooking never
   stores raw card data, a breach of TrimBooking's own database cannot
   expose card numbers — only Stripe tokens, which are not usable outside
   TrimBooking's own authenticated Stripe account, and booking/contact
   details.
3. **Notify** — if customer contact details (name, email, phone) were
   exposed, notify affected customers and, if required by UK GDPR
   (likely, for any breach involving personal data), report to the ICO
   within 72 hours of becoming aware. If Stripe's own systems were
   affected, follow Stripe's incident disclosures and guidance directly.
4. **Record** — log what happened, when it was detected, what was
   affected, and what was done, in a dated entry below this section.
5. **Review** — update this document and any related code/process to
   close the gap that allowed the incident.

### Incident log

_No incidents recorded._
