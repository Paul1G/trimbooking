import Link from "next/link";
import "../home.css";

export default function TermsPage() {
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
          <Link href="/privacy" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Privacy
          </Link>
          <Link href="/about" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            About
          </Link>
          <Link href="/signup" className="nav-cta">Get started</Link>
        </div>
      </nav>

      <div className="doc-wrap">
        <div className="doc-hero">
          <h1>Terms of Service</h1>
          <p>Last updated: 2 October 2026</p>
        </div>

        <section className="doc-section">
          <p>
            TrimBooking is operated by Paul Graham, trading as TrimBooking, a sole trader
            based in the United Kingdom (&ldquo;<strong>TrimBooking</strong>&rdquo;,
            &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;). These
            terms are in two parts: <strong>Part A</strong> applies if you&apos;re a
            business running a booking page on TrimBooking, and <strong>Part B</strong>{" "}
            applies if you&apos;re a customer booking an appointment with one of those
            businesses. Using TrimBooking in either way means you agree to the part that
            applies to you.
          </p>
        </section>

        <section className="doc-section">
          <h2>Part A — For businesses using TrimBooking</h2>

          <h3>A1. What TrimBooking is</h3>
          <p>
            TrimBooking provides a branded online booking page, owner dashboard and staff
            portal for hairdressers, salons, barbers and similar businesses. We provide the
            software; you remain responsible for the services you actually deliver to your
            own customers.
          </p>

          <h3>A2. Your account</h3>
          <p>
            You&apos;re responsible for keeping your login details secure and for everything
            that happens under your account, including actions taken by staff you&apos;ve
            given access to. Tell us promptly if you believe your account has been
            compromised.
          </p>

          <h3>A3. Fees and billing</h3>
          <p>
            Current pricing is set out on our{" "}
            <Link href="/pricing">Pricing page</Link>. After your free trial, you&apos;re
            billed either by invoice (with a Stripe-hosted payment link) or by automatic
            card payment via Stripe, whichever you choose from your dashboard. If a payment
            isn&apos;t received, we&apos;ll email reminders during a grace period before
            disabling your booking page — see the Pricing page for the current grace
            period length. We can change our pricing with reasonable notice; continuing to
            use TrimBooking after a price change takes effect means you accept the new
            price from your next billing period.
          </p>

          <h3>A4. Payments and Stripe</h3>
          <p>
            TrimBooking uses Stripe to process your subscription payments and, if you use
            no-show protection or staff payouts, to move money between your customers and
            your staff&apos;s own connected Stripe accounts. By using any Stripe-powered
            feature of TrimBooking, you agree to be bound by the{" "}
            <a href="https://stripe.com/legal/connect-account" target="_blank" rel="noopener noreferrer">
              Stripe Connected Account Agreement
            </a>, which includes the{" "}
            <a href="https://stripe.com/legal/ssa" target="_blank" rel="noopener noreferrer">
              Stripe Services Agreement
            </a>{" "}
            (together, the &ldquo;Stripe Services Agreement&rdquo;), as Stripe may update
            them from time to time. As a condition of enabling these payment services, you
            agree to provide accurate and complete information about yourself and your
            business, and you authorize TrimBooking to share that information and related
            transaction information with Stripe.
          </p>
          <p>
            You&apos;re responsible for setting and disclosing your own prices, and for
            your own refund or cancellation policy toward your customers — TrimBooking
            isn&apos;t a party to the service you provide them.
          </p>

          <h3>A5. No-show protection and staff payouts</h3>
          <p>
            If you turn on no-show protection, you&apos;re responsible for setting a fee
            that&apos;s fair and clearly disclosed to your customers at booking time, and
            for only charging a no-show fee when a customer genuinely didn&apos;t show up
            for a confirmed booking. Chargebacks or disputes arising from a no-show charge
            you make are between you, your customer and Stripe; TrimBooking facilitates the
            payment but doesn&apos;t adjudicate disputes about whether a no-show genuinely
            occurred.
          </p>

          <h3>A6. Acceptable use</h3>
          <p>
            You won&apos;t use TrimBooking to collect payment for anything illegal, to
            store data you don&apos;t have a lawful basis to hold, or to misuse customer
            contact details collected through a booking for unrelated marketing without
            their consent.
          </p>

          <h3>A7. Cancelling your account</h3>
          <p>
            You can stop using TrimBooking at any time; contact us to close your account.
            We may suspend or close an account that breaches these terms, doesn&apos;t pay
            fees due, or is used unlawfully.
          </p>

          <h3>A8. Service availability</h3>
          <p>
            We aim to keep TrimBooking available and reliable but don&apos;t guarantee
            uninterrupted service, and aren&apos;t liable for losses caused by outages,
            third-party service issues (Stripe, Supabase, email delivery, etc.), or
            circumstances outside our reasonable control.
          </p>
        </section>

        <section className="doc-section">
          <h2>Part B — For customers booking an appointment</h2>

          <h3>B1. Making a booking</h3>
          <p>
            When you book through a TrimBooking page, your booking request is sent to that
            business, which confirms, declines or reschedules it. TrimBooking provides the
            booking technology; the business you&apos;re booking with is responsible for
            the appointment itself, its pricing, and its own cancellation policy.
          </p>

          <h3>B2. Your information</h3>
          <p>
            The name, email and phone number you provide are shared with the business
            you&apos;re booking with, so they can manage your appointment and contact you
            about it. See our <Link href="/privacy">Privacy Policy</Link> for details.
          </p>

          <h3>B3. No-show protection and card details</h3>
          <p>
            Some businesses turn on no-show protection, which may ask you to add a card
            when booking. If so, you&apos;ll be told the fee that applies before you add
            your card. Your card details are entered directly into Stripe&apos;s secure
            payment form and are never seen or stored by TrimBooking or the business
            itself. Nothing is charged unless you don&apos;t show up for a confirmed
            booking, in line with the fee disclosed at the time you booked.
          </p>

          <h3>B4. Managing or cancelling your booking</h3>
          <p>
            Every booking confirmation includes a personal link to view, reschedule or
            cancel your appointment. Cancellation and rescheduling terms (such as how much
            notice is needed to avoid a no-show fee) are set by the individual business,
            not by TrimBooking.
          </p>

          <h3>B5. Disputes</h3>
          <p>
            Any dispute about the appointment itself, a charge made by a business, or a
            no-show fee, should be raised directly with that business in the first
            instance. TrimBooking can be contacted for issues with the booking technology
            itself (a bug, a payment that failed to process correctly, etc.).
          </p>
        </section>

        <section className="doc-section">
          <h2>General</h2>
          <h3>Liability</h3>
          <p>
            Nothing in these terms limits liability where it would be unlawful to do so
            (for example, for fraud or death or personal injury caused by negligence).
            Otherwise, to the extent permitted by law, TrimBooking&apos;s liability to you
            is limited to the fees you&apos;ve paid us in the 12 months before the issue
            arose (for businesses), or excluded entirely for customers not paying us
            directly for the service.
          </p>
          <h3>Governing law</h3>
          <p>These terms are governed by the laws of England and Wales.</p>
          <h3>Changes</h3>
          <p>
            We may update these terms from time to time; significant changes will be
            notified to account owners by email. Continuing to use TrimBooking after a
            change takes effect means you accept the updated terms.
          </p>
          <h3>Contact</h3>
          <div className="doc-note">
            <strong>Email: </strong>
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>
          </div>
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
