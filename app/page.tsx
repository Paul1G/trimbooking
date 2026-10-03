import Link from "next/link";
import "./home.css";

const industryInsights = [
  {
    quote: "Bookings mostly came in by phone or an Instagram DM, in between clients.",
    outcome: "Your own branded booking page customers can use any time, day or night.",
  },
  {
    quote: "No-shows cost real money, but asking for a deposit felt awkward.",
    outcome: "No-show protection: a card is held, and only charged if they don't turn up.",
  },
  {
    quote: "Staff didn't want management seeing their tips or every amount they'd taken.",
    outcome: "Earnings stay private to each staff member, in their own portal — by design.",
  },
  {
    quote: "I never really knew which days were quiet, or which regulars had stopped coming in.",
    outcome: "Insights shows your busy and quiet times, your best weeks, and who you haven't seen in 3 months.",
  },
];

const features = [
  {
    icon: "🔗",
    title: "Your own booking page",
    description:
      "You get a branded page at yourshop.trimbooking.co.uk where customers pick a service, staff member and time — no phone calls needed.",
  },
  {
    icon: "🎨",
    title: "Your logo & colours",
    description:
      "Add your logo and brand colour once in the dashboard, and it carries through your booking page, staff profiles and confirmation emails.",
  },
  {
    icon: "📅",
    title: "Staff calendars",
    description:
      "Set each team member's working hours and holidays. TrimBooking only offers times that are actually free.",
  },
  {
    icon: "✅",
    title: "Accept or decline requests",
    description:
      "New bookings land as requests in your dashboard. Approve or decline with one click, right from your calendar or list view.",
  },
  {
    icon: "✉️",
    title: "Automatic emails",
    description:
      "Customers get an email the moment they request a slot, and another the moment you confirm or decline it. No manual chasing.",
  },
  {
    icon: "🧾",
    title: "Services & pricing",
    description:
      "List your services with prices and durations, and assign them to the right staff members in minutes.",
  },
  {
    icon: "🛡️",
    title: "No-show protection",
    description:
      "Turn it on and customers add a card when booking — nothing is charged unless they don't show up. You choose the fee, and staff get paid out directly.",
  },
  {
    icon: "📈",
    title: "Insights",
    description:
      "See takings and how full your diary is this week, last month or this tax year — compared with last week and last year. Spot your best week, your top 10 spenders, clients you haven't seen in 3 months, and your busy and quiet times.",
  },
];

const steps = [
  {
    title: "Set up your business",
    description: "Add your services, staff, opening hours and branding.",
  },
  {
    title: "Share your link",
    description: "Send customers to yourshop.trimbooking.co.uk or add it to Instagram and Google.",
  },
  {
    title: "Manage bookings",
    description: "Accept, decline or reschedule requests from one simple dashboard.",
  },
];

export default function Home() {
  return (
    <div className="home">
      <nav className="home-nav">
        <span className="logo">TrimBooking</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Home
          </Link>
          <Link href="/how-it-works" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            How it works
          </Link>
          <Link href="/pricing" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link href="/guide" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            User guide
          </Link>
          <Link href="/about" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            About
          </Link>
          <Link href="/login" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Staff login
          </Link>
          <Link href="/signup" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-trial-badge">Free 30-day trial · No card required</div>
        <h1>Online booking, built for hairdressers, beauty salons &amp; barbers</h1>
        <p>
          Give your business its own branded booking page. Customers book online in
          seconds, and you manage every appointment from one simple dashboard. Just
          as at home for a dog groomer&apos;s as it is for a hair salon or barbershop.
        </p>
        <div className="home-hero-actions">
          <Link href="/signup" className="btn-dark">Get started free</Link>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          See it in action
        </p>
        <div className="home-hero-actions" style={{ marginTop: '0.5rem' }}>
          <Link href="/demo-booking" className="btn-outline">👤 Customer view demo</Link>
          <Link href="/demo-dashboard" className="btn-outline">🏠 Owner view demo</Link>
        </div>
      </header>

      <section className="home-section">
        <div className="home-eyebrow">Built with the industry</div>
        <h2 className="home-section-title">Shaped by the people who actually run these businesses</h2>
        <p style={{ textAlign: "center", maxWidth: 640, margin: "-1.25rem auto 2.5rem", color: "var(--muted)" }}>
          TrimBooking wasn&apos;t designed in a vacuum. Every feature here came out of real conversations
          with working salon owners, barbers and stylists about what actually slows their day down —
          it&apos;s built around how this industry runs, not a generic booking tool with a salon skin.
        </p>
        <div className="insight-grid">
          {industryInsights.map((i) => (
            <div key={i.quote} className="insight-card">
              <p className="insight-quote">&ldquo;{i.quote}&rdquo;</p>
              <p className="insight-outcome">→ {i.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">Everything included</div>
        <h2 className="home-section-title">Built for how your salon, barbers or grooming business runs</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-eyebrow">How it works</div>
        <h2 className="home-section-title">Up and running in three steps</h2>
        <div className="steps-list">
          {steps.map((s, i) => (
            <div key={s.title} className="step">
              <div className="step-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link href="/how-it-works" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
            See how it works in more detail →
          </Link>
        </p>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">Pricing</div>
        <h2 className="home-section-title">One simple plan</h2>
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ margin: "0.25rem 0" }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 700 }}>£20</span>
            <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/month</span>
          </div>
          <p style={{ color: "var(--muted)", margin: "0.25rem 0 1.25rem" }}>
            Includes up to <strong>4 staff members</strong>, then just{" "}
            <strong>£2.50/month</strong> per extra staff member.
          </p>
          <Link href="/pricing" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
            See full pricing details →
          </Link>
        </div>
      </section>

      <section className="home-cta">
        <h2>Ready to stop taking bookings by phone?</h2>
        <p>Get your business set up with its own booking page — free for 30 days, no card required.</p>
        <Link href="/signup" className="btn-dark">Get started</Link>
      </section>

      <footer className="home-footer">
        <div className="home-footer-links">
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
  );
}
