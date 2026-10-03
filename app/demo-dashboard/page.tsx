'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import InsightsView from '../tenant/[subdomain]/InsightsView'
import { buildDemoInsights } from '@/lib/demoInsights'
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
  price: number
  amountPaid: number | null
  cardOnFile?: boolean
  noShowFee?: number
}

type DemoVisit = { date: string; service: string }
type DemoHistory = { totalVisits: number; customerSince: string; recentVisits: DemoVisit[] }

const INITIAL_BOOKINGS: Booking[] = [
  { id: '1', time: '9:00 AM', customer: 'Sophie Bennett', service: 'Cut & Blow Dry', staff: 'Maya Chen', status: 'confirmed', price: 45, amountPaid: 45 },
  { id: '2', time: '10:30 AM', customer: 'Jordan Lee', service: 'Full Colour', staff: 'Ade Okafor', status: 'pending', price: 85, amountPaid: null },
  { id: '3', time: '11:15 AM', customer: 'Priya Sharma', service: 'Lash Lift', staff: 'Maya Chen', status: 'pending', price: 35, amountPaid: null },
  { id: '4', time: '1:00 PM', customer: 'Tom Whitfield', service: "Men's Cut", staff: 'Callum Reed', status: 'confirmed', price: 28, amountPaid: null, cardOnFile: true, noShowFee: 14 },
  { id: '5', time: '2:30 PM', customer: 'Freya Nilsen', service: 'Balayage', staff: 'Ade Okafor', status: 'pending', price: 120, amountPaid: null },
]

const STAFF = [
  { name: 'Maya Chen', role: 'Senior Stylist', employed: true },
  { name: 'Ade Okafor', role: 'Colour Specialist', employed: false },
  { name: 'Callum Reed', role: 'Barber', employed: false },
]

// Sample customer history, just for this demo — on a real shop this comes
// from that customer's own actual past visits.
const DEMO_HISTORY: Record<string, DemoHistory> = {
  '1': {
    totalVisits: 6,
    customerSince: '14 Feb 2025 (7 months)',
    recentVisits: [
      { date: '19 Aug 2026', service: 'Cut & Blow Dry' },
      { date: '22 Jun 2026', service: 'Cut & Blow Dry' },
      { date: '2 May 2026', service: 'Root Touch-Up' },
    ],
  },
  '4': {
    totalVisits: 2,
    customerSince: '3 Jul 2026',
    recentVisits: [{ date: '3 Jul 2026', service: "Men's Cut" }],
  },
}

function statusColors(status: BookingStatus) {
  if (status === 'pending') return { bg: '#fef9c3', color: '#854d0e' }
  if (status === 'confirmed') return { bg: '#dcfce7', color: '#166534' }
  return { bg: '#fee2e2', color: '#991b1b' }
}

function money(n: number): string {
  return `£${n.toFixed(2)}`
}

