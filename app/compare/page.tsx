import Link from "next/link";
import "../home.css";

type Row = {
  feature: string;
  us: string;
  revyfy: string;
  fresha: string;
  vagaro: string;
  treatwell: string;
};

type Group = {
  title: string;
  rows: Row[];
};

const COMPETITORS: { key: keyof Omit<Row, "feature" | "us">; name: string }[] = [
  { key: "revyfy", name: "Revyfy" },
  { key: "fresha", name: "Fresha" },
  { key: "vagaro", name: "Vagaro" },
  { key: "treatwell", name: "Treatwell" },
];

// Kept as data so adding another competitor is a new key on each row, not a
// rewrite of the page. "Not specified" means we couldn't confirm it either
// way from that platform's own public pages — see the sources note below.
const groups: Group[] = [
  {
    title: "Pricing",
    rows: [
      {
        feature: "Pricing model",
        us: "Flat fee + per extra staff",
        revyfy: "Flat fee, unlimited staff",
        fresha: "Per bookable team member",
        vagaro: "Flat fee + per extra calendar",
        treatwell: "No subscription — commission per booking",
      },
      {
        feature: "Cost for a solo operator",
        us: "£20/month",
        revyfy: "£39.99/month",
        fresha: "$19.95/month (USD)",
        vagaro: "£20/month (UK pricing)",
        treatwell: "No official monthly fee",
      },
      {
        feature: "Cost for 4 staff (approx.)",
        us: "£20/month",
        revyfy: "£39.99/month",
        fresha: "~$59.80/month (USD)",
        vagaro: "~£44/month (£20 + 3 extra calendars, billed in USD)",
        treatwell: "No official monthly fee",
      },
      {
        feature: "Commission per booking",
        us: "None",
        revyfy: "None",
        fresha: "20% one-off on new clients, free on repeat",
        vagaro: "None",
        treatwell: "35% + VAT on new clients (~42% effective), free on repeat",
      },
      {
        feature: "Payment processing fee",
        us: "Stripe's standard rate",
        revyfy: "Not specified",
        fresha: "2.3–3.3% + $0.20–0.30 per transaction",
        vagaro: "Not specified for UK — US rate ~2.6% + $0.10",
        treatwell: "2.5% + VAT online, or 1.1% + 20p + VAT on card machine",
      },
      {
        feature: "AI assistant",
        us: "—",
        revyfy: "+£24.99/month add-on",
        fresha: "+$99.95/location add-on",
        vagaro: "Included",
        treatwell: "AI receptionist mentioned, pricing not specified",
      },
      {
        feature: "Contract",
        us: "None, cancel any time",
        revyfy: "None, cancel any time",
        fresha: "None stated",
        vagaro: "None, cancel any time",
        treatwell: "None, free to join",
      },
      {
        feature: "Free trial",
        us: "30 days, no card",
        revyfy: "14 days, no card",
        fresha: "7 days",
        vagaro: "30 days",
        treatwell: "Not applicable (no subscription)",
      },
    ],
  },
  {
    title: "Booking & scheduling",
    rows: [
      { feature: "Branded booking page", us: "Yes", revyfy: "Yes", fresha: "Yes", vagaro: "Yes", treatwell: "Marketplace listing, not a branded page" },
      { feature: "Staff calendars, hours, breaks & holidays", us: "Yes", revyfy: "Yes", fresha: "Yes", vagaro: "Yes", treatwell: "Not specified" },
      { feature: "Accept/decline or auto-confirm bookings", us: "Yes", revyfy: "Automatic confirmation", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Parallel treatment (e.g. colour processing time)", us: "Yes", revyfy: "Yes", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Waitlist for cancelled slots", us: "—", revyfy: "Yes", fresha: "Yes", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Room & equipment scheduling", us: "—", revyfy: "Yes", fresha: "Not specified", vagaro: "Yes", treatwell: "Not specified" },
      { feature: "SMS reminders", us: "—", revyfy: "Yes", fresha: "Yes, free allowance then pay-per-text", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Email confirmations & reminders", us: "Yes", revyfy: "Yes", fresha: "Yes, free allowance then pay-per-email", vagaro: "Yes, 1,000 free/month", treatwell: "Not specified" },
    ],
  },
  {
    title: "Staff & money",
    rows: [
      { feature: "Self-employed staff: earnings private by default", us: "Yes", revyfy: "Not specified", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Employed staff: owner sees schedule & earnings", us: "Yes", revyfy: "Yes", fresha: "Yes (commissions, wages, timesheets)", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "No-show protection (card held, charged only on no-show)", us: "Yes", revyfy: "Deposit at booking", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "No-show fee paid straight to staff's own account", us: "Yes", revyfy: "Not specified", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Staff's own insights (takings, best week, regulars)", us: "Yes", revyfy: "Not specified", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
    ],
  },
  {
    title: "Business insights",
    rows: [
      { feature: "Revenue, appointments, utilisation, avg. spend", us: "Yes", revyfy: "Yes", fresha: "Yes (reporting)", vagaro: "Yes (advanced reporting)", treatwell: "Basic performance tracking" },
      { feature: "Busy/quiet heatmap", us: "Yes", revyfy: "Not specified", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "Top spenders & lapsed clients", us: "Yes", revyfy: "Not specified", fresha: "Not specified", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "By-team-member breakdown", us: "Yes", revyfy: "Yes", fresha: "Yes (Team plan)", vagaro: "Not specified", treatwell: "Not specified" },
      { feature: "AI assistant for business questions", us: "—", revyfy: "Optional add-on", fresha: "Optional add-on", vagaro: "Included", treatwell: "Mentioned (AI receptionist)" },
    ],
  },
  {
    title: "Beyond booking",
    rows: [
      { feature: "Card payments / POS for retail", us: "—", revyfy: "Yes", fresha: "Yes", vagaro: "Yes", treatwell: "Payments only (Treatwell Pay)" },
      { feature: "Gift cards & loyalty rewards", us: "—", revyfy: "Yes", fresha: "Yes, loyalty is a paid add-on", vagaro: "Yes", treatwell: "Not specified" },
      { feature: "Marketing & SMS campaigns", us: "—", revyfy: "Yes", fresha: "Yes, pay-per-message above free allowance", vagaro: "Yes", treatwell: "Marketplace exposure, not campaign tools" },
      { feature: "Consent / consultation forms", us: "—", revyfy: "Yes", fresha: "Yes", vagaro: "Yes (SOAP notes & forms)", treatwell: "Not specified" },
      { feature: "Detailed client records (formulas, allergies, tags)", us: "Basic visit history", revyfy: "Yes", fresha: "Yes", vagaro: "Not specified", treatwell: "Not specified" },
    ],
  },
];

function Cell({ value, emphasise }: { value: string; emphasise?: boolean }) {
  const cls =
    value === "—"
      ? "compare-no"
      : /^(yes|none)$/i.test(value)
        ? "compare-yes"
        : /not specified/i.test(value)
          ? "compare-no"
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
          <h2>TrimBooking vs. Revyfy, Fresha, Vagaro &amp; Treatwell</h2>
          <p>
            <a href="https://revyfy.com" target="_blank" rel="noopener noreferrer">Revyfy</a>,{" "}
            <a href="https://www.fresha.com" target="_blank" rel="noopener noreferrer">Fresha</a>,{" "}
            <a href="https://www.vagaro.com" target="_blank" rel="noopener noreferrer">Vagaro</a> and{" "}
            <a href="https://www.treatwell.co.uk" target="_blank" rel="noopener noreferrer">Treatwell</a>{" "}
            are four very different approaches to the same problem — a full salon-management
            suite, a per-staff subscription with a marketplace, a US-style all-in-one with
            modular add-ons, and a commission-only marketplace with no subscription at all.
            Figures below are taken from each platform&apos;s own public pricing page.
            &quot;Not specified&quot; means we couldn&apos;t confirm that one either way — it
            doesn&apos;t necessarily mean the feature is missing, only that we didn&apos;t find
            a clear answer on their site.
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
                      {COMPETITORS.map((c) => (
                        <th key={c.key}>{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.feature}>
                        <td className="compare-feature">{r.feature}</td>
                        <Cell value={r.us} emphasise />
                        {COMPETITORS.map((c) => (
                          <Cell key={c.key} value={r[c.key]} />
                        ))}
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
            fewer, you&apos;re roughly half Revyfy&apos;s price and well under Fresha&apos;s or
            Vagaro&apos;s, with no commission eating into every booking the way Treatwell&apos;s
            does.
          </p>
          <ul>
            <li>
              <strong>Revyfy</strong> is the closest match in spirit — a flat monthly fee,
              no commission — but a fuller suite (POS, retail, marketing, forms) at a
              flat price regardless of team size, which overtakes TrimBooking&apos;s per-staff
              pricing once you&apos;re past around 12 staff.
            </li>
            <li>
              <strong>Fresha</strong> charges per bookable team member plus a one-off
              commission on new marketplace clients, plus pay-as-you-go email/SMS and
              several paid add-ons (AI, loyalty, insights) — the headline price is low,
              but it adds up quickly once a team and its extras grow.
            </li>
            <li>
              <strong>Vagaro</strong> actually quotes a genuine UK price —{" "}
              <strong>£20/month</strong> for one location, close to TrimBooking&apos;s own
              fee. But that&apos;s only the base plan: extra staff calendars, and most
              add-ons (website, marketing, payments), are still billed in US dollars, so
              the real monthly cost for a team of several staff ends up part-GBP,
              part-USD and moves with the exchange rate.
            </li>
            <li>
              <strong>Treatwell</strong> isn&apos;t really a back-office system at all — no
              official monthly fee in the UK, but a <strong>35% + VAT commission (≈42%
              effective)</strong> on every new client it brings you, dropping to 0% on
              their repeat visits. It&apos;s better thought of as a marketing/lead-generation
              channel to run alongside a real booking system than a replacement for one —
              and a few partners have reported an undisclosed software fee in their
              contract, so it&apos;s worth checking your own agreement rather than assuming
              it&apos;s free.
            </li>
          </ul>
          <div className="doc-note">
            <strong>In short:</strong> choose TrimBooking if you want booking, staff
            earnings privacy and insights done well and cheaply for a small team, with
            nothing taken as commission. Choose Revyfy, Fresha or Vagaro if you need a
            full salon-management suite — POS, retail, marketing, forms — and are happy
            to pay more for it. Treatwell is worth having alongside any of these for the
            marketplace exposure, not instead of one.
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Vagaro&apos;s £20/month base fee is a genuine UK price, but extra staff
            calendars and most add-ons are still billed in US dollars — so a multi-staff
            Vagaro bill will move with the GBP/USD exchange rate. Fresha publishes its
            core pricing in US dollars only; the figures above are its listed $ price, not
            a currency conversion. Treatwell doesn&apos;t publish a UK subscription fee, so
            we&apos;ve shown none — some partner agreements reportedly include one, so
            check your own contract. Every platform&apos;s pricing and feature set can
            change at any time — we keep this page updated as we notice changes, but
            always double-check anything pricing-critical on the provider&apos;s own site
            before deciding. If you&apos;d like us to add another platform, let us know at{" "}
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
