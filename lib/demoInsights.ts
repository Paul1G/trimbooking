// Sample data for the public demo dashboard's Insights section — about 14
// months of believable salon bookings, generated around "now" so the demo
// always looks current. A fixed seed means every visitor sees the same shop.
// Nothing here touches the database.

import type { CapacityInputs, InsightBooking, StaffSchedule } from '@/lib/insights'

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const CLIENTS = [
  'Sophie Bennett', 'Priya Sharma', 'Freya Nilsen', 'Jordan Lee', 'Tom Whitfield', 'Amelia Hart', 'Isla Murray',
  'Grace Okoro', 'Chloe Davies', 'Ruby Walsh', 'Ella Fraser', 'Hannah Price', 'Zara Khan', 'Lily Morgan',
  'Ava Robertson', 'Mia Campbell', 'Poppy Reid', 'Evie Stewart', 'Daisy Clarke', 'Emily Ross', 'Lucy Hughes',
  'Holly Patel', 'Megan Doyle', 'Katie Scott', 'Rosie Bell', 'Leah Grant', 'Jess Turner', 'Niamh Kelly',
  'Sarah Mills', 'Olivia Ward',
]
// A handful of good regulars who stopped coming ~4 months ago, so the
// "not seen in 3 months" list has something to show.
const DRIFTED = new Set(['Megan Doyle', 'Katie Scott', 'Rosie Bell', 'Leah Grant', 'Olivia Ward'])

const SERVICES = [
  { name: 'Cut & Blow Dry', price: 45, mins: 60 },
  { name: "Men's Cut", price: 28, mins: 30 },
  { name: 'Full Colour', price: 85, mins: 120 },
  { name: 'Lash Lift', price: 35, mins: 45 },
  { name: 'Balayage', price: 120, mins: 150 },
]

export function buildDemoInsights(now: Date = new Date()): { bookings: InsightBooking[]; capacity: CapacityInputs } {
  const r = seeded(20261003)
  const open: Record<string, [string, string]> = {
    tue: ['09:00', '18:00'],
    wed: ['09:00', '18:00'],
    thu: ['09:00', '20:00'],
    fri: ['09:00', '18:00'],
    sat: ['08:30', '16:00'],
  }
  // A mix of employment statuses, same as a real multi-chair shop — Maya is
  // employed (the owner sees her earnings on Insights), Ade and Callum rent
  // their chairs self-employed (their takings are their own business, left
  // out of the shop's revenue figures).
  const staff: StaffSchedule[] = [
    { id: 'maya', name: 'Maya Chen', working_hours: open, breaks: { tue: [['13:00', '13:30']], fri: [['13:00', '13:30']] } as Record<string, [string, string][]>, employment_status: 'employed' },
    { id: 'ade', name: 'Ade Okafor', working_hours: { wed: open.wed, thu: open.thu, fri: open.fri, sat: open.sat }, breaks: {}, employment_status: 'self_employed' },
    { id: 'callum', name: 'Callum Reed', working_hours: { tue: open.tue, thu: open.thu, fri: open.fri, sat: open.sat }, breaks: {}, employment_status: 'self_employed' },
  ]

  const bookings: InsightBooking[] = []
  let id = 0
  for (let offset = -430; offset <= 14; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const key = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day.getDay()]
    const seasonal = 0.85 + 0.25 * Math.sin((offset + 430) / 45) + (day.getMonth() === 11 ? 0.15 : 0)
    for (const s of staff) {
      const hours = s.working_hours?.[key]
      if (!hours) continue
      const [oh, om] = hours[0].split(':').map(Number)
      const [ch, cm] = hours[1].split(':').map(Number)
      let t = oh * 60 + om
      const close = ch * 60 + cm
      while (t < close) {
        const h = Math.floor(t / 60)
        const busy =
          key === 'sat' ? 0.9 : key === 'fri' ? 0.75 : key === 'thu' && h >= 17 ? 0.85 : key === 'tue' && h < 12 ? 0.2 : 0.5
        const svc = SERVICES[s.id === 'callum' ? (r() < 0.8 ? 1 : 0) : Math.floor(r() * SERVICES.length)]
        if (t + svc.mins > close) break
        if (r() > busy * seasonal) {
          t += 30
          continue
        }
        const who = CLIENTS[Math.floor(Math.pow(r(), 1.7) * CLIENTS.length)]
        if (DRIFTED.has(who) && offset > -115) {
          t += 30
          continue
        }
        const start = new Date(day)
        start.setHours(0, t, 0, 0)
        const future = start.getTime() > now.getTime()
        const roll = r()
        const status = roll < 0.04 ? 'cancelled' : future && roll < 0.3 ? 'pending' : 'confirmed'
        bookings.push({
          id: `demo-${id++}`,
          start,
          end: new Date(start.getTime() + svc.mins * 60000),
          status,
          noShow: !future && status === 'confirmed' && r() < 0.02,
          price: svc.price,
          paid: r() < 0.12 ? svc.price + 5 : null,
          customerKey: who,
          customerName: who,
          customerEmail: `${who.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
          customerPhone: '07700 900' + String(100 + CLIENTS.indexOf(who)),
          staffId: s.id,
          serviceName: svc.name,
        })
        t += svc.mins
      }
    }
  }

  return { bookings, capacity: { staff, shopHours: open, holidays: [] } }
}
