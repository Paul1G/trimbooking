import Stripe from 'stripe'

// Server-only Stripe client. Never import this into a client component —
// it's constructed with the secret key, which must stay on the server.
// STRIPE_SECRET_KEY is the platform account's key (test or live, depending
// on environment); Stripe Connect must be enabled on that account in the
// Stripe dashboard before staff can onboard Express accounts.
// Pinned to match the API version already configured on both Connect
// webhook destinations in the dashboard ("2026-08-26.dahlia") — the v2 Core
// Accounts/Account Links shape is still evolving between monthly preview
// versions, and a newer pin (2026-09-30.endive) silently dropped the
// `configurations` field Account Links requires ("Unknown field" error),
// so everything needs to stay on the one version that's actually been
// verified to work end to end.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // This installed SDK version's types only know about '2026-09-30.endive'
  // (the version current when it was published) and reject any other
  // literal at compile time, even though Stripe's API happily accepts any
  // version string — hence the cast.
  apiVersion: '2026-08-26.dahlia' as Stripe.LatestApiVersion,
})
