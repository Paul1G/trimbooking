import Link from "next/link";
import "./home.css";

const DEMO_URL = "https://demo.trimbooking.co.uk";

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
        <Link href="/signup" className="nav-cta">Get started</Link>
      </nav>

      <header className="home-hero">
        <h1>Online booking, built for barbershops &amp; salons</h1>
        <p>
          Give your shop its own branded booking page. Customers book online in
          seconds, and you manage every appointment from one simple dashboard.
        </p>
        <div className="home-hero-actions">
          <Link href="/signup" className="btn-dark">Get started</Link>
          <Link href={DEMO_URL} className="btn-outline">See a demo</Link>
        </div>
      </header>

      <section className="home-section home-section-soft">
        <div className="home-eyebrow">Everything included</div>
        <h2 className="home-section-title">Built for how your shop actually runs</h2>
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
      </section>

      <section className="home-cta">
        <h2>Ready to stop taking bookings by phone?</h2>
        <p>Get your shop set up with its own booking page — no cost to try it out.</p>
        <Link href="/signup" className="btn-dark">Get started</Link>
      </section>

      <footer className="home-footer">
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  );
}
