'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Offer = {
  status: string
  customer_name: string
  service_name: string
  staff_name: string
  tenant_name: string
  offered_slot_start: string
  offered_slot_end: string
  offer_expires_at: string
}

export default function WaitlistOfferClient({
  offer: initialOffer,
  token,
  subdomain,
}: {
  offer: Offer
  token: string
  subdomain: string
}) {
  const [offer, setOffer] = useState(initialOffer)
  const [saving, setSaving] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isExpiredByTime = new Date(offer.offer_expires_at) < new Date()
  const canRespond = offer.status === 'offered' && !isExpiredByTime

  const dateStr = new Date(offer.offered_slot_start).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function handleAccept() {
    setSaving('accept')
    setError('')
    const { data, error: rpcError } = await supabase.rpc('waitlist_accept_offer', { p_token: token })
    const result = data?.[0]
    setSaving(null)

    if (rpcError || !result?.ok) {
      setError(result?.message || rpcError?.message || 'Something went wrong — please try again.')
      return
    }

    setOffer({ ...offer, status: 'accepted' })
    setMessage("You're booked in! A confirmation email is on its way.")
  }

  async function handleDecline() {
    setSaving('decline')
    setError('')
    const { data, error: rpcError } = await supabase.rpc('waitlist_decline_offer', { p_token: token })
    const result = data?.[0]
    setSaving(null)

    if (rpcError || !result?.ok) {
      setError(result?.message || rpcError?.message || 'Something went wrong — please try again.')
      return
    }

    setOffer({ ...offer, status: 'declined' })
    setMessage('No problem — we\'ve let the shop know and offered the slot to the next person waiting.')

    // Immediately try the next person in line for this same freed slot,
    // rather than waiting for the next expiry-sweep cron run.
    offerNextInLine(result)
  }

  async function offerNextInLine(declined: {
    tenant_id: string
    staff_id: string
    offered_slot_start: string
    offered_slot_end: string
  }) {
    try {
      const { data: matchRows } = await supabase.rpc('match_waitlist_for_cancellation', {
        p_tenant_id: declined.tenant_id,
        p_staff_id: declined.staff_id,
        p_slot_start: declined.offered_slot_start,
        p_slot_end: declined.offered_slot_end,
      })
      const match = matchRows?.[0]
      if (!match) return

      const { data: service } = await supabase.from('services').select('name').eq('id', match.service_id).maybeSingle()

      await fetch('/api/send-waitlist-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: offer.tenant_name,
          subdomain,
          customerEmail: match.customer_email,
          customerName: match.customer_name,
          serviceName: service?.name,
          staffName: offer.staff_name,
          offeredStart: match.offered_slot_start,
          offerToken: match.offer_token,
        }),
      })
    } catch {
      // Best-effort — the decline itself already succeeded, and the daily
      // expiry-sweep cron will catch this slot if this attempt fails.
    }
  }

  return (
    <div>
      <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem' }}>
        <div className="card-title" style={{ fontSize: '1.1rem' }}>{offer.service_name}</div>
        <div className="card-sub" style={{ marginBottom: '0.75rem' }}>with {offer.staff_name} · {offer.tenant_name}</div>
        <p style={{ margin: 0 }}>{dateStr}</p>
      </div>

      {message && <p style={{ color: '#166534', fontSize: '0.9rem', marginTop: '1rem' }}>{message}</p>}
      {error && <p className="error-text">{error}</p>}

      {canRespond && !message && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
            This slot is held for you until{' '}
            {new Date(offer.offer_expires_at).toLocaleString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
            . After that it goes to the next person waiting.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn-primary" onClick={handleAccept} disabled={saving !== null}>
              {saving === 'accept' ? 'Booking...' : 'Accept this slot'}
            </button>
            <button
              onClick={handleDecline}
              disabled={saving !== null}
              style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, cursor: 'pointer' }}
            >
              {saving === 'decline' ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </>
      )}

      {!canRespond && !message && offer.status === 'accepted' && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>You&apos;ve already accepted this slot — see you then!</p>
      )}
      {!canRespond && !message && offer.status === 'declined' && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>You declined this slot.</p>
      )}
      {!canRespond && !message && (offer.status === 'expired' || isExpiredByTime) && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>This offer has expired and was offered to the next person waiting.</p>
      )}
    </div>
  )
}
