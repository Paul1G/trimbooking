import Link from "next/link";
import "../home.css";

type Row = {
  feature: string;
  us: string;
  them: string;
};

type Group = {
  title: string;
  rows: Row[];
};

// Kept as data so a second or third competitor column is a small change,
// not a rewrite — see the note at the bottom of the page.
const groups: Group[] = [
  {
    title: "Pricing",
    rows: [
      { feature: "4 staff or fewer", us: "£20/month", them: "£39.99/month" },
      { feature: "10 staff", us: "£35/month", them: "£39.99/month" },
      { feature: "12+ staff", us: "£40+/month", them: "£39.99/month (flat)" },
      { feature: "Optional AI assistant", us: "—", them: "+£24.99/month" },
      { feature: "Commission on bookings", us: "None", them: "None" },
      { feature: "Contract", us: "None, cancel any time", them: "None, cancel any time" },
      { feature: "Free trial", us: "30 days, no card", them: "14 days, no card" },
    ],
  },
  {
    title: "Booking & scheduling",
    rows: [
      { feature: "Branded booking page", us: "Yes", them: "Yes" },
      { feature: "Staff calendars, hours, breaks & holidays", us: "Yes", them: "Yes" },
      { feature: "Accept/decline or auto-confirm bookings", us: "Yes", them: "Automatic confirmation" },
      { feature: "Parallel treatment (e.g. colour processing time)", us: "Yes", them: "Yes" },
      { feature: "Waitlist for cancelled slots", us: "—", them: "Yes" },
      { feature: "Room & equipment scheduling", us: "—", them: "Yes" },
      { feature: "SMS reminders", us: "—", them: "Yes" },
      { feature: "Email confirmations & reminders", us: "Yes", them: "Yes" },
    ],
  },
  {
    title: "Staff & money",
    rows: [
      { feature: "Self-employed staff: earnings private by default", us: "Yes", them: "Not specified" },
      { feature: "Employed staff: owner sees schedule & earnings", us: "Yes", them: "Yes" },
      { feature: "No-show protection (card held, charged only on no-show)", us: "Yes", them: "Deposit at booking" },
      { feature: "No-show fee paid straight to staff's own account", us: "Yes", them: "Not specified" },
      { feature: "Staff's own insights (takings, best week, regulars)", us: "Yes", them: "Not specified" },
    ],
  },
  {
    title: "Business insights",
    rows: [
      { feature: "Revenue, appointments, utilisation, avg. spend", us: "Yes", them: "Yes" },
      { feature: "Busy/quiet heatmap", us: "Yes", them: "Not specified" },
      { feature: "Top spenders & lapsed clients", us: "Yes", them: "Not specified" },
      { feature: "By-team-member breakdown", us: "Yes", them: "Yes" },
      { feature: "AI assistant for business questions", us: "—", them: "Optional add-on" },
    ],
  },
  {
    title: "Beyond booking",
    rows: [
      { feature: "Card payments / POS for retail", us: "—", them: "Yes" },
      { feature: "Gift cards & loyalty rewards", us: "—", them: "Yes" },
      { feature: "Marketing & SMS campaigns", us: "—", them: "Yes" },
      { feature: "Consent / consultation forms", us: "—", them: "Yes" },
      { feature: "Detailed client records (formulas, allergies, tags)", us: "Basic visit history", them: "Yes" },
    ],
  },
];

function Cell({ value, emphasise }: { value: string; emphasise?: boolean }) {
  const cls =
    value === "—"
      ? "compare-no"
      : /^(yes|none)$/i.test(value)
        ? "compare-yes"
        : "";
  return (
    <td className={emphasise ? "compare-us" : undefined}>
      <span className={cls}>{value}</span>
    </td>
  );
}

export default function ComparePage() {
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
          <Link href="/compare" style={{ fontSize: "0.9rem", color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>
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

      <header className="home-hero">
        <h1>How TrimBooking compares</h1>
        <p>
          An honest, side-by-side look at how TrimBooking stacks up against other booking
          platforms — where we&apos;re ahead, where we&apos;re behind, and who each one actually
          suits best.
        </p>
      </header>

      <div className="doc-wrap" style={{ paddingTop: 0 }}>
        <section className="doc-section">
          <h2>TrimBooking vs. Revyfy</h2>
          <p>
            <a href="https://revyfy.com" target="_blank" rel="noopener noreferrer">Revyfy</a>{" "}
            is a fuller salon-management platform — booking plus point of sale, retail,
            gift cards, marketing campaigns and an optional AI assistant — aimed at
            hair salons, barbershops, nail/brow studios, aesthetic clinics and spas.
            Figures below are taken from their public pricing page; &quot;not specified&quot;
            means we couldn&apos;t find a clear answer either way on their site.
          </p>

          {groups.map((g) => (
            <div key={g.title} style={{ marginBottom: "2rem" }}>
              <h3 style={{ marginTop: 0 }}>{g.title}</h3>
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th className="compare-us">TrimBooking</th>
                      <th>Revyfy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.feature}>
                        <td className="compare-feature">{r.feature}</td>
                        <Cell value={r.us} emphasise />
                        <Cell value={r.them} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <section className="doc-section">
          <h2>The honest summary</h2>
          <p>
            TrimBooking is a leaner, cheaper tool focused on booking, staff scheduling
            and business insights — built specifically around how small barbershops,
            salons and grooming businesses actually run, including teams with a mix of
            employed staff and chair-renting self-employed staff. For a team of four or
            fewer, you&apos;re roughly half Revyfy&apos;s price, and you stay cheaper right up
            until around 12 staff, where their flat unlimited-staff fee starts to win out.
          </p>
          <p>
            Revyfy is the better fit if you need a single system for everything —
            taking card payments at the till, selling retail products and gift cards,
            running marketing campaigns, collecting consent forms, or scheduling rooms
            and equipment as well as staff. None of that is part of TrimBooking today.
          </p>
          <div className="doc-note">
            <strong>In short:</strong> choose TrimBooking if you want booking, staff
            earnings privacy and insights done well and cheaply for a small team.
            Choose Revyfy if you want a full salon-management suite — POS, retail,
            marketing and an AI assistant — and don&apos;t mind paying a flat fee for it
            regardless of team size.
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            We keep this page updated as either platform changes. More comparisons
            (Fresha, Vagaro, Treatwell, Booksy) are coming soon — if you&apos;d like us to
            prioritise one, let us know at{" "}
            <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>.
          </p>
        </section>
      </div>

      <section className="home-cta">
        <h2>Ready to try TrimBooking?</h2>
        <p>Free for 30 days, no card required — see for yourself.</p>
        <Link href="/signup" className="btn-dark">Get started</Link>
      </section>

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
