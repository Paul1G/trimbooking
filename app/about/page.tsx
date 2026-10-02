import Link from "next/link";
import "../home.css";

export default function AboutPage() {
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

      <div className="doc-wrap">
        <div className="doc-hero">
          <h1>About &amp; support</h1>
          <p>
            TrimBooking is built and run by a single independent developer —
            here&apos;s a bit about that, and how to get help.
          </p>
        </div>

        <section className="doc-section">
          <h2>Who&apos;s behind TrimBooking</h2>
          <p>
            TrimBooking is designed, built and maintained by one developer,
            rather than a large team or company. The goal is a booking system
            that&apos;s simple, fast and genuinely useful for independent
            hairdressers, beauty salons, barbers and dog groomers — without the bloat, upsells or confusing
            settings that come with a lot of bigger booking platforms.
          </p>
          <p>
            Because it&apos;s independently run, changes and fixes tend to happen
            quickly, and feedback from businesses actually using it directly shapes
            what gets built next.
          </p>
        </section>

        <section className="doc-section">
          <h2>Support</h2>
          <p>
            If something isn&apos;t working, you&apos;re not sure how to do something,
            or you&apos;d like to request a feature, get in touch directly by email:
          </p>
          <div className="doc-note">
            <strong>Email: </strong>
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>
          </div>
          <p>
            Please include your business&apos;s web address
            (<code>yourshop.trimbooking.co.uk</code>) if your question relates
            to your account or bookings — it helps track down the right account
            quickly. Most support queries get a reply within a day or two.
          </p>
          <p>
            Before emailing, it&apos;s worth checking the{" "}
            <Link href="/guide">user guide</Link>, which covers setup, staff
            logins and everyday use step by step.
          </p>
        </section>
      </div>

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
  );
}
