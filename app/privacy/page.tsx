import Link from "next/link";
import "../home.css";

export default function PrivacyPage() {
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
          <Link href="/terms" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/about" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            About
          </Link>
          <Link href="/signup" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <div className="doc-wrap">
        <div className="doc-hero">
          <h1>Privacy Policy</h1>
          <p>Last updated: 2 October 2026</p>
        </div>

        <section className="doc-section">
          <div className="doc-note">
            <strong>In short: </strong>
            TrimBooking collects the minimum personal data needed to run a booking page for
            a business and let customers book appointments — names, contact details and
            booking history. Payment card details are never seen or stored by TrimBooking;
            they go directly to Stripe. We don&apos;t sell personal data to anyone.
          </div>
        </section>

        <section className="doc-section">
          <h2>1. Who this applies to and who we are</h2>
          <p>
            This policy covers everyone whose personal data TrimBooking processes:
            business owners and staff who use TrimBooking to run their booking page, and
            customers who book an appointment through one.
          </p>
          <p>
            TrimBooking is operated by Paul Graham, trading as TrimBooking, a sole trader
            based in the United Kingdom (&ldquo;<strong>TrimBooking</strong>&rdquo;,
            &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;). For data
            protection purposes, TrimBooking is the controller of the account and billing
            data described in Section 2, and generally a processor acting on behalf of each
            business for the booking data of that business&apos;s own customers (see
            Section 3).
          </p>
          <div className="doc-note">
            <strong>Data protection contact: </strong>
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>
          </div>
        </section>

        <section className="doc-section">
          <h2>2. Data we collect about business owners and staff</h2>
          <p>When a business signs up and runs its booking page, we collect:</p>
          <ul>
            <li><strong>Account details</strong> — name, email address, password (stored hashed, never in plain text), and the business&apos;s chosen web address.</li>
            <li><strong>Business details</strong> — business name, branding (logo, colour), opening hours, services and prices.</li>
            <li><strong>Staff details</strong> — name, role, bio, and (if given a login) email address.</li>
            <li><strong>Billing details</strong> — handled by Stripe on our behalf; see Section 4. We store only a Stripe customer/subscription reference, never a card number.</li>
            <li><strong>Payout details</strong> — if a staff member connects a Stripe account to receive no-show fee payouts, Stripe collects and verifies their bank/identity details directly; we only store a reference ID confirming the connection.</li>
          </ul>
        </section>

        <section className="doc-section">
          <h2>3. Data we process on a business&apos;s behalf about its customers</h2>
          <p>
            When a customer books an appointment, we process on behalf of the business
            they&apos;re booking with:
          </p>
          <ul>
            <li>Name, email address and phone number, as given at the time of booking.</li>
            <li>Appointment details — service, staff member, date/time, and status.</li>
            <li>Booking history, used to show the business its customers&apos; visit history and to send rebook reminders.</li>
            <li>If no-show protection is enabled for that business, a reference to a card held securely by Stripe (see Section 4) — never the card number itself.</li>
          </ul>
          <p>
            This data is used only to provide the booking service to that business and its
            customers, and is visible to that business&apos;s own owner and staff. We don&apos;t use
            it for our own marketing, and we don&apos;t share one business&apos;s customer data with
            another business.
          </p>
        </section>

        <section className="doc-section">
          <h2>4. Payment data and Stripe</h2>
          <p>
            All card payments are handled directly by{" "}
            <a href="https://stripe.com/gb/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>,
            a PCI DSS Level 1 certified payment processor. Card numbers, expiry dates and
            security codes are entered directly into Stripe&apos;s secure, hosted payment
            fields and never pass through TrimBooking&apos;s own servers or database — we only
            ever hold a Stripe-issued reference token, which cannot be used to reconstruct
            a card number.
          </p>
          <p>
            Where TrimBooking facilitates payouts to a business&apos;s staff (for no-show fees)
            via Stripe Connect, Stripe separately collects and verifies the information
            needed to run those payouts and comply with its own legal and anti-fraud
            obligations. See Stripe&apos;s own privacy policy for details of what Stripe does
            with that information.
          </p>
        </section>

        <section className="doc-section">
          <h2>5. Other services we use</h2>
          <ul>
            <li><strong>Supabase</strong> — hosts our database and handles account logins, encrypted in transit and at rest.</li>
            <li><strong>Resend</strong> — sends transactional emails (booking confirmations, reminders, invoices). We don&apos;t send marketing email through this without consent.</li>
            <li><strong>Vercel</strong> — hosts the application and runs scheduled jobs (reminders, invoicing).</li>
            <li><strong>Stripe</strong> — payment processing and payouts, as described in Section 4.</li>
          </ul>
          <p>
            Each of these providers processes data only as needed to provide their part of
            the service, under their own data processing terms.
          </p>
        </section>

        <section className="doc-section">
          <h2>6. How long we keep data</h2>
          <p>
            We keep account and booking data for as long as a business&apos;s account is
            active, plus a reasonable period afterwards to deal with any billing, legal or
            dispute matters. If a business asks us to delete their account, we delete or
            anonymise the data associated with it, except where we&apos;re required to keep
            billing records for tax purposes (currently up to 6 years under UK law).
          </p>
        </section>

        <section className="doc-section">
          <h2>7. Your rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul>
            <li>Ask what personal data we hold about you, and get a copy of it.</li>
            <li>Ask us to correct inaccurate data.</li>
            <li>Ask us to delete your data, where we&apos;re not required to keep it.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Ask for your data in a portable format.</li>
          </ul>
          <p>
            If your query is about a specific booking or business, it&apos;s usually fastest
            to contact that business directly, since they control their own customer data
            day to day. For anything else, email{" "}
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>. If you&apos;re
            not satisfied with our response, you can complain to the{" "}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
              Information Commissioner&apos;s Office (ICO)
            </a>
            , the UK&apos;s data protection regulator.
          </p>
        </section>

        <section className="doc-section">
          <h2>8. Cookies</h2>
          <p>
            TrimBooking uses only the cookies strictly necessary to keep you logged in and
            to remember your session while using the booking page or dashboard. We don&apos;t
            use advertising or cross-site tracking cookies.
          </p>
        </section>

        <section className="doc-section">
          <h2>9. Changes to this policy</h2>
          <p>
            If this policy changes materially, we&apos;ll update the date at the top of this
            page and, for significant changes, notify account owners by email.
          </p>
        </section>
      </div>

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/">Home</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/about">About &amp; support</Link>
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  );
}
