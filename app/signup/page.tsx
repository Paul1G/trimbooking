'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { slugifySubdomain, validateSubdomain } from '@/lib/subdomain'
import '../home.css'
import './signup.css'

export default function SignupPage() {
  const [shopName, setShopName] = useState('')
  const [subdomainInput, setSubdomainInput] = useState('')
  const [subdomainTouched, setSubdomainTouched] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Result of the most recently completed availability check — compared against
  // the current `subdomain` at render time to know whether a check is still in flight,
  // rather than tracking a separate "checking" flag set synchronously in the effect.
  const [lastChecked, setLastChecked] = useState<{ subdomain: string; taken: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [siteReady, setSiteReady] = useState(false)

  // Auto-suggested from the shop name until the person edits the address themselves —
  // computed at render time rather than mirrored into its own state.
  const subdomain = subdomainTouched ? subdomainInput : slugifySubdomain(shopName)
  const subdomainError = subdomain ? validateSubdomain(subdomain) : null

  // Live availability check, debounced. State is only ever set from within the
  // async callback, never synchronously in the effect body.
  useEffect(() => {
    if (!subdomain || subdomainError) return

    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('tenants').select('id').eq('subdomain', subdomain).maybeSingle()
      setLastChecked({ subdomain, taken: !!data })
    }, 400)
    return () => clearTimeout(timeout)
  }, [subdomain, subdomainError])

  // Once signup succeeds, a fresh Vercel domain can take up to a minute or so
  // to finish issuing its SSL certificate — poll until the shop's own login
  // page actually responds before sending the owner there, rather than
  // handing them a link that may still 404 or show a certificate warning.
  useEffect(() => {
    if (!done) return
    let cancelled = false
    let attempts = 0
    const maxAttempts = 40 // ~2 minutes at 3s intervals

    async function poll() {
      if (cancelled) return
      attempts += 1
      try {
        const res = await fetch(`/api/signup/status?subdomain=${encodeURIComponent(done as string)}`)
        const result = await res.json()
        if (result.ready) {
          if (!cancelled) setSiteReady(true)
          return
        }
      } catch {
        // Keep polling — a transient failure here isn't fatal.
      }
      if (cancelled) return
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000)
      } else {
        // Give up waiting so the owner isn't stuck forever; the link may just need a retry.
        setSiteReady(true)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [done])

  const isChecking = !subdomainError && !!subdomain && lastChecked?.subdomain !== subdomain
  const remoteStatus: 'checking' | 'available' | 'taken' | null = subdomainError
    ? null
    : isChecking
    ? 'checking'
    : lastChecked?.subdomain === subdomain
    ? (lastChecked.taken ? 'taken' : 'available')
    : null

  async function handleSubmit() {
    setError('')
    if (!shopName.trim()) {
      setError('Please enter your shop name.')
      return
    }
    if (subdomainError) {
      setError(subdomainError)
      return
    }
    if (remoteStatus === 'taken') {
      setError('That address is already taken — please choose another.')
      return
    }
    if (!email || !password) {
      setError('Please fill in your email and choose a password.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, subdomain, email, password }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      setDone(result.subdomain)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    const loginUrl = `https://${done}.trimbooking.co.uk/login`
    return (
      <div className="home">
        <div className="signup-wrap">
          <div className="signup-card" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.6rem', marginTop: 0 }}>Your shop is ready! 🎉</h1>
            <p style={{ color: 'var(--muted)' }}>
              <strong>{done}.trimbooking.co.uk</strong> is being set up.
            </p>
            {siteReady ? (
              <>
                <p style={{ color: 'var(--muted)' }}>Log in to add your services, staff and opening hours.</p>
                <a className="btn-dark" href={loginUrl} style={{ marginTop: '1rem' }}>
                  Log in to your dashboard
                </a>
              </>
            ) : (
              <p style={{ color: '#999', fontSize: '0.9rem' }}>
                Setting up your shop&apos;s web address — this usually takes under a minute...
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  let availabilityInfo: { text: string; color: string } | null = null
  if (subdomain) {
    if (subdomainError) {
      availabilityInfo = { text: subdomainError, color: '#dc2626' }
    } else if (remoteStatus === 'checking') {
      availabilityInfo = { text: 'Checking availability...', color: '#999' }
    } else if (remoteStatus === 'available') {
      availabilityInfo = { text: '✓ Available', color: '#166534' }
    } else if (remoteStatus === 'taken') {
      availabilityInfo = { text: 'Already taken', color: '#dc2626' }
    }
  }

  return (
    <div className="home">
      <nav className="home-nav">
        <span className="logo">TrimBooking</span>
      </nav>

      <div className="signup-wrap">
        <div className="signup-card">
          <h1 style={{ fontSize: '1.6rem', marginTop: 0, marginBottom: '0.3rem' }}>Set up your shop</h1>
          <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: '1.75rem' }}>
            Get your own branded booking page in under a minute.
          </p>

          <div className="signup-field">
            <label className="signup-label">Shop name</label>
            <input
              className="signup-input"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. The Style Bar"
            />
          </div>

          <div className="signup-field">
            <label className="signup-label">Your web address</label>
            <div className="signup-subdomain-row">
              <input
                className="signup-input"
                value={subdomain}
                onChange={(e) => { setSubdomainTouched(true); setSubdomainInput(slugifySubdomain(e.target.value)) }}
                placeholder="yourshop"
              />
              <span className="signup-subdomain-suffix">.trimbooking.co.uk</span>
            </div>
            {availabilityInfo && (
              <p style={{ fontSize: '0.8rem', color: availabilityInfo.color, margin: '0.4rem 0 0' }}>
                {availabilityInfo.text}
              </p>
            )}
          </div>

          <div className="signup-field">
            <label className="signup-label">Email address</label>
            <input
              className="signup-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="signup-field">
            <label className="signup-label">Password</label>
            <input
              className="signup-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}

          <button className="btn-dark" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Setting up your shop...' : 'Create my shop'}
          </button>
        </div>
      </div>
    </div>
  )
}
