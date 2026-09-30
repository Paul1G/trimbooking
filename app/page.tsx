import Link from "next/link";
import "./home.css";

const features = [
  {
    icon: "🔗",
    title: "Your own booking page",
    description:
      "Every shop gets a branded page at yourshop.trimbooking.co.uk where customers pick a service, staff member and time — no phone calls needed.",
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
];

const steps = [
  {
    title: "Set up your shop",
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
          <Link href="/signup" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <header className="home-hero">
        <div className="home-trial-badge">Free 30-day trial · No card required</div>
        <h1>Online booking, built for hairdressers, beauty salons &amp; barbers</h1>
        <p>
          Give your shop its own branded booking page. Customers book online in
          seconds, and you manage every appointment from one simple dashboard.
        </p>
        <div className="home-hero-actions">
          <Link href="/signup" className="btn-dark">Get started free</Link>
          <Link href="/demo-booking" className="btn-outline">See a demo</Link>
        </div>
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem' }}>
          <Link href="/demo-dashboard" style={{ color: "var(--muted)" }}>
            Curious what the owner side looks like? Try the dashboard demo →
          </Link>
        </p>
      </header>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">Everything included</div>
        <h2 className="home-section-title">Built for how your salon or barbers run</h2>
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
        <p>Get your shop set up with its own booking page — free for 30 days, no card required.</p>
        <Link href="/signup" className="btn-dark">Get started</Link>
      </section>

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/guide">User guide</Link>
          <Link href="/about">About &amp; support</Link>
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  );
}
