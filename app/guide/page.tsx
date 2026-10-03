import Link from "next/link";
import "../home.css";

const sections = [
  { id: "signing-up", title: "1. Signing up" },
  { id: "business-setup", title: "2. Setting up your business" },
  { id: "services", title: "3. Adding services" },
  { id: "staff", title: "4. Adding staff" },
  { id: "staff-portal", title: "5. Staff logins & the staff portal" },
  { id: "bookings", title: "6. Managing bookings" },
  { id: "insights", title: "7. Insights" },
  { id: "customer-booking", title: "8. How customers book & manage appointments" },
  { id: "billing", title: "9. Billing & no-show protection" },
  { id: "account", title: "10. Your account, login & passwords" },
  { id: "faq", title: "11. Frequently asked questions" },
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
          <Link href="/compare" style={{ fontSize: "0.9rem", color: "var(--muted)", textDecoration: "none" }}>
            Compare
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
          <h3>Parallel treatment</h3>
          <p>
            Some services run a long time but don&apos;t need a staff member&apos;s
            constant attention — a colour that needs processing time, a perm. Turn
            on <strong>Allow parallel treatment</strong> on a service and add one or
            more <strong>contact windows</strong>: the minutes within the
            appointment that actually need the staff member, given as a start and
            end minute from the start of the booking.
          </p>
          <p>
            For example, a 180-minute colour service might need 45 minutes at the
            start and 20 minutes at the end — two windows, <strong>0&ndash;45</strong>{" "}
            and <strong>160&ndash;180</strong>. The 115 minutes in between are left
            open, so that staff member can take another booking in the gap. Leave
            parallel treatment off (the default) and the whole duration needs them,
            exactly as before.
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
            <li><strong>Automatically confirm this person&apos;s bookings</strong> — optional. Switch this on for a staff member and their bookings are accepted instantly when a customer requests them, instead of landing as a pending request for you to approve.</li>
            <li>
              <strong>Employment status</strong> — <strong>Self-employed</strong> (the
              default, for someone renting their own chair) or{" "}
              <strong>Employed</strong>. This decides whether you see their
              schedule, earnings and Insights revenue from your own dashboard, or
              whether those stay private to their own portal — see the next
              section.
            </li>
          </ul>
          <p>
            Click <strong>Save</strong>, and the staff member immediately appears on
            your public booking page. You can come back and edit any of these
            details, or delete a staff member, at any time.
          </p>
          <p>
            From each staff member&apos;s card you can also open their{" "}
            <strong>calendar</strong>, which shows their booking schedule as a
            single day or a full week at a time — handy for seeing who&apos;s in
            and when at a glance. For a self-employed staff member, their earnings
            aren&apos;t shown here; see the next section for why.
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
            <li><strong>User</strong> — can view their own bookings and earnings (today and month-to-date, expected vs. actual). Read-only.</li>
            <li><strong>Admin</strong> — everything a User can see, plus the ability to record the actual payment received for their own confirmed bookings.</li>
          </ul>
          <p>
            Neither access level can see other staff members&apos; bookings or
            earnings, and neither can reach the owner dashboard, services,
            branding or business settings. Working hours and breaks are set by
            the business owner from the Staff page — staff members can view
            their own bookings and earnings from their portal, but schedule
            changes go through you.
          </p>
          <div className="doc-note">
            <strong>Self-employed</strong> staff (the default): the owner
            dashboard shows their booking schedule and lets you see and record
            the price and payment for any single booking (see the next section)
            — but never their running earnings totals. Today&apos;s and
            month-to-date figures (expected vs. actual) are only ever visible
            to that staff member themselves, from their own portal.
            <br /><br />
            <strong>Employed</strong> staff: the owner dashboard additionally
            shows their full schedule and earnings, and their revenue is
            included in your Insights &quot;by team member&quot; table — the way it
            works for the rest of your business. An employed staff member no
            longer sees money in their own portal; their schedule is managed
            from your dashboard instead.
          </div>
          <p>
            You can resend an invite at any time (for example if the link
            expired), and you can remove a staff member&apos;s access entirely by
            deleting them from the Staff page.
          </p>
          <h3>My insights</h3>
          <p>
            Staff members have a <strong>My insights</strong> link in their portal.
            It&apos;s the same Insights view (see section 7) built only from their
            own bookings: their takings, best week, top clients, regulars they
            haven&apos;t seen in 3 months and their busy and quiet times. Only they
            can see it.
          </p>
          <h3>Getting paid directly (Stripe)</h3>
          <p>
            From their own portal, a staff member can click <strong>Set up
            payouts</strong> to connect a Stripe account in their own name.
            The service itself is still always paid in person — that
            isn&apos;t changing — but if <strong>no-show protection</strong> is
            turned on (see below) and a customer doesn&apos;t show up, a
            charged no-show fee is paid straight to that staff member&apos;s
            own connected account, rather than always settling up with you
            separately.
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
            offered times that don&apos;t clash with an existing booking. Switch
            between a single <strong>day</strong> and a full <strong>week</strong> view
            on a staff member&apos;s calendar to see their schedule at a glance.
          </p>
          <p>
            If you&apos;d rather a staff member&apos;s bookings didn&apos;t need your approval
            at all, turn on <strong>auto-confirm</strong> for them on the Staff page —
            their bookings are then accepted the moment a customer requests them.
          </p>
          <h3>Clicking a booking</h3>
          <p>
            Click any appointment on a calendar — the main Bookings calendar or
            a staff member&apos;s own calendar — to open its details:
          </p>
          <ul>
            <li><strong>Treatment cost</strong> — the price of the service booked.</li>
            <li><strong>Amount paid</strong> — enter or correct what was actually taken for this appointment, for example if you took payment yourself.</li>
            <li><strong>Customer history</strong> — their last few visits with dates and treatments, how many visits they&apos;ve had in total, and how long they&apos;ve been a customer.</li>
          </ul>
          <p>
            This is all scoped to the one booking and customer you&apos;ve opened —
            it&apos;s not a running earnings total, which stays on each staff
            member&apos;s own portal as described above.
          </p>
        </section>

        <section id="insights" className="doc-section">
          <h2>7. Insights</h2>
          <p>
            Open <strong>Insights</strong> from your dashboard to see how the
            business is doing. Pick a period at the top:
          </p>
          <ul>
            <li><strong>This week</strong> — Monday to now, compared with the same point last week.</li>
            <li><strong>Last month</strong> — the whole of last month, compared with the same month last year.</li>
            <li><strong>This tax year</strong> — from 6 April to now, compared with the same point in the previous tax year.</li>
          </ul>
          <p>For that period you&apos;ll see, each with a ▲ or ▼ against the comparison:</p>
          <ul>
            <li><strong>Revenue</strong> — what was recorded as paid, or the service price where nothing different was entered, from bookings handled by <strong>employed</strong> staff only. A self-employed team member&apos;s takings are their own business, not the shop&apos;s, so they&apos;re left out of Revenue and Average spend here (Appointments, Utilisation and Clients still reflect the whole diary).</li>
            <li><strong>Appointments</strong> — visits that went ahead (no-shows and cancellations aren&apos;t counted).</li>
            <li><strong>Utilisation</strong> — how much of your bookable time was booked. Bookable time comes from your opening hours and each staff member&apos;s hours, minus breaks and holidays, so set those up for this to be accurate.</li>
            <li><strong>Average spend</strong>, <strong>clients</strong> (and how many were new), and <strong>no-shows</strong> and cancellations.</li>
          </ul>
          <h3>Week on week</h3>
          <p>
            A chart of the last 12 weeks, this week so far against the same point
            last week, and your <strong>best week</strong> of the last 12 months.
            Tap any bar to see that week&apos;s figures.
          </p>
          <h3>Busy and quiet times</h3>
          <p>
            A grid of every day and hour, shaded by how full it is over the last
            12 weeks, with short pointers — your busiest and quietest days, the
            slots that are nearly always full, and the quiet ones that might suit
            an off-peak offer. Tap a square for its details.
          </p>
          <h3>Top 10 spenders and clients you haven&apos;t seen</h3>
          <p>
            <strong>Top 10 spenders</strong> lists your most valuable clients this
            tax year. <strong>Not seen in 3 months</strong> lists clients whose last
            visit was over 3 months ago and who have nothing booked, most valuable
            first, with buttons to call or email them.
          </p>
          <h3>By team member, and who sees what</h3>
          <p>
            If you have more than one staff member, a table shows each
            person&apos;s appointments, hours booked, utilisation and clients.
            Money figures on the Insights page are shown to the <strong>owner
            only</strong>; admins see everything else. Within that table, an{" "}
            <strong>employed</strong> team member&apos;s revenue is shown
            alongside their other figures; a <strong>self-employed</strong>{" "}
            team member&apos;s earnings are never shown per person — they stay
            in that staff member&apos;s own portal.
          </p>
        </section>

        <section id="customer-booking" className="doc-section">
          <h2>8. How customers book &amp; manage appointments</h2>
          <p>
            Customers visit <strong>yourshop.trimbooking.co.uk</strong>, choose a
            service and staff member, then pick from the available times. No
            account or app is needed.
          </p>
          <p>
            After booking, they receive an email confirming their request, and a
            follow-up once you confirm or decline it — or, if the staff member has
            auto-confirm switched on, their booking is confirmed straight away and
            they&apos;re told so immediately. Every booking email includes
            a personal link they can use to view, reschedule or cancel their
            appointment themselves, without needing to phone the business.
          </p>
        </section>

        <section id="billing" className="doc-section">
          <h2>9. Billing &amp; no-show protection</h2>
          <p>
            From <strong>Dashboard &rarr; Billing</strong>, choose how you&apos;d like to
            pay once your free trial ends:
          </p>
          <ul>
            <li>
              <strong>Pay by invoice</strong> — the default. An invoice with a
              secure Stripe payment link arrives each billing period; you pay it
              yourself each time, and no card is ever stored.
            </li>
            <li>
              <strong>Automatic billing</strong> — add a card once via Stripe
              Checkout and it&apos;s charged automatically every month. Switch
              back to pay-by-invoice at any time.
            </li>
          </ul>
          <p>
            If a payment is ever missed, you&apos;ll get a reminder email once a
            day for a <strong>5-day grace period</strong> before your booking
            page is paused — plenty of time to sort it out either way.
          </p>
          <h3>No-show protection</h3>
          <p>
            Turn this on from <strong>Dashboard &rarr; No-show protection</strong> to
            ask customers for a card when they book — nothing is charged unless
            they don&apos;t show up. You choose how the fee is worked out:
          </p>
          <ul>
            <li><strong>Flat fee</strong> — the same amount for any booking.</li>
            <li><strong>Percentage</strong> — a % of that booking&apos;s service price.</li>
            <li><strong>Per service</strong> — set an individual fee on each service, in <strong>Services</strong>.</li>
          </ul>
          <p>
            You can also choose whether a card is required to book at all, or
            just offered. If a staff member marks a past confirmed booking as a
            no-show from their portal, they can charge the saved card — paid
            straight into their own connected Stripe account — or, if no card
            was saved, log the fee as owed to chase up manually.
          </p>
        </section>

        <section id="account" className="doc-section">
          <h2>10. Your account, login &amp; passwords</h2>
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
          <h2>11. Frequently asked questions</h2>
          <h3>Can I change my business&apos;s web address?</h3>
          <p>Get in touch with TrimBooking support — changing it affects any links you&apos;ve already shared.</p>
          <h3>Can a customer book with any available staff member?</h3>
          <p>Yes — customers can choose a specific staff member, or leave it open for the next available person.</p>
          <h3>What happens if I delete a staff member?</h3>
          <p>Their profile is removed from your booking page and, if they had their own login, that login stops working. Past bookings remain in your records.</p>
          <h3>Do customers need to create an account?</h3>
          <p>No. Customers book with just their name and contact details, and manage their booking via the personal link in their confirmation email.</p>
          <h3>Why is my utilisation blank or the heatmap empty?</h3>
          <p>Utilisation needs your opening hours and each staff member&apos;s working hours to be set, so TrimBooking knows how much time was bookable. The busy and quiet view also needs a few weeks of bookings to show a pattern.</p>
          <h3>Should I mark a staff member employed or self-employed?</h3>
          <p>
            If they&apos;re on your payroll and the money they take is part of
            your business&apos;s revenue, mark them <strong>employed</strong> —
            you&apos;ll see their schedule and earnings from your dashboard and
            Insights, same as the rest of your business. If they rent their own
            chair and keep their own takings, leave them{" "}
            <strong>self-employed</strong> (the default) so their earnings stay
            private to their own portal and out of your Insights revenue.
          </p>
          <h3>Why don&apos;t I see Revenue for a staff member I can see the schedule for?</h3>
          <p>
            Revenue on Insights only ever includes bookings handled by staff
            marked <strong>employed</strong>. A self-employed team member&apos;s
            schedule is visible to you (so you know who&apos;s in and when),
            but their takings are their own business, not the shop&apos;s —
            mark them employed instead if that should change.
          </p>
          <h3>Is there a cost to try it?</h3>
          <p>
            Every business gets a free 30-day trial with no card required. About
            a week before your trial ends, you&apos;ll get your first invoice
            with a Stripe payment link so there&apos;s time to pay before
            anything changes. If your account isn&apos;t marked as paid by the
            end of your trial, your booking page is temporarily switched off
            until you get in touch (see <Link href="/about">About &amp; support</Link>).
          </p>
          <h3>Does no-show protection cost anything to turn on?</h3>
          <p>
            No — it&apos;s included free with every plan. A fee is only ever
            charged when a customer genuinely doesn&apos;t show up, and only if
            you choose to charge it.
          </p>
        </section>
      </div>

      <footer className="home-footer">
        <div className="home-footer-links">
          <Link href="/">Home</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/compare">Compare</Link>
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
