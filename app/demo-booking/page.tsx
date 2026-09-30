'use client'

import { useState } from 'react'
import Link from 'next/link'
import '../home.css'
import '../tenant/[subdomain]/tenant.css'

type Service = { id: string; name: string; duration: number; price: number }
type Staff = { id: string; name: string; role: string }

const SERVICES: Service[] = [
  { id: 's1', name: 'Cut & Blow Dry', duration: 45, price: 45 },
  { id: 's2', name: 'Full Colour', duration: 90, price: 85 },
  { id: 's3', name: 'Balayage', duration: 120, price: 120 },
  { id: 's4', name: "Men's Cut", duration: 30, price: 28 },
  { id: 's5', name: 'Lash Lift', duration: 40, price: 35 },
]

const STAFF: Staff[] = [
  { id: 'st1', name: 'Maya Chen', role: 'Senior Stylist' },
  { id: 'st2', name: 'Ade Okafor', role: 'Colour Specialist' },
  { id: 'st3', name: 'Callum Reed', role: 'Barber' },
]

const SLOTS = ['9:00 AM', '9:45 AM', '10:30 AM', '11:15 AM', '1:00 PM', '2:30 PM', '3:15 PM', '4:00 PM']

type Step = 'services' | 'slot' | 'details' | 'review' | 'done'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function DemoBookingPage() {
  const [step, setStep] = useState<Step>('services')
  const [service, setService] = useState<Service | null>(null)
  const [staffId, setStaffId] = useState(STAFF[0].id)
  const [slot, setSlot] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const staffMember = STAFF.find((s) => s.id === staffId)

  function chooseService(s: Service) {
    setService(s)
    setSlot(null)
    setStep('slot')
  }

  function chooseSlot(s: string) {
    setSlot(s)
    setStep('details')
  }

  function reviewDetails() {
    if (!name || !phone || !email) {
      setError('Please fill in your name, phone number, and email.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setStep('review')
  }

  function reset() {
    setStep('services')
    setService(null)
    setSlot(null)
    setName('')
    setPhone('')
    setEmail('')
    setError('')
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

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem' }}>
        <div
          style={{
            background: '#fef9c3',
            border: '1px solid #eab308',
            borderRadius: 12,
            padding: '0.9rem 1.25rem',
            marginTop: '1.5rem',
            fontSize: '0.88rem',
            color: '#854d0e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span>
            You&apos;re viewing a <strong>sample booking page</strong> with made-up services and times —
            this is what a customer sees. No booking is actually made, and no email is sent.
          </span>
          <Link href="/signup" className="btn-dark" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
            Get started free
          </Link>
        </div>
      </div>

      <div className="tenant-app" style={{ background: 'transparent', ['--brand' as any]: '#9d174d' }}>
        <div className="tenant-container">
          {step !== 'services' && step !== 'done' && (
            <a className="back-link" style={{ cursor: 'pointer' }} onClick={() => setStep(step === 'slot' ? 'services' : step === 'details' ? 'slot' : 'details')}>
              ← Back
            </a>
          )}

          {step === 'services' && (
            <>
              <div className="tenant-hero" style={{ marginTop: '1rem' }}>
                <h1>Gloss &amp; Glow Studio</h1>
                <p>Choose a service to book your appointment</p>
              </div>
              <div className="card-list">
                {SERVICES.map((s) => (
                  <div key={s.id} className="card" onClick={() => chooseService(s)} style={{ cursor: 'pointer' }}>
                    <div>
                      <div className="card-title">{s.name}</div>
                      <div className="card-sub">{s.duration} min</div>
                    </div>
                    <div className="card-price">£{s.price}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'slot' && service && (
            <>
              <div className="tenant-hero" style={{ marginTop: '1rem' }}>
                <h1>{service.name}</h1>
                <p>£{service.price} · {service.duration} min</p>
              </div>

              <div className="field-group">
                <label className="field-label">Staff member</label>
                <select
                  className="field-input"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  {STAFF.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                  ))}
                </select>
              </div>

              <h3 className="section-title">Tomorrow — available times</h3>
              <div className="slot-grid">
                {SLOTS.map((s) => (
                  <button key={s} className="slot-btn" onClick={() => chooseSlot(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'details' && service && (
            <>
              <div className="tenant-hero" style={{ marginTop: '1rem' }}>
                <h1>Your details</h1>
                <p>{service.name} with {staffMember?.name} · Tomorrow at {slot}</p>
              </div>

              <div className="field-group">
                <label className="field-label">Name</label>
                <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Phone</label>
                <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07123 456789" />
              </div>
              <div className="field-group">
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              {error && <p className="error-text">{error}</p>}

              <button className="btn-primary" onClick={reviewDetails}>Review booking</button>
            </>
          )}

          {step === 'review' && service && (
            <>
              <div className="tenant-hero" style={{ marginTop: '1rem' }}>
                <h1>Review your booking</h1>
              </div>
              <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.4rem' }}>
                <div className="card-title">{service.name}</div>
                <div className="card-sub">with {staffMember?.name} · Tomorrow at {slot}</div>
                <div className="card-sub">£{service.price} · {service.duration} min</div>
                <div className="card-sub" style={{ marginTop: '0.5rem' }}>{name} · {phone} · {email}</div>
              </div>
              <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setStep('done')}>
                Confirm booking
              </button>
            </>
          )}

          {step === 'done' && service && (
            <div className="confirm-box" style={{ textAlign: 'center' }}>
              <h2 style={{ marginTop: 0 }}>Request sent! 🎉</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                In a real shop, {name || 'the customer'} would now get an email confirming this request,
                and another as soon as the owner confirms it — the same way a customer books on your
                own page.
              </p>
              <button className="btn-primary" onClick={reset}>Try it again</button>
            </div>
          )}
        </div>
      </div>

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/">Home</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/guide">User guide</Link>
          <Link href="/about">About &amp; support</Link>
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  )
}
