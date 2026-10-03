'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { supabase } from '@/lib/supabase'
import AvailabilityPicker, { WorkingHours, BreakWindows } from '../AvailabilityPicker'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// The card-collection step for no-show protection. Rendered inside
// <Elements>, which is what useStripe()/useElements() need — kept as its own
// component rather than inline since those hooks can't be called in the
// component that creates the <Elements> provider itself.
function NoShowCardStep({
  cardRequired,
  submitting,
  onSaved,
  onSkip,
}: {
  cardRequired: boolean
  submitting: boolean
  onSaved: (paymentMethodId: string) => void
  onSkip: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [confirming, setConfirming] = useState(false)
  const [cardError, setCardError] = useState('')

  async function handleConfirm() {
    if (!stripe || !elements) return
    setConfirming(true)
    setCardError('')

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    setConfirming(false)

    if (error) {
      setCardError(error.message || 'Could not save this card.')
      return
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === 'string' ? setupIntent.payment_method : setupIntent?.payment_method?.id

    if (!paymentMethodId) {
      setCardError('Could not save this card.')
      return
    }

    onSaved(paymentMethodId)
  }

  return (
    <div>
      <PaymentElement />
      {cardError && <p className="error-text">{cardError}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={handleConfirm} disabled={!stripe || confirming || submitting}>
          {confirming || submitting ? 'Confirming...' : 'Save card & confirm booking'}
        </button>
        {!cardRequired && (
          <button
            onClick={onSkip}
            disabled={confirming || submitting}
            style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
          >
            Skip — book without a card
          </button>
        )}
      </div>
    </div>
  )
}

type Staff = {
  id: string
  name: string
  role: string
  working_hours: WorkingHours
  breaks?: BreakWindows | null
  auto_confirm_bookings?: boolean | null
}
type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
  allow_parallel?: boolean | null
  contact_windows?: [number, number][] | null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(?:(?:\+44|0)(?:7\d{9}|1\d{9}|2\d{9}|3\d{9}))$/.test(cleaned)
}

function randomToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function formatDateTime(dateStr: string, slot: string): string {
  const [h, m] = slot.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return d.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Step = 'details' | 'review' | 'card' | 'done'

export default function BookingForm({
  tenantId,
  tenantName,
  subdomain,
  service,
  staffList,
  shopOpeningHours,
  noShowProtectionEnabled,
  noShowCardRequired,
  noShowFeeAmount,
}: {
  tenantId: string
  tenantName: string
  subdomain: string
  service: Service
  staffList: Staff[]
  shopOpeningHours: WorkingHours
  noShowProtectionEnabled: boolean
  noShowCardRequired: boolean
  noShowFeeAmount: number | null
}) {
  const [step, setStep] = useState<Step>('details')
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '')
  const [selection, setSelection] = useState<{ date: string; slot: string } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmedManageUrl, setConfirmedManageUrl] = useState('')
  const [error, setError] = useState('')
  const [lastBooking, setLastBooking] = useState<{ start_time: string; service_name: string | null } | null>(null)
  const [cardSetup, setCardSetup] = useState<{ clientSecret: string; customerId: string } | null>(null)
  const [startingCard, setStartingCard] = useState(false)

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId)

  async function handleReview() {
    if (!selection || !name || !phone || !email) {
      setError('Please fill in your name, phone number, and email.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isValidUKPhone(phone)) {
      setError('Please enter a valid UK phone number, e.g. 07123 456789 or 0131 281 1942.')
      return
    }
    setError('')

    // Best-effort lookup of this customer's last visit, so they can see it
    // on the review screen alongside the new booking they're about to make.
    const { data } = await supabase.rpc('get_customer_last_booking', {
      p_tenant_id: tenantId,
      p_email: email,
      p_phone: phone,
    })
    setLastBooking((data as { start_time: string; service_name: string | null } | null) || null)

    setStep('review')
  }

  // If this shop has no-show protection on, "Confirm booking" doesn't insert
  // the booking straight away — it first asks Stripe for a SetupIntent so
  // the next step can collect a card (or let the customer skip, when the
  // shop allows that).
  async function handleReviewConfirm() {
    if (!noShowProtectionEnabled) {
      await handleFinalConfirm()
      return
    }
    if (!stripePromise) {
      setError("This shop's card setup isn't configured correctly — please contact the shop directly.")
      return
    }

    setStartingCard(true)
    setError('')
    const res = await fetch('/api/bookings/setup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, customerName: name, customerEmail: email }),
    })
    const body = await res.json().catch(() => ({}))
    setStartingCard(false)

    if (!res.ok || !body.clientSecret) {
      setError(body.error || 'Could not start card setup.')
      return
    }

    setCardSetup({ clientSecret: body.clientSecret, customerId: body.customerId })
    setStep('card')
  }

  async function handleFinalConfirm(cardDetails?: { customerId: string; paymentMethodId: string } | null) {
    if (!selection) return
    setSubmitting(true)
    setError('')

    const [h, m] = selection.slot.split(':').map(Number)
    const startTime = new Date(selection.date + 'T00:00:00')
    startTime.setHours(h, m, 0, 0)
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)
    const manageToken = randomToken()

    // A staff member with "auto-confirm" turned on skips the pending/review
    // step entirely — the booking is created already confirmed.
    const autoConfirm = !!selectedStaff?.auto_confirm_bookings
    const initialStatus = autoConfirm ? 'confirmed' : 'pending'

    const { error: insertError } = await supabase.from('bookings').insert({
      tenant_id: tenantId,
      staff_id: selectedStaffId,
      service_id: service.id,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      status: initialStatus,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      manage_token: manageToken,
      customer_stripe_customer_id: cardDetails?.customerId || null,
      customer_payment_method_id: cardDetails?.paymentMethodId || null,
    })

    if (insertError) {
      setSubmitting(false)
      setError('Something went wrong: ' + insertError.message)
      return
    }

    const manageUrl = `https://${subdomain}.trimbooking.co.uk/manage/${manageToken}`
    setConfirmedManageUrl(manageUrl)

    // Fire the confirmation email, but don't block the UI on it
    fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: autoConfirm ? 'confirmed' : 'requested',
        tenantName,
        customerEmail: email,
        customerName: name,
        serviceName: service.name,
        staffName: selectedStaff?.name,
        startTime: startTime.toISOString(),
        manageUrl,
      }),
    }).catch(() => {
      // Booking already succeeded in the database; a failed email shouldn't block the user
    })

    setSubmitting(false)
    setStep('done')
  }

  if (step === 'done') {
    const autoConfirmed = !!selectedStaff?.auto_confirm_bookings
    return (
      <div className="confirm-box">
        <h3 style={{ marginTop: 0 }}>{autoConfirmed ? 'Booking confirmed!' : 'Booking request sent!'}</h3>
        <p>{service.name} with {selectedStaff?.name} on {selection && formatDateTime(selection.date, selection.slot)}.</p>
        <p style={{ color: '#666' }}>
          {autoConfirmed ? "You're all set — see you then!" : 'The shop will confirm your appointment shortly.'}
        </p>
        <p style={{ color: '#166534' }}>A confirmation has been noted for {email}.</p>
        {confirmedManageUrl && (
          <p>
            <a href={confirmedManageUrl}>Manage or reschedule this booking</a>
          </p>
        )}
        <p style={{ marginBottom: 0 }}>
          <Link href="/">&larr; Back to {tenantName}</Link>
        </p>
      </div>
    )
  }

  if (step === 'review' && selection) {
    return (
      <div>
        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <div className="card-title" style={{ fontSize: '1.1rem' }}>{service.name}</div>
              <div className="card-sub">with {selectedStaff?.name}</div>
            </div>
            <span
              style={{
                fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                background: '#fef9c3', color: '#854d0e', whiteSpace: 'nowrap',
              }}
            >
              Not booked yet
            </span>
          </div>

          <p style={{ margin: '0 0 0.4rem' }}>{formatDateTime(selection.date, selection.slot)}</p>
          <p className="card-sub" style={{ margin: 0 }}>£{service.price} · {service.duration_minutes} min</p>

          <div style={{ borderTop: '1px solid var(--border)', margin: '1rem 0 0.75rem' }} />

          <p style={{ margin: '0 0 0.2rem' }}>{name}</p>
          <p className="card-sub" style={{ margin: 0 }}>{phone}</p>
          <p className="card-sub" style={{ margin: 0 }}>{email}</p>

          {lastBooking && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: 0 }}>
              Your last visit was {new Date(lastBooking.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {lastBooking.service_name ? ` for ${lastBooking.service_name}` : ''}.
            </p>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          Please check these details before confirming — the shop will use them to reach you about your appointment.
        </p>

        {noShowProtectionEnabled && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {noShowCardRequired ? "This shop asks for a card to confirm your booking — nothing is charged now." : 'This shop may ask for a card to confirm your booking — nothing is charged now.'}
            {noShowFeeAmount != null && ` A £${noShowFeeAmount.toFixed(2)} fee may apply if you don't show up.`}
          </p>
        )}

        {error && <p className="error-text">{error}</p>}

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          By confirming, you agree to TrimBooking&apos;s{' '}
          <a href="https://trimbooking.co.uk/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>{' '}
          and <a href="https://trimbooking.co.uk/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn-primary" onClick={handleReviewConfirm} disabled={submitting || startingCard}>
            {submitting || startingCard ? 'Booking...' : noShowProtectionEnabled ? 'Continue to add a card' : 'Confirm booking'}
          </button>
          <button
            onClick={() => setStep('details')}
            disabled={submitting || startingCard}
            style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  if (step === 'card' && cardSetup && stripePromise) {
    return (
      <div>
        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Add a card</h3>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Nothing is charged now.{noShowFeeAmount != null && ` A £${noShowFeeAmount.toFixed(2)} fee may apply if you don't show up.`}
          </p>
          <Elements options={{ clientSecret: cardSetup.clientSecret }} stripe={stripePromise}>
            <NoShowCardStep
              cardRequired={noShowCardRequired}
              submitting={submitting}
              onSaved={(paymentMethodId) => handleFinalConfirm({ customerId: cardSetup.customerId, paymentMethodId })}
              onSkip={() => handleFinalConfirm(null)}
            />
          </Elements>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button
          onClick={() => setStep('review')}
          disabled={submitting}
          style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="field-group">
        <label className="field-label">Staff member</label>
        <select
          className="field-input"
          value={selectedStaffId}
          onChange={(e) => { setSelectedStaffId(e.target.value); setSelection(null) }}
        >
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
          ))}
        </select>
      </div>

      {selectedStaff && (
        <AvailabilityPicker
          tenantId={tenantId}
          staff={selectedStaff}
          durationMinutes={service.duration_minutes}
          shopOpeningHours={shopOpeningHours}
          contactWindows={service.allow_parallel ? service.contact_windows || undefined : undefined}
          onSelect={setSelection}
        />
      )}

      {selection && (
        <div style={{ marginTop: '2rem' }}>
          <div className="field-group">
            <label className="field-label">Your name</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Phone number</label>
            <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Email address</label>
            <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" onClick={handleReview}>Review booking</button>
        </div>
      )}
    </div>
  )
}
