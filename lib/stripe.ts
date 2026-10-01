import Stripe from 'stripe'

// Server-only Stripe client. Never import this into a client component —
// it's constructed with the secret key, which must stay on the server.
// STRIPE_SECRET_KEY is the platform account's key (test or live, depending
// on environment); Stripe Connect must be enabled on that account in the
// Stripe dashboard before staff can onboard Express accounts.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-09-30.endive',
})
