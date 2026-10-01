'use client'

import { useState } from 'react'
import Link from 'next/link'
import { slugifySubdomain } from '@/lib/subdomain'
import '../home.css'
import '../signup/signup.css'

// TrimBooking has no single shared login — each business logs in at its own
// yourshop.trimbooking.co.uk/login. This page is just a quick way to get
// there without remembering the exact address: type your shop's name or
// web address, and it sends you to the right place.
function extractSubdomain(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '')
  s = s.replace(/\/.*$/, '')
  if (s.endsWith('.trimbooking.co.uk')) {
    s = s.slice(0, -'.trimbooking.co.uk'.length)
  }
  return slugifySubdomain(s)
}

export default function LoginRedirectPage() {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function goToLogin(e: React.FormEvent) {
    e.preventDefault()
    const subdomain = extractSubdomain(input)
    if (!subdomain) {
      setError('Enter your shop’s name or web address.')
      return
    }
    window.location.href = `https://${subdomain}.trimbooking.co.uk/login`
  }

  return (
    <div className="home">
      <nav className="home-nav">
        <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          TrimBooking
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            Home
          </Link>
          <Link href="/how-it-works" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            How it works
          </Link>
          <Link href="/pricing" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            Pricing
          </Link>
          <Link href="/guide" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            User guide
          </Link>
          <Link href="/about" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
            About
          </Link>
          <Link href="/signup" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <div className="signup-wrap">
        <div className="home-hero" style={{ padding: 0, marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem' }}>Staff &amp; owner login</h1>
          <p>
            This is for shop owners and staff only — customers don&apos;t need
            an account to book an appointment. Every TrimBooking business has
            its own login page; enter your shop&apos;s name or web address
            below and we&apos;ll take you there.
          </p>
        </div>

        <div className="signup-card">
          <form onSubmit={goToLogin}>
            <div className="signup-field">
              <label className="signup-label" htmlFor="shop-address">Your shop&apos;s web address</label>
              <div className="signup-subdomain-row">
                <input
                  id="shop-address"
                  className="signup-input"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError('') }}
                  placeholder="yourshop"
                  autoFocus
                />
                <span className="signup-subdomain-suffix">.trimbooking.co.uk</span>
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
            </div>
            <button type="submit" className="btn-dark" style={{ width: '100%', marginTop: '0.5rem' }}>
              Continue to login
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
          Don&apos;t have a shop yet? <Link href="/signup" style={{ color: 'var(--ink)', fontWeight: 600 }}>Get started free</Link>
        </p>
      </div>
    </div>
  )
}
