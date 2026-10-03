'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  bestWeek,
  busyQuietHeatmap,
  busyQuietInsights,
  firstVisitMap,
  getPeriod,
  hourLabel,
  lapsedClients,
  pctChange,
  perStaff,
  shortDate,
  summarise,
  taxYearStart,
  topClients,
  weeklySeries,
  WEEKDAYS,
  type CapacityInputs,
  type InsightBooking,
  type PeriodKind,
} from '@/lib/insights'

// One insights screen, used in two places with different data and rights:
// - the shop dashboard (owner / admins): every booking in the shop
// - a staff member's own portal: only their own bookings
// `showMoney` hides every £ figure (admins don't see the shop's takings, same
// as they don't see billing). `showStaffTable` adds the per-person breakdown,
// which deliberately has no money in it — individual earnings stay in each
// staff member's own portal.
export default function InsightsView({
  bookings,
  capacity,
  showMoney,
  showContacts,
  showStaffTable,
  customersHref,
  restrictRevenueToEmployed,
}: {
  bookings: InsightBooking[]
  capacity: CapacityInputs
  showMoney: boolean
  showContacts: boolean
  showStaffTable: boolean
  customersHref?: string
  // A self-employed team member's takings are their own business, not the
  // shop's — when set, every £ figure on this page (KPIs, week-on-week,
  // top clients, lapsed clients) only counts bookings handled by an
  // 'employed' team member. The appointment/client/utilisation counts next
  // to them still reflect the whole shop's diary, money aside.
  restrictRevenueToEmployed?: boolean
}) {
  const [kind, setKind] = useState<PeriodKind>('week')
  const [now] = useState(() => new Date())

  const revenueStaffIds = useMemo(
    () =>
      restrictRevenueToEmployed
        ? new Set(capacity.staff.filter((s) => s.employment_status === 'employed').map((s) => s.id))
        : undefined,
    [restrictRevenueToEmployed, capacity.staff]
  )

  const firstVisits = useMemo(() => firstVisitMap(bookings, now), [bookings, now])
  const period = useMemo(() => getPeriod(kind, now), [kind, now])
  const current = useMemo(
    () => summarise(bookings, period.start, period.end, capacity, now, firstVisits, undefined, revenueStaffIds),
    [bookings, period, capacity, now, firstVisits, revenueStaffIds]
  )
  const previous = useMemo(
    () => summarise(bookings, period.compareStart, period.compareEnd, capacity, now, firstVisits, undefined, revenueStaffIds),
    [bookings, period, capacity, now, firstVisits, revenueStaffIds]
  )

  const metric: 'revenue' | 'visits' = showMoney ? 'revenue' : 'visits'
  const year = useMemo(() => weeklySeries(bookings, now, 52, revenueStaffIds), [bookings, now, revenueStaffIds])
  const recent = year.slice(-12)
  const best = bestWeek(year, metric)
  const thisWeek = recent[recent.length - 1]
  const lastWeek = recent[recent.length - 2]
  const fullWeeks = recent.slice(0, -1)
  const weekPeriod = useMemo(() => getPeriod('week', now), [now])
  const weekNow = useMemo(
    () => summarise(bookings, weekPeriod.start, weekPeriod.end, capacity, now, firstVisits, undefined, revenueStaffIds),
    [bookings, weekPeriod, capacity, now, firstVisits, revenueStaffIds]
  )
  const weekPrev = useMemo(
    () => summarise(bookings, weekPeriod.compareStart, weekPeriod.compareEnd, capacity, now, firstVisits, undefined, revenueStaffIds),
    [bookings, weekPeriod, capacity, now, firstVisits, revenueStaffIds]
  )
  const avgWeek = fullWeeks.length ? fullWeeks.reduce((s, p) => s + p[metric], 0) / fullWeeks.length : 0

  const heatmap = useMemo(() => busyQuietHeatmap(bookings, capacity, now), [bookings, capacity, now])
  const busyNotes = useMemo(() => busyQuietInsights(heatmap), [heatmap])

  const tyStart = taxYearStart(now)
  const top = useMemo(
    () => topClients(bookings, tyStart, now, now, showMoney ? 'spend' : 'visits', 10, revenueStaffIds),
    [bookings, tyStart, now, showMoney, revenueStaffIds]
  )
  const lapsed = useMemo(() => lapsedClients(bookings, now, 90, revenueStaffIds), [bookings, now, revenueStaffIds])
  const staffRows = useMemo(
    () => (showStaffTable ? perStaff(bookings, period.start, period.end, capacity, now, firstVisits) : []),
    [showStaffTable, bookings, period, capacity, now, firstVisits]
  )

  if (bookings.length === 0) {
    return (
      <div className="card" style={{ cursor: 'default' }}>
        <p className="card-sub" style={{ margin: 0 }}>
          No bookings yet — insights will fill in as soon as appointments start coming through.
        </p>
      </div>
    )
  }

  return (
    <div className="insights">
      {/* ---------- period + KPIs ---------- */}
      <div className="insights-pills" role="tablist" aria-label="Period">
        {(
          [
            ['week', 'This week'],
            ['lastMonth', 'Last month'],
            ['taxYear', 'This tax year'],
          ] as [PeriodKind, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            className={`insights-pill${kind === k ? ' is-active' : ''}`}
            onClick={() => setKind(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="insights-caption">
        {period.label} ({shortDate(period.start)} – {shortDate(kind === 'lastMonth' ? new Date(period.end.getTime() - 1) : period.end)}), compared with {period.compareLabel}
      </p>

      <div className="insights-kpis">
        {showMoney && (
          <Kpi
            tone="#16a34a"
            label="Revenue"
            value={money(current.revenue)}
            sub={restrictRevenueToEmployed ? 'Employed staff only' : undefined}
            change={pctChange(current.revenue, previous.revenue)}
            prev={money(previous.revenue)}
          />
        )}
        <Kpi tone="#2563eb" label="Appointments" value={String(current.visits)} change={pctChange(current.visits, previous.visits)} prev={String(previous.visits)} />
        <Kpi
          tone="#7c3aed"
          label="Utilisation"
          value={current.utilisation == null ? '—' : pct(current.utilisation)}
          sub={current.utilisation == null ? 'Set opening and staff hours' : `${hours(current.bookedMins)} of ${hours(current.capacityMins)} booked`}
          change={
            current.utilisation != null && previous.utilisation != null ? current.utilisation - previous.utilisation : null
          }
          changeIsPoints
          prev={previous.utilisation == null ? '—' : pct(previous.utilisation)}
        />
        {showMoney && (
          <Kpi
            tone="#d97706"
            label="Avg spend"
            value={money(current.avgSpend, 2)}
            sub={restrictRevenueToEmployed ? 'Employed staff only' : undefined}
            change={pctChange(current.avgSpend, previous.avgSpend)}
            prev={money(previous.avgSpend, 2)}
          />
        )}
        <Kpi
          tone="#0d9488"
          label="Clients"
          value={String(current.clients)}
          sub={`${current.newClients} new`}
          change={pctChange(current.clients, previous.clients)}
          prev={String(previous.clients)}
        />
        <Kpi
          tone="#e11d48"
          label="No-shows"
          value={String(current.noShows)}
          sub={`${current.cancellations} cancelled`}
          change={pctChange(current.noShows, previous.noShows)}
          prev={String(previous.noShows)}
          lowerIsBetter
        />
      </div>

      {/* ---------- week on week ---------- */}
      <section className="insights-section">
        <h2 className="insights-h2">Week on week</h2>
        <div className="insights-stats">
          <MiniStat
            label="This week so far"
            value={fmtMetric(thisWeek[metric], metric)}
            note={`${changeText(pctChange(weekNow[metric], weekPrev[metric]))} vs same point last week`}
          />
          <MiniStat label="Last week" value={fmtMetric(lastWeek?.[metric] ?? 0, metric)} note={`Avg week: ${fmtMetric(avgWeek, metric)}`} />
          <MiniStat
            label="Best week (last 12 months)"
            value={best ? fmtMetric(best[metric], metric) : '—'}
            note={best ? `w/c ${shortDate(best.weekStart)}${best[metric] && lastWeek ? ` · last week was ${pct(lastWeek[metric] / best[metric])} of it` : ''}` : undefined}
            highlight
          />
        </div>
        <WeekBars points={recent} metric={metric} bestStart={best?.weekStart.getTime() ?? null} />
      </section>

      {/* ---------- busy / quiet ---------- */}
      <section className="insights-section">
        <h2 className="insights-h2">Busy and quiet times</h2>
        <p className="insights-caption">How full each hour is, over the last {heatmap.weeks} weeks.</p>
        {busyNotes.length > 0 && (
          <ul className="insights-notes">
            {busyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <Heatmap hm={heatmap} />
      </section>

      {/* ---------- per staff ---------- */}
      {showStaffTable && staffRows.length > 0 && (
        <section className="insights-section">
          <h2 className="insights-h2">By team member · {period.label}</h2>
          <div className="insights-table-wrap">
            <table className="insights-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="num">Appts</th>
                  <th className="num">Hours booked</th>
                  <th className="num">Utilisation</th>
                  <th className="num">Clients</th>
                  {showMoney && <th className="num">Revenue</th>}
                </tr>
              </thead>
              <tbody>
                {staffRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num">{r.visits}</td>
                    <td className="num">{r.bookedHours.toFixed(1)}</td>
                    <td className="num">
                      {r.utilisation == null ? '—' : (
                        <span className="insights-util">
                          <span className="insights-util-bar"><span style={{ width: pct(r.utilisation) }} /></span>
                          {pct(r.utilisation)}
                        </span>
                      )}
                    </td>
                    <td className="num">{r.clients}</td>
                    {/* An employed team member's earnings are the shop's own
                       money, same as their schedule is visible to the owner
                       elsewhere — a self-employed one's stay private to their
                       own portal. */}
                    {showMoney && <td className="num strong">{r.employed ? money(r.revenue) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="insights-caption">
            {showMoney
              ? 'Revenue is shown for employed team members only — self-employed team members’ earnings stay private to their own portal.'
              : 'Earnings per person stay private to each team member’s own portal.'}
          </p>
        </section>
      )}

      {/* ---------- top clients ---------- */}
      <section className="insights-section">
        <h2 className="insights-h2">
          Top 10 {showMoney ? 'spenders' : 'clients'} · tax year {tyStart.getFullYear()}/{String((tyStart.getFullYear() + 1) % 100).padStart(2, '0')}
        </h2>
        {restrictRevenueToEmployed && showMoney && (
          <p className="insights-caption">Spend shown is for employed team members only.</p>
        )}
        {top.length === 0 ? (
          <p className="insights-caption">No visits yet this tax year.</p>
        ) : (
          <div className="insights-table-wrap">
            <table className="insights-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Client</th>
                  <th className="num">Visits</th>
                  {showMoney && <th className="num">Spent</th>}
                  <th className="num">Last in</th>
                </tr>
              </thead>
              <tbody>
                {top.map((c, i) => (
                  <tr key={c.key}>
                    <td className="num muted">{i + 1}</td>
                    <td>{c.name}</td>
                    <td className="num">{c.visits}</td>
                    {showMoney && <td className="num strong">{money(c.spend)}</td>}
                    <td className="num muted">{c.lastVisit ? shortDate(c.lastVisit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- lapsed ---------- */}
      <LapsedList lapsed={lapsed} showMoney={showMoney} showContacts={showContacts} customersHref={customersHref} />
    </div>
  )
}

// ---------- pieces ----------

function Kpi({
  label,
  value,
  sub,
  change,
  prev,
  lowerIsBetter,
  changeIsPoints,
  tone: toneColor,
}: {
  label: string
  value: string
  sub?: string
  change: number | null
  prev: string
  lowerIsBetter?: boolean
  changeIsPoints?: boolean
  // A fixed accent colour for this metric, independent of the shop's own
  // brand colour — these cards are meant to read as a colourful dashboard,
  // not as another place the single brand accent shows up.
  tone?: string
}) {
  let tone: 'up' | 'down' | 'flat' = 'flat'
  if (change != null && Math.abs(change) >= 0.005) {
    const good = lowerIsBetter ? change < 0 : change > 0
    tone = good ? 'up' : 'down'
  }
  const arrow = change == null || Math.abs(change) < 0.005 ? '' : change > 0 ? '▲ ' : '▼ '
  const changeStr =
    change == null
      ? 'no data to compare'
      : changeIsPoints
        ? `${arrow}${change > 0 ? '+' : ''}${Math.abs(Math.round(change * 100))} pts`
        : `${arrow}${change > 0 ? '+' : ''}${Math.abs(Math.round(change * 100))}%`
  return (
    <div className="insights-kpi" style={toneColor ? { borderLeft: `4px solid ${toneColor}` } : undefined}>
      <div className="insights-kpi-label">{label}</div>
      <div className="insights-kpi-value" style={toneColor ? { color: toneColor } : undefined}>{value}</div>
      {sub && <div className="insights-kpi-sub">{sub}</div>}
      <div className={`insights-delta ${tone}`}>
        {changeStr}
        {change != null && <span className="insights-delta-prev"> (was {prev})</span>}
      </div>
    </div>
  )
}

function MiniStat({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div className={`insights-mini${highlight ? ' is-best' : ''}`}>
      <div className="insights-kpi-label">{highlight ? '★ ' : ''}{label}</div>
      <div className="insights-mini-value">{value}</div>
      {note && <div className="insights-kpi-sub">{note}</div>}
    </div>
  )
}

function WeekBars({
  points,
  metric,
  bestStart,
}: {
  points: ReturnType<typeof weeklySeries>
  metric: 'revenue' | 'visits'
  bestStart: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p[metric]))
  const shown = hover ?? points.length - 1
  const p = points[shown]
  return (
    <div className="insights-chart">
      <div className="insights-chart-readout" aria-live="polite">
        <strong>w/c {shortDate(p.weekStart)}</strong>
        {p.isCurrent ? ' (so far)' : ''}: {fmtMetric(p.revenue, 'revenue')} · {p.visits} appt{p.visits === 1 ? '' : 's'}
        {bestStart === p.weekStart.getTime() ? ' · best week' : ''}
      </div>
      <div className="insights-bars" onMouseLeave={() => setHover(null)}>
        {points.map((pt, i) => {
          const isBest = bestStart === pt.weekStart.getTime()
          const h = (pt[metric] / max) * 100
          return (
            <button
              key={pt.weekStart.getTime()}
              className={`insights-bar-col${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`Week of ${shortDate(pt.weekStart)}: ${fmtMetric(pt[metric], metric)}`}
            >
              {isBest && <span className="insights-best-tag">Best</span>}
              <span
                className={`insights-bar${pt.isCurrent ? ' is-current' : ''}${isBest ? ' is-best' : ''}`}
                style={{ height: `${Math.max(h, pt[metric] > 0 ? 2 : 0)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="insights-bar-axis">
        {points.map((pt, i) => (
          <span key={pt.weekStart.getTime()}>{i % 3 === 2 || i === points.length - 1 ? shortDate(pt.weekStart) : ''}</span>
        ))}
      </div>
      <div className="insights-caption" style={{ marginTop: 6 }}>
        {metric === 'revenue' ? 'Revenue' : 'Appointments'} per week (Mon–Sun). The lighter bar is this week so far.
      </div>
    </div>
  )
}

function Heatmap({ hm }: { hm: ReturnType<typeof busyQuietHeatmap> }) {
  const [sel, setSel] = useState<{ d: number; h: number } | null>(null)
  if (hm.hours.length === 0) {
    return <p className="insights-caption">Not enough history yet.</p>
  }
  const hasCapacity = hm.byDay.some((d) => d.capacity > 0)
  const maxVisits = Math.max(1, ...hm.cells.map((c) => c.visits))
  const level = (d: number, h: number) => {
    const c = hm.cells[d * 24 + h]
    if (hasCapacity) return c.capacity > 0 ? Math.min(1, c.booked / c.capacity) : null
    return c.visits > 0 ? c.visits / maxVisits : 0
  }
  // With opening hours set, only show hours someone could actually be booked.
  const rows = hasCapacity ? hm.hours.filter((h) => hm.cells.some((c) => c.hour === h && c.capacity > 0)) : hm.hours
  const selCell = sel ? hm.cells[sel.d * 24 + sel.h] : null
  return (
    <div className="insights-heat-wrap">
      <div className="insights-chart-readout" aria-live="polite">
        {selCell && sel ? (
          <>
            <strong>
              {WEEKDAYS[sel.d]} {hourLabel(sel.h)}–{hourLabel(sel.h + 1)}
            </strong>
            {': '}
            {hasCapacity
              ? selCell.capacity > 0
                ? `${pct(Math.min(1, selCell.booked / selCell.capacity))} booked`
                : 'closed'
              : ''}
            {` · ${(selCell.visits / hm.weeks).toFixed(1)} appts a week`}
          </>
        ) : (
          'Tap a square for details'
        )}
      </div>
      <div className="insights-heat" style={{ gridTemplateColumns: `2.6rem repeat(7, 1fr)` }}>
        <span />
        {WEEKDAYS.map((d) => (
          <span key={d} className="insights-heat-col">{d}</span>
        ))}
        {rows.map((h) => (
          <HeatRow key={h} h={h} level={level} sel={sel} onSelect={setSel} />
        ))}
      </div>
      <div className="insights-heat-legend">
        <span>Quiet</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
          <span key={v} className="insights-heat-swatch" style={{ ['--lvl' as string]: String(v) }} />
        ))}
        <span>Full</span>
        {hasCapacity && (
          <>
            <span className="insights-heat-swatch is-closed" style={{ marginLeft: 12 }} />
            <span>Closed</span>
          </>
        )}
      </div>
    </div>
  )
}

function HeatRow({
  h,
  level,
  sel,
  onSelect,
}: {
  h: number
  level: (d: number, h: number) => number | null
  sel: { d: number; h: number } | null
  onSelect: (v: { d: number; h: number }) => void
}) {
  return (
    <>
      <span className="insights-heat-row">{hourLabel(h)}</span>
      {WEEKDAYS.map((_, d) => {
        const v = level(d, h)
        const active = sel?.d === d && sel?.h === h
        return (
          <button
            key={d}
            className={`insights-heat-cell${v == null ? ' is-closed' : ''}${active ? ' is-active' : ''}`}
            style={v == null ? undefined : { ['--lvl' as string]: String(v) }}
            onMouseEnter={() => onSelect({ d, h })}
            onFocus={() => onSelect({ d, h })}
            onClick={() => onSelect({ d, h })}
            aria-label={`${WEEKDAYS[d]} ${hourLabel(h)}: ${v == null ? 'closed' : pct(v)}`}
          />
        )
      })}
    </>
  )
}

function LapsedList({
  lapsed,
  showMoney,
  showContacts,
  customersHref,
}: {
  lapsed: ReturnType<typeof lapsedClients>
  showMoney: boolean
  showContacts: boolean
  customersHref?: string
}) {
  const [all, setAll] = useState(false)
  const list = all ? lapsed : lapsed.slice(0, 10)
  return (
    <section className="insights-section">
      <h2 className="insights-h2">Not seen in 3 months · {lapsed.length}</h2>
      <p className="insights-caption">
        Clients whose last visit was over 3 months ago and who have nothing booked
        {showMoney ? ' — most valuable first.' : ' — most regular first.'} You decide who to reach out to.
      </p>
      {lapsed.length === 0 ? (
        <p className="insights-caption">Nobody — everyone has been in recently or is booked in. 🎉</p>
      ) : (
        <div className="card-list">
          {list.map((c) => (
            <div key={c.key} className="card insights-lapsed" style={{ cursor: 'default' }}>
              <div style={{ minWidth: 0 }}>
                <div className="card-title">{c.name}</div>
                <div className="card-sub">
                  Last in {c.lastVisit?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  {monthsAgo(c.daysSince)} · {c.visits} visit{c.visits === 1 ? '' : 's'}
                  {showMoney ? ` · ${money(c.spend)} lifetime` : ''}
                </div>
              </div>
              {showContacts && (c.phone || c.email) && (
                <div className="insights-contact">
                  {c.phone && <a href={`tel:${c.phone.replace(/\s+/g, '')}`}>Call</a>}
                  {c.email && <a href={`mailto:${c.email}`}>Email</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {lapsed.length > 10 && (
          <button className="insights-link-btn" onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${lapsed.length}`}
          </button>
        )}
        {customersHref && (
          <Link href={customersHref} className="insights-link-btn">
            Open Customers →
          </Link>
        )}
      </div>
    </section>
  )
}

// ---------- formatting ----------

function money(n: number, dp = 0): string {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: dp, maximumFractionDigits: dp })
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function hours(mins: number): string {
  const h = mins / 60
  return `${h >= 10 ? Math.round(h) : h.toFixed(1)}h`
}

function fmtMetric(v: number, metric: 'revenue' | 'visits'): string {
  return metric === 'revenue' ? money(v) : `${Math.round(v * 10) / 10} appts`
}

function changeText(c: number | null): string {
  if (c == null) return 'Nothing to compare'
  return `${c > 0 ? '▲ +' : c < 0 ? '▼ ' : ''}${Math.abs(Math.round(c * 100))}%`
}

function monthsAgo(days: number): string {
  const m = Math.floor(days / 30.4)
  return m >= 12 ? `${Math.floor(m / 12)}y ${m % 12}m ago` : `${m} months ago`
}