export default function DemoDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [billingMethod, setBillingMethod] = useState<'invoice' | 'subscription'>('invoice')
  const [noShowProtection, setNoShowProtection] = useState(true)
  const [noShowMessage, setNoShowMessage] = useState<string | null>(null)
  // Built after mount, not during the static build, so the dates match the
  // visitor's own "today" and there's no server/client mismatch.
  const onClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const insights = useMemo(() => (onClient ? buildDemoInsights() : null), [onClient])

  function setStatus(id: string, status: BookingStatus) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
  }

  function selectBooking(b: Booking) {
    setSelectedId(b.id)
    setAmountInput(b.amountPaid != null ? String(b.amountPaid) : '')
    setNoShowMessage(null)
  }

  function chargeNoShow(b: Booking) {
    setNoShowMessage(`£${b.noShowFee?.toFixed(2)} charged to ${b.customer}'s card on file, sent straight to ${b.staff}'s payout account.`)
  }

  function saveAmount() {
    if (!selectedId) return
    const value = amountInput.trim() === '' ? null : Number(amountInput)
    setBookings((prev) => prev.map((b) => (b.id === selectedId ? { ...b, amountPaid: value } : b)))
  }

  const selected = bookings.find((b) => b.id === selectedId) || null
  const selectedHistory = selectedId ? DEMO_HISTORY[selectedId] : undefined

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
            Click a booking to see its price, log a payment and pull up the customer&apos;s history — or try confirming/declining a request. It&apos;s all just for show.
          </p>
          <div className="card-list">
            {bookings.map((b) => {
              const colors = statusColors(b.status)
              return (
                <div key={b.id} onClick={() => selectBooking(b)} className="card" style={{ cursor: 'pointer', flexWrap: 'wrap' }}>
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
                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
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
            week view. Mark someone <strong>employed</strong> and their earnings show
            up in your Insights below; leave them <strong>self-employed</strong> (the
            default, for a staff member renting their own chair) and their running
            earnings total stays private, visible only from their own portal.
          </p>
          <div className="card-list">
            {STAFF.map((s) => {
              const staffToday = bookings.filter((b) => b.staff === s.name)
              return (
                <div key={s.name} className="card" style={{ cursor: 'default' }}>
                  <div className="avatar-fallback">{s.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{s.name}{s.employed ? ' · Employed' : ''}</div>
                    <div className="card-sub">{s.role}{s.employed ? '' : ' · Self-employed'}</div>
                  </div>
                  <div className="card-price">{staffToday.length} booking{staffToday.length === 1 ? '' : 's'} today</div>
                </div>
              )
            })}
          </div>

          <h3 id="insights" className="section-title" style={{ scrollMarginTop: '5rem' }}>📈 Insights</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1rem' }}>
            How the shop is doing — switch between this week, last month and this tax year, tap the
            chart and the heatmap. Sample data, just for show.
          </p>
          <div style={{ marginBottom: '1.75rem' }}>
            {insights ? (
              <InsightsView
                bookings={insights.bookings}
                capacity={insights.capacity}
                showMoney
                showContacts
                showStaffTable
                restrictRevenueToEmployed
              />
            ) : (
              <p className="card-sub">Loading sample insights…</p>
            )}
          </div>

          <h3 className="section-title">Billing &amp; no-show protection</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-0.75rem 0 1rem' }}>
            Two settings every shop controls for itself — try flipping them. It&apos;s all just for show.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <div className="card" style={{ cursor: 'default', flex: '1 1 260px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div className="card-title">How you get paid</div>
              <div className="card-sub">
                {billingMethod === 'invoice'
                  ? 'Pay by invoice — a bill arrives each month, nothing to set up.'
                  : 'Automatic billing — a card on file is charged each month.'}
              </div>
              <button
                onClick={() => setBillingMethod((m) => (m === 'invoice' ? 'subscription' : 'invoice'))}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: '#fff', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Switch to {billingMethod === 'invoice' ? 'automatic billing' : 'pay by invoice'}
              </button>
            </div>
            <div className="card" style={{ cursor: 'default', flex: '1 1 260px', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div className="card-title">No-show protection</div>
              <div className="card-sub">
                {noShowProtection
                  ? 'On — customers add a card (not charged) when booking, in case they don’t show.'
                  : 'Off — customers book with no card required.'}
              </div>
              <button
                onClick={() => setNoShowProtection((v) => !v)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: '#fff', color: 'var(--brand)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Turn {noShowProtection ? 'off' : 'on'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/signup" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Set up your own shop, free for 30 days
            </Link>
          </div>
        </div>
      </div>

      {selected && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', width: 340, maxWidth: '90vw' }}
          >
            <h3 style={{ marginTop: 0 }}>{selected.customer}</h3>
            <p className="card-sub" style={{ marginTop: 0 }}>{selected.service} with {selected.staff}</p>
            <p className="card-sub">{selected.time} today</p>

            <div
              style={{
                display: 'inline-block', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                textTransform: 'capitalize', margin: '0.5rem 0 0',
                background: statusColors(selected.status).bg, color: statusColors(selected.status).color,
              }}
            >
              {selected.status}
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <p className="card-sub" style={{ margin: '0 0 0.5rem' }}>
                Treatment cost: <strong>{money(selected.price)}</strong>
              </p>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: '0.3rem' }}>
                Amount paid
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>£</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  style={{ width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
                <button
                  onClick={saveAmount}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brand)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save
                </button>
              </div>
            </div>

            {selected.cardOnFile && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>
                  No-show protection
                </div>
                {noShowMessage ? (
                  <p style={{ fontSize: '0.82rem', color: '#166534', margin: 0 }}>{noShowMessage}</p>
                ) : (
                  <>
                    <p style={{ fontSize: '0.82rem', margin: '0 0 0.5rem', color: 'var(--text-muted)' }}>
                      Card on file ✓ — if they don&apos;t show, you can charge a £{selected.noShowFee?.toFixed(2)} no-show fee.
                    </p>
                    <button
                      onClick={() => chargeNoShow(selected)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Mark as no-show &amp; charge £{selected.noShowFee?.toFixed(2)}
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>
                Customer history
              </div>
              {selectedHistory ? (
                <>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.6rem' }}>
                    <strong>{selectedHistory.totalVisits}</strong> visits total · customer since {selectedHistory.customerSince}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {selectedHistory.recentVisits.map((v, i) => (
                      <div key={i} style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ color: '#444' }}>{v.service}</span>
                        <span style={{ color: '#999', whiteSpace: 'nowrap' }}>{v.date}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>No previous visits — this is their first time.</p>
              )}
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                onClick={() => setSelectedId(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/">Home</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/guide">User guide</Link>
          <Link href="/about">About &amp; support</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  )
}
