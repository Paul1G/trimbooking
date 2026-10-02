import { stripe } from './stripe'
import { poundsToPence } from './noShow'

// Server-only helpers for Stage 3 (no-show protection). Distinct from
// lib/stripeBilling.ts, which is the shop paying TrimBooking — this is a
// shop's own customer, and the money (when charged) goes to the staff
// member who had the booking via their Stage 1 Connect account, not to
// TrimBooking.

// Creates a Stripe Customer for this one booking attempt and a SetupIntent
// so the customer can add a card with nothing charged yet. Not deduplicated
// against a returning customer's previous card — each booking that needs
// one gets its own Stripe Customer, kept simple since there's no existing
// customer-identity table to key off.
export async function createNoShowSetupIntent({
  tenantId,
  customerName,
  customerEmail,
}: {
  tenantId: string
  customerName: string
  customerEmail: string
}): Promise<{ clientSecret: string; customerId: string } | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null

  try {
    const customer = await stripe.customers.create({
      name: customerName,
      email: customerEmail,
      metadata: { tenant_id: tenantId, purpose: 'no_show_protection' },
    })

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session',
      metadata: { tenant_id: tenantId },
    })

    if (!setupIntent.client_secret) return null
    return { clientSecret: setupIntent.client_secret, customerId: customer.id }
  } catch (err: any) {
    console.error('createNoShowSetupIntent failed:', err?.message || err)
    return null
  }
}

// Charges the saved card for a no-show fee, transferring the full amount to
// the staff member's own Connect account (destination charge) rather than
// settling into TrimBooking's balance — the fee belongs to the staff member
// who held the slot, same as the in-person payment would have.
export async function chargeNoShowFee({
  customerId,
  paymentMethodId,
  amountPounds,
  staffStripeAccountId,
  description,
}: {
  customerId: string
  paymentMethodId: string
  amountPounds: number
  staffStripeAccountId: string
  description: string
}): Promise<{ ok: true; paymentIntentId: string } | { ok: false; error: string }> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: 'Payments are not configured.' }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: poundsToPence(amountPounds),
      currency: 'gbp',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description,
      transfer_data: { destination: staffStripeAccountId },
    })

    if (paymentIntent.status !== 'succeeded') {
      return { ok: false, error: `Payment did not complete (status: ${paymentIntent.status}).` }
    }
    return { ok: true, paymentIntentId: paymentIntent.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'The card was declined.' }
  }
}
