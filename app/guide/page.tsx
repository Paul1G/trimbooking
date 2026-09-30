import Link from "next/link";
import "../home.css";

const sections = [
  { id: "signing-up", title: "1. Signing up" },
  { id: "business-setup", title: "2. Setting up your business" },
  { id: "services", title: "3. Adding services" },
  { id: "staff", title: "4. Adding staff" },
  { id: "staff-portal", title: "5. Staff logins & the staff portal" },
  { id: "bookings", title: "6. Managing bookings" },
  { id: "customer-booking", title: "7. How customers book & manage appointments" },
  { id: "account", title: "8. Your account, login & passwords" },
  { id: "faq", title: "9. Frequently asked questions" },
];

export default function GuidePage() {
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
          <h1>User guide</h1>
          <p>
            A complete, step-by-step guide to setting up your business, taking bookings
            and giving your team their own logins.
          </p>
        </div>

        <nav className="doc-toc">
          <h2>On this page</h2>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="signing-up" className="doc-section">
          <h2>1. Signing up</h2>
          <p>
            Go to the <Link href="/signup">sign-up page</Link> and enter your business
            name and an email and password for your owner account. Choose a web
            address for your booking page — this becomes
            <strong> yourchoice.trimbooking.co.uk</strong>. You can use letters,
            numbers and hyphens.
          </p>
          <p>
            After you submit the form, TrimBooking creates your business and sets up
            your booking page automatically. This can take a minute or two while
            your web address is registered — you&apos;ll see a progress screen, and a
            link to log in will appear as soon as it&apos;s ready.
          </p>
          <div className="doc-note">
            Check your email for a welcome message with your booking page link and
            a link to log in to your dashboard.
          </div>
        </section>

        <section id="business-setup" className="doc-section">
          <h2>2. Setting up your business</h2>
          <p>
            Log in at <strong>yourshop.trimbooking.co.uk/login</strong> to reach
            your dashboard. From there you can:
          </p>
          <ul>
            <li><strong>Branding</strong> — upload a logo and choose a brand colour. This appears on your booking page, staff profiles and emails.</li>
            <li><strong>Opening hours</strong> — set the days and hours your business is open. Customers can never book outside these hours, even if a staff member is individually available.</li>
          </ul>
          <p>
            Changes save immediately and appear on your public booking page straight away.
          </p>
        </section>

        <section id="services" className="doc-section">
          <h2>3. Adding services</h2>
          <p>
            In <strong>Services</strong>, add everything you offer — haircuts,
            colours, treatments and so on — along with a price and duration for
            each. Duration is used to work out how long a booking blocks out on a
            staff member&apos;s calendar.
          </p>
          <p>
            Once a service exists, you can assign it to one or more staff members
            (see the next section) so customers only see the right staff for the
            service they&apos;ve chosen.
          </p>
        </section>

        <section id="staff" className="doc-section">
          <h2>4. Adding staff</h2>
          <p>
            In <strong>Staff</strong>, click <strong>+ Add staff member</strong> and fill in:
          </p>
          <ul>
            <li><strong>Name, role and bio</strong> — shown on your public team page.</li>
            <li><strong>Photo</strong> — optional, paste a public image URL.</li>
            <li><strong>Services offered</strong> — tick which services this person can be booked for.</li>
            <li><strong>Working hours</strong> — the days and hours this person is available. Customers can only book within both this and your business&apos;s opening hours.</li>
            <li><strong>Breaks</strong> — block out lunch or any other time that shouldn&apos;t be bookable, per day.</li>
          </ul>
          <p>
            Click <strong>Save</strong>, and the staff member immediately appears on
            your public booking page. You can come back and edit any of these
            details, or delete a staff member, at any time.
          </p>
        </section>

        <section id="staff-portal" className="doc-section">
          <h2>5. Staff logins &amp; the staff portal</h2>
          <p>
            You can optionally give a staff member their own login, so they can see
            their own bookings and earnings without needing access to your owner
            dashboard.
          </p>
          <h3>Inviting a staff member</h3>
          <ol>
            <li>Open <strong>Staff</strong> and edit the person you want to invite.</li>
            <li>Enter their <strong>email address</strong> in the Portal email field.</li>
            <li>Choose an access level — see below.</li>
            <li>Click <strong>Send invite</strong>. They&apos;ll receive an email with a link to set a password.</li>
          </ol>
          <p>
            Once they&apos;ve set a password, they log in at the same
            <strong> yourshop.trimbooking.co.uk/login</strong> page as you — TrimBooking
            recognises their account and takes them to their own staff portal
            instead of the owner dashboard.
          </p>
          <h3>User vs. Admin access</h3>
          <ul>
            <li><strong>User</strong> — can view their own bookings and earnings (today and month-to-date, expected vs. actual), and their own working hours and breaks. Everything is read-only.</li>
            <li><strong>Admin</strong> — everything a User can see, plus the ability to record the actual payment received for their own confirmed bookings, and to edit their own working hours and breaks.</li>
          </ul>
          <p>
            Neither access level can see other staff members&apos; bookings, earnings
            or schedules, and neither can reach the owner dashboard, services,
            branding or business settings.
          </p>
          <p>
            You can resend an invite at any time (for example if the link
            expired), and you can remove a staff member&apos;s access entirely by
            deleting them from the Staff page.
          </p>
        </section>

        <section id="bookings" className="doc-section">
          <h2>6. Managing bookings</h2>
          <p>
            New bookings from your public page arrive as <strong>pending</strong> requests
            in your dashboard. From your bookings list or calendar you can:
          </p>
          <ul>
            <li><strong>Confirm</strong> a booking — the customer gets a confirmation email.</li>
            <li><strong>Decline</strong> a booking — the customer is notified so they can rebook elsewhere.</li>
            <li><strong>Reschedule</strong> a booking to a new time — the customer is emailed the new details.</li>
            <li><strong>Cancel</strong> a confirmed booking if needed.</li>
          </ul>
          <p>
            Each staff member&apos;s bookings are shown against their own calendar, so
            you always know who is booked and when, and customers are only ever
            offered times that don&apos;t clash with an existing booking.
          </p>
        </section>

        <section id="customer-booking" className="doc-section">
          <h2>7. How customers book &amp; manage appointments</h2>
          <p>
            Customers visit <strong>yourshop.trimbooking.co.uk</strong>, choose a
            service and staff member, then pick from the available times. No
            account or app is needed.
          </p>
          <p>
            After booking, they receive an email confirming their request, and a
            follow-up once you confirm or decline it. Every booking email includes
            a personal link they can use to view, reschedule or cancel their
            appointment themselves, without needing to phone the business.
          </p>
        </section>

        <section id="account" className="doc-section">
          <h2>8. Your account, login &amp; passwords</h2>
          <p>
            Log in at <strong>yourshop.trimbooking.co.uk/login</strong> with the
            email and password you signed up with. If you&apos;ve forgotten your
            password, click <strong>Forgot password?</strong> on the login page and
            you&apos;ll be emailed a reset link.
          </p>
          <div className="doc-note">
            Staff members with their own login use the same login page — they&apos;ll
            automatically be taken to their staff portal rather than the owner
            dashboard.
          </div>
        </section>

        <section id="faq" className="doc-section">
          <h2>9. Frequently asked questions</h2>
          <h3>Can I change my business&apos;s web address?</h3>
          <p>Get in touch with TrimBooking support — changing it affects any links you&apos;ve already shared.</p>
          <h3>Can a customer book with any available staff member?</h3>
          <p>Yes — customers can choose a specific staff member, or leave it open for the next available person.</p>
          <h3>What happens if I delete a staff member?</h3>
          <p>Their profile is removed from your booking page and, if they had their own login, that login stops working. Past bookings remain in your records.</p>
          <h3>Do customers need to create an account?</h3>
          <p>No. Customers book with just their name and contact details, and manage their booking via the personal link in their confirmation email.</p>
          <h3>Is there a cost to try it?</h3>
          <p>
            Every business gets a free 30-day trial with no card required. Your
            dashboard shows a reminder as your trial nears its end — if your
            account isn&apos;t marked as paid by then, your booking page is
            temporarily switched off until you get in touch (see{" "}
            <Link href="/about">About &amp; support</Link>).
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
          <Link href="/signup">Get started</Link>
        </div>
        © {new Date().getFullYear()} TrimBooking
      </footer>
    </div>
  );
}
