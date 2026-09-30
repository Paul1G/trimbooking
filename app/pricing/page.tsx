import Link from "next/link";
import "../home.css";

export default function PricingPage() {
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

      <header className="home-hero">
        <div className="home-trial-badge">Free 30-day trial · No card required</div>
        <h1>Simple, transparent pricing</h1>
        <p>
          One plan, no tiers to compare and no feature gates — just a flat
          monthly fee based on how many staff you have.
        </p>
      </header>

      <section className="home-section">
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 16,
            padding: "2.5rem 2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            TrimBooking
          </div>
          <div style={{ margin: "0.75rem 0" }}>
            <span style={{ fontSize: "3rem", fontWeight: 700 }}>£20</span>
            <span style={{ fontSize: "1rem", color: "var(--muted)" }}>/month</span>
          </div>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Includes up to <strong>4 staff members</strong>
          </p>
          <div style={{ borderTop: "1px solid var(--line)", margin: "1.5rem 0", paddingTop: "1.5rem" }}>
            <p style={{ margin: 0, fontSize: "0.95rem" }}>
              + <strong>£2.50/month</strong> for each additional staff member
            </p>
          </div>
          <ul style={{ textAlign: "left", margin: "1.5rem 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              "Your own branded booking page",
              "Unlimited bookings & customers",
              "Staff calendars, holidays & working hours",
              "Automatic customer emails",
              "Staff logins with their own bookings & earnings",
              "Services, pricing & durations",
            ].map((item) => (
              <li key={item} style={{ fontSize: "0.9rem", display: "flex", gap: "0.5rem" }}>
                <span style={{ color: "#16a34a" }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="btn-dark" style={{ display: "inline-block", width: "100%", boxSizing: "border-box" }}>
            Start your free 30-day trial
          </Link>
        </div>

        <div style={{ maxWidth: 480, margin: "1.5rem auto 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0", color: "var(--muted)", fontWeight: 600 }}>Staff members</th>
                <th style={{ textAlign: "right", padding: "0.5rem 0", color: "var(--muted)", fontWeight: 600 }}>Monthly price</th>
              </tr>
            </thead>
            <tbody>
              {[1, 4, 6, 10].map((n) => (
                <tr key={n} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.5rem 0" }}>{n} staff{n === 4 ? " (or fewer)" : ""}</td>
                  <td style={{ padding: "0.5rem 0", textAlign: "right", fontWeight: 600 }}>
                    £{(20 + Math.max(0, n - 4) * 2.5).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="doc-wrap" style={{ paddingTop: 0 }}>
        <section className="doc-section">
          <h2>How billing works</h2>
          <p>
            Every new shop starts with a <strong>free 30-day trial</strong> —
            no card required, and full access to every feature so you can set
            your shop up properly before paying anything.
          </p>
          <p>
            Once you&apos;re on a paid plan, here&apos;s how invoicing works:
          </p>
          <ul>
            <li>
              <strong>Your first invoice</strong> covers the part of the
              current calendar month from when you&apos;re moved onto a paid
              plan through to the end of that month, charged as a
              proportion of the full monthly fee for the days remaining.
            </li>
            <li>
              <strong>After that</strong>, you&apos;re invoiced on the{" "}
              <strong>1st of each month, in advance</strong>, for the month
              ahead — based on however many staff members you have at that
              time.
            </li>
            <li>
              Adding or removing staff during the month doesn&apos;t change
              what you&apos;re billed until the following month&apos;s
              invoice.
            </li>
          </ul>
          <div className="doc-note">
            <strong>Example: </strong>
            A shop with 6 staff members pays £20 base fee + 2 × £2.50 for the
            2 staff beyond the included 4 = <strong>£25/month</strong>.
          </div>
          <p>
            Invoices are emailed to the address you signed up with, and
            currently include the amount due with payment instructions to
            follow separately — get in touch any time at{" "}
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>{" "}
            if you have any questions about your bill.
          </p>
        </section>
      </div>

      <section className="home-cta">
        <h2>Ready to stop taking bookings by phone?</h2>
        <p>Get your shop set up with its own booking page — free for 30 days, no card required.</p>
        <Link href="/signup" className="btn-dark">Get started</Link>
      </section>

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
  );
}
