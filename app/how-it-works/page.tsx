import Link from "next/link";
import "../home.css";

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
      "Set each team member's working hours and breaks. TrimBooking only offers times that are actually free.",
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
    icon: "🧑‍💼",
    title: "Staff logins",
    description:
      "Give team members their own login to see their bookings and earnings, and optionally manage their own schedule and payments.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="home">
      <nav className="home-nav">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          TrimBooking
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Home
          </Link>
          <Link href="/how-it-works" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            How it works
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
        <h1>How TrimBooking works</h1>
        <p>
          TrimBooking gives your barbershop or salon its own online booking page,
          a dashboard to manage every appointment, and portals for both customers
          and staff. Here&apos;s what happens on each side.
        </p>
      </header>

      <section className="home-section">
        <div className="home-eyebrow">For shop owners</div>
        <h2 className="home-section-title">Set up once, run every day from one place</h2>
        <div className="steps-list">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Sign up</h3>
            <p>Create your shop in a couple of minutes — a name, a web address and you&apos;re registered.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Add your details</h3>
            <p>Add your services and prices, staff members and their working hours, opening hours, and your logo and brand colour.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Share your link</h3>
            <p>Send customers to yourshop.trimbooking.co.uk or add it to Instagram, Google or your website.</p>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link href="/demo-dashboard" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>
            See a sample owner dashboard →
          </Link>
        </p>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">What you get</div>
        <h2 className="home-section-title">Everything included</h2>
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
        <div className="home-eyebrow">For customers</div>
        <h2 className="home-section-title">Booking takes under a minute</h2>
        <div className="steps-list">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Pick a service & staff member</h3>
            <p>Customers visit your booking page, choose what they want and who they&apos;d like to see (or &quot;any available&quot;).</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Choose a time</h3>
            <p>Only genuinely free slots are shown, based on that staff member&apos;s working hours, breaks and existing bookings.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Get confirmation by email</h3>
            <p>They receive an email straight away, then another once you confirm — with a link to manage, reschedule or cancel any time.</p>
          </div>
        </div>
      </section>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">For your team</div>
        <h2 className="home-section-title">Staff see their own bookings & earnings</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📧</div>
            <h3>Invited by email</h3>
            <p>Give a staff member an email address in the dashboard and send them an invite — they set a password and they&apos;re in.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💷</div>
            <h3>See what they&apos;ve earned</h3>
            <p>Every staff member can see their own day-by-day and month-to-date bookings and earnings — nobody else&apos;s.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Optional self-management</h3>
            <p>Give trusted staff &quot;admin&quot; access so they can record their own payments and update their own working hours.</p>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <h2>Want the full walkthrough?</h2>
        <p>The user guide covers every screen, step by step.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/guide" className="btn-dark">Read the user guide</Link>
          <Link href="/signup" className="btn-outline">Get started</Link>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/">Home</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/guide">User guide</Link>
          <Link href="/about">About &amp; support</Link>
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  );
}
