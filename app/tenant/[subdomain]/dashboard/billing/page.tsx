'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { BASE_FEE_PENCE, INCLUDED_STAFF, EXTRA_STAFF_FEE_PENCE } from '@/lib/billing'
import '../../tenant.css'

type Tenant = {
  id: string
  name: string
  subdomain: string
  owner_id: string
  paid: boolean
  disabled: boolean
  trial_ends_at: string | null
  billing_method: 'invoice' | 'subscription'
}

function money(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export default function BillingPage() {
  const router = useRouter()
  const params = useParams()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [staffCount, setStaffCount] = useState(0)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', params.subdomain)
        .single()

      if (!tenantData || tenantData.owner_id !== user.id) {
        router.push('/login')
        return
      }

      setTenant(tenantData)

      const { count } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantData.id)
      setStaffCount(count ?? 0)
      setChecking(false)
    }
    load()

    const query = new URLSearchParams(window.location.search)
    if (query.get('subscribed')) {
      setNotice("You're set up on automatic monthly billing — this may take a moment to update below.")
    } else if (query.get('cancelled')) {
      setNotice('Checkout was cancelled — your billing method is unchanged.')
    }
  }, [params.subdomain, router])

  async function switchToSubscription() {
    setBusy(true)
    setError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch('/api/owner/stripe/subscription-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ subdomain: params.subdomain }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)

    if (!res.ok || !body.url) {
      setError(body.error || 'Could not start checkout.')
      return
    }
    window.location.href = body.url
  }

  async function switchToInvoice() {
    if (!window.confirm('Switch back to paying by invoice each month? Your card will no longer be charged automatically.')) {
      return
    }
    setBusy(true)
    setError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    const res = await fetch('/api/owner/stripe/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ subdomain: params.subdomain }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)

    if (!res.ok) {
      setError(body.error || 'Could not switch billing method.')
      return
    }
    setTenant((t) => (t ? { ...t, billing_method: 'invoice' } : t))
    setNotice("You're back on pay-by-invoice — you'll get an email each month with a link to pay.")
  }

  if (checking || !tenant) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-app">
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>Billing</h1>
        </div>

        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          <Link href="/dashboard">← Back to dashboard</Link>
        </p>

        {notice && (
          <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: '#1e3a8a', fontSize: '0.9rem' }}>{notice}</p>
          </div>
        )}
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Current plan</div>
          <p style={{ color: '#555', fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
            {staffCount} staff member{staffCount === 1 ? '' : 's'}
          </p>
          <p style={{ color: '#555', fontSize: '0.95rem', margin: 0 }}>
            Billed as:{' '}
            <strong>
              {tenant.billing_method === 'subscription' ? 'Automatic monthly card payment' : 'Invoice (pay by link each month)'}
            </strong>
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div
            style={{
              background: '#fff',
              border: tenant.billing_method === 'invoice' ? '2px solid #111' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Pay by invoice</div>
            <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
              An email arrives each month with a secure Stripe payment link. You click to pay — nothing is charged
              automatically, and no card is ever stored by TrimBooking.
            </p>
            {tenant.billing_method === 'invoice' ? (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>✓ Current method</span>
            ) : (
              <button
                className="btn-primary"
                style={{ background: 'transparent', color: '#666', border: '1px solid #ddd' }}
                onClick={switchToInvoice}
                disabled={busy}
              >
                Switch to pay by invoice
              </button>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              border: tenant.billing_method === 'subscription' ? '2px solid #111' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Automatic monthly billing</div>
            <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Add a card once via Stripe, and you&apos;re charged automatically every month — nothing to click. Your
              card details are handled entirely by Stripe; TrimBooking never sees or stores them.
            </p>
            {tenant.billing_method === 'subscription' ? (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>✓ Current method</span>
            ) : (
              <button className="btn-primary" onClick={switchToSubscription} disabled={busy}>
                Switch to automatic billing
              </button>
            )}
          </div>
        </div>

        <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          Your monthly amount is based on your current staff count ({staffCount} right now) — {money(BASE_FEE_PENCE)} for
          up to {INCLUDED_STAFF} staff, plus {money(EXTRA_STAFF_FEE_PENCE)}/month for each staff member beyond that.
        </p>
      </div>
    </div>
  )
}
