'use client'

import { useState } from 'react'
import Link from 'next/link'
import '../home.css'
import '../tenant/[subdomain]/tenant.css'

type BookingStatus = 'pending' | 'confirmed' | 'declined'

type Booking = {
  id: string
  time: string
  customer: string
  service: string
  staff: string
  status: BookingStatus
}

const INITIAL_BOOKINGS: Booking[] = [
  { id: '1', time: '9:00 AM', customer: 'Sophie Bennett', service: 'Cut & Blow Dry', staff: 'Maya Chen', status: 'confirmed' },
  { id: '2', time: '10:30 AM', customer: 'Jordan Lee', service: 'Full Colour', staff: 'Ade Okafor', status: 'pending' },
  { id: '3', time: '11:15 AM', customer: 'Priya Sharma', service: 'Lash Lift', staff: 'Maya Chen', status: 'pending' },
  { id: '4', time: '1:00 PM', customer: 'Tom Whitfield', service: "Men's Cut", staff: 'Callum Reed', status: 'confirmed' },
  { id: '5', time: '2:30 PM', customer: 'Freya Nilsen', service: 'Balayage', staff: 'Ade Okafor', status: 'pending' },
]

const STAFF = [
  { name: 'Maya Chen', role: 'Senior Stylist' },
  { name: 'Ade Okafor', role: 'Colour Specialist' },
  { name: 'Callum Reed', role: 'Barber' },
]

function statusColors(status: BookingStatus) {
  if (status === 'pending') return { bg: '#fef9c3', color: '#854d0e' }
  if (status === 'confirmed') return { bg: '#dcfce7', color: '#166534' }
  return { bg: '#fee2e2', color: '#991b1b' }
}

export default function DemoDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS)

  function setStatus(id: string, status: BookingStatus) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }

  const confirmedToday = bookings.filter((b) => b.status === 'confirmed')
  const pendingCount = bookings.filter((b) => b.status === 'pending').length

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
            You&apos;re viewing a <strong>sample dashboard</strong> with made-up data — this is what a
            shop owner sees, not a real shop. Nothing you click here is saved.
          </span>
          <Link href="/signup" className="btn-dark" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
            Get started free
          </Link>
        </div>
      </div>

      <div className="tenant-app" style={{ background: 'transparent', ['--brand' as any]: '#9d174d' }}>
        <div className="tenant-container">
          <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
            <h1>Gloss &amp; Glow Studio — Dashboard</h1>
            <p>Sample data, for illustration only.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <div className="card" style={{ cursor: 'default', flex: '1 1 150px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
              <div className="card-sub">Today&apos;s bookings</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand)' }}>{bookings.length}</div>
            </div>
            <div className="card" style={{ cursor: 'default', flex: '1 1 150px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
              <div className="card-sub">Awaiting your response</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{pendingCount}</div>
            </div>
            <div className="card" style={{ cursor: 'default', flex: '1 1 150px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
              <div className="card-sub">Confirmed today</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{confirmedToday.length}</div>
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: 0 }}>Today&apos;s bookings</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1rem' }}>
            Try confirming or declining a request below — it&apos;s just for show.
          </p>
          <div className="card-list">
            {bookings.map((b) => {
              const colors = statusColors(b.status)
              return (
                <div key={b.id} className="card" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div className="card-title">{b.time} · {b.customer}</div>
                    <div className="card-sub">{b.service} with {b.staff}</div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                      textTransform: 'capitalize', background: colors.bg, color: colors.color,
                    }}
                  >
                    {b.status}
                  </span>
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setStatus(b.id, 'confirmed')}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setStatus(b.id, 'declined')}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <h3 className="section-title">Your team</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1rem' }}>
            You see each person&apos;s booking schedule — click through for a day or
            week view. Earnings stay private to each staff member, visible only
            from their own portal.
          </p>
          <div className="card-list">
            {STAFF.map((s) => {
              const staffToday = bookings.filter((b) => b.staff === s.name)
              return (
                <div key={s.name} className="card" style={{ cursor: 'default' }}>
                  <div className="avatar-fallback">{s.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{s.name}</div>
                    <div className="card-sub">{s.role}</div>
                  </div>
                  <div className="card-price">{staffToday.length} booking{staffToday.length === 1 ? '' : 's'} today</div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/signup" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Set up your own shop, free for 30 days
            </Link>
          </div>
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
