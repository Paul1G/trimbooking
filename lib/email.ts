import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type BookingEmailType =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'rescheduled'
  | 'reminder_week'
  | 'reminder_day'
  | 'thank_you'

export type BookingEmailParams = {
  type: BookingEmailType
  tenantName: string
  customerEmail: string
  customerName: string
  serviceName?: string
  staffName?: string
  startTime: string
  // Link to the customer's self-service "manage your booking" page, included
  // where relevant so they can reschedule or cancel without contacting the shop.
  manageUrl?: string
}

function manageLineHtml(manageUrl?: string) {
  if (!manageUrl) return ''
  return `<p style="margin-top:1.25rem"><a href="${manageUrl}">Manage or reschedule this booking</a></p>`
}

// From address: uses the shop's subdomain so it's clearly tied to that shop,
// but sent from your verified root domain.
function fromAddress(tenantName: string) {
  return `${tenantName} <bookings@trimbooking.co.uk>`
}

export function buildBookingEmail({
  type,
  tenantName,
  customerName,
  serviceName,
  staffName,
  startTime,
  manageUrl,
}: BookingEmailParams): { subject: string; html: string } | null {
  const dateStr = new Date(startTime).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (type === 'requested') {
    return {
      subject: `Booking request received — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Thanks for your booking request with <strong>${tenantName}</strong>.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>We'll email you as soon as the shop confirms your appointment.</p>
        ${manageLineHtml(manageUrl)}
      `,
    }
  }

  if (type === 'confirmed') {
    return {
      subject: `Your appointment is confirmed — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Good news — your appointment with <strong>${tenantName}</strong> is confirmed.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>See you then!</p>
        ${manageLineHtml(manageUrl)}
      `,
    }
  }

  if (type === 'rescheduled') {
    return {
      subject: `Your booking has been moved — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Your booking with <strong>${tenantName}</strong> has been moved to a new time:</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>The shop will confirm this new time shortly.</p>
        ${manageLineHtml(manageUrl)}
      `,
    }
  }

  if (type === 'declined') {
    return {
      subject: `Update on your booking request — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Unfortunately <strong>${tenantName}</strong> isn't able to confirm this appointment:</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>Please get in touch with the shop directly, or make a new booking for a different time.</p>
      `,
    }
  }

  if (type === 'cancelled') {
    return {
      subject: `Your appointment has been cancelled — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Your appointment with <strong>${tenantName}</strong> has been cancelled:</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>Please get in touch with the shop if you have any questions.</p>
      `,
    }
  }

  if (type === 'reminder_week') {
    return {
      subject: `Reminder: your appointment is next week — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Just a heads up that your appointment with <strong>${tenantName}</strong> is coming up next week.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>Need to change anything?</p>
        ${manageLineHtml(manageUrl)}
      `,
    }
  }

  if (type === 'reminder_day') {
    return {
      subject: `Reminder: your appointment is tomorrow — ${tenantName}`,
      html: `
        <p>Hi ${customerName},</p>
        <p>This is a reminder that your appointment with <strong>${tenantName}</strong> is tomorrow.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>See you then!</p>
        ${manageLineHtml(manageUrl)}
      `,
    }
  }

  if (type === 'thank_you') {
    return {
      subject: `Thanks for visiting ${tenantName}!`,
      html: `
        <p>Hi ${customerName},</p>
        <p>Thank you for your visit to <strong>${tenantName}</strong> — we hope you're happy with your ${serviceName || 'appointment'}.</p>
        <p>We'd love to see you again soon.</p>
      `,
    }
  }

  return null
}

export async function sendWelcomeEmail({
  ownerEmail,
  shopName,
  subdomain,
}: {
  ownerEmail: string
  shopName: string
  subdomain: string
}) {
  if (!ownerEmail) return { error: 'Missing owner email' }

  const loginUrl = `https://${subdomain}.trimbooking.co.uk/login`

  const { data, error } = await resend.emails.send({
    from: 'TrimBooking <hello@trimbooking.co.uk>',
    to: ownerEmail,
    subject: `Welcome to TrimBooking, ${shopName}!`,
    html: `
      <p>Hi there,</p>
      <p>Your shop <strong>${shopName}</strong> is ready to go on TrimBooking.</p>
      <p>Your booking page: <a href="https://${subdomain}.trimbooking.co.uk">${subdomain}.trimbooking.co.uk</a></p>
      <p>Log in to your dashboard to add your services, staff and opening hours before sharing your link with customers:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>Welcome aboard!</p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

export async function sendTrialEndedEmail({
  ownerEmail,
  shopName,
  subdomain,
}: {
  ownerEmail: string
  shopName: string
  subdomain: string
}) {
  if (!ownerEmail) return { error: 'Missing owner email' }

  const { data, error } = await resend.emails.send({
    from: 'TrimBooking <hello@trimbooking.co.uk>',
    to: ownerEmail,
    subject: `Your TrimBooking trial has ended — ${shopName}`,
    html: `
      <p>Hi there,</p>
      <p>Your 30-day free trial of TrimBooking for <strong>${shopName}</strong> has come to an end, so
      <strong>${subdomain}.trimbooking.co.uk</strong> has been temporarily switched off — customers won't
      be able to book, and staff and owner logins are paused.</p>
      <p>To pick up where you left off, just reply to this email or get in touch at
      <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a> and we'll get you sorted.</p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

function formatDateLong(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function sendInvoiceEmail({
  ownerEmail,
  shopName,
  subdomain,
  periodStart,
  periodEnd,
  staffCount,
  amountPence,
  isProration,
  payLink,
  trialEndsAt,
}: {
  ownerEmail: string
  shopName: string
  subdomain: string
  periodStart: string
  periodEnd: string
  staffCount: number
  amountPence: number
  isProration: boolean
  // A Stripe-hosted invoice payment page, when platform billing is
  // configured (lib/stripeBilling.ts) — lets the owner pay by card right
  // from this email instead of "payment instructions will follow separately".
  payLink?: string | null
  // Set only for the one-off invoice raised ~7 days before a free trial
  // ends (see app/api/cron/send-trial-invoices) — swaps in copy explaining
  // this is what keeps the shop running past the trial, rather than the
  // "first, part-month bill sent at signup" framing isProration alone implies.
  trialEndsAt?: string | null
}) {
  if (!ownerEmail) return { error: 'Missing owner email' }

  const amount = `£${(amountPence / 100).toFixed(2)}`
  const periodLine = `${formatDateLong(periodStart)} – ${formatDateLong(periodEnd)}`
  const staffLine =
    staffCount > 4
      ? `${staffCount} staff members (includes 4, plus ${staffCount - 4} extra at £2.50/month each)`
      : `${staffCount} staff member${staffCount === 1 ? '' : 's'} (included in the base fee)`

  const subject = trialEndsAt
    ? `Your free trial ends soon — ${shopName}'s first TrimBooking invoice`
    : isProration
    ? `Your TrimBooking invoice — ${shopName} (first, part-month bill)`
    : `Your TrimBooking invoice for ${new Date(periodStart).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} — ${shopName}`

  const { data, error } = await resend.emails.send({
    from: 'TrimBooking <hello@trimbooking.co.uk>',
    to: ownerEmail,
    subject,
    html: `
      <p>Hi there,</p>
      ${
        trialEndsAt
          ? `<p>Your 30-day free trial for <strong>${shopName}</strong> (${subdomain}.trimbooking.co.uk) ends on <strong>${formatDateLong(trialEndsAt)}</strong>. Here's your first invoice, covering from then to the end of the month, so your shop keeps running without a gap:</p>`
          : `<p>Here's your ${isProration ? 'first' : 'latest'} invoice for <strong>${shopName}</strong> (${subdomain}.trimbooking.co.uk):</p>`
      }
      <table cellpadding="0" cellspacing="0" style="margin: 1rem 0; font-size: 0.95rem;">
        <tr><td style="padding: 2px 12px 2px 0; color: #555;">Billing period</td><td><strong>${periodLine}</strong></td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #555;">Staff</td><td>${staffLine}</td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #555;">Amount due</td><td><strong>${amount}</strong></td></tr>
      </table>
      ${
        trialEndsAt
          ? `<p>Paying this before your trial ends keeps ${shopName} live with no interruption. From next month you'll be invoiced on the 1st, in advance, for the full month ahead.</p>`
          : isProration
          ? `<p>This covers the rest of this month from your sign-up date. From next month you'll be invoiced on the 1st, in advance, for the full month ahead.</p>`
          : `<p>This covers the month ahead, based on your current number of staff.</p>`
      }
      ${
        payLink
          ? `<p style="margin: 1.5rem 0;"><a href="${payLink}" style="background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Pay this invoice</a></p>
             <p style="font-size:0.9rem;color:#555;">Paid securely by card via Stripe — we never see or store your card details.</p>`
          : `<p>Payment instructions will follow separately — no need to do anything yet.</p>`
      }
      <p>If you have any questions in the meantime, just reply to this email or reach us at
      <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>.</p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

// Sent once a day during the 5-day grace period after a recurring invoice's
// due date has passed and gone unpaid (see app/api/cron/billing-dunning).
export async function sendPaymentReminderEmail({
  ownerEmail,
  shopName,
  subdomain,
  amountPence,
  payLink,
  daysOverdue,
  graceDaysLeft,
}: {
  ownerEmail: string
  shopName: string
  subdomain: string
  amountPence: number
  payLink?: string | null
  daysOverdue: number
  graceDaysLeft: number
}) {
  if (!ownerEmail) return { error: 'Missing owner email' }

  const amount = `£${(amountPence / 100).toFixed(2)}`

  const { data, error } = await resend.emails.send({
    from: 'TrimBooking <hello@trimbooking.co.uk>',
    to: ownerEmail,
    subject: `Payment overdue — ${shopName}'s TrimBooking invoice (${graceDaysLeft} day${graceDaysLeft === 1 ? '' : 's'} left)`,
    html: `
      <p>Hi there,</p>
      <p>Your TrimBooking invoice for <strong>${shopName}</strong> (${subdomain}.trimbooking.co.uk) of <strong>${amount}</strong>
      is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.</p>
      <p>You have <strong>${graceDaysLeft} day${graceDaysLeft === 1 ? '' : 's'}</strong> left to pay before
      ${subdomain}.trimbooking.co.uk is automatically switched off.</p>
      ${
        payLink
          ? `<p style="margin: 1.5rem 0;"><a href="${payLink}" style="background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Pay this invoice</a></p>
             <p style="font-size:0.9rem;color:#555;">Paid securely by card via Stripe — we never see or store your card details.</p>`
          : `<p>Get in touch at <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a> to settle this invoice.</p>`
      }
      <p>Questions? Just reply to this email or reach us at <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a>.</p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

// Sent once, the moment the grace period runs out and the shop is switched
// off for non-payment (distinct from sendTrialEndedEmail, which covers the
// free trial simply running out with no invoice involved).
export async function sendPaymentGraceExpiredEmail({
  ownerEmail,
  shopName,
  subdomain,
  amountPence,
  payLink,
}: {
  ownerEmail: string
  shopName: string
  subdomain: string
  amountPence: number
  payLink?: string | null
}) {
  if (!ownerEmail) return { error: 'Missing owner email' }

  const amount = `£${(amountPence / 100).toFixed(2)}`

  const { data, error } = await resend.emails.send({
    from: 'TrimBooking <hello@trimbooking.co.uk>',
    to: ownerEmail,
    subject: `Switched off for non-payment — ${shopName}`,
    html: `
      <p>Hi there,</p>
      <p>Your outstanding invoice of <strong>${amount}</strong> for <strong>${shopName}</strong> went unpaid past its grace
      period, so <strong>${subdomain}.trimbooking.co.uk</strong> has been switched off — customers won't be able to book,
      and staff and owner logins are paused.</p>
      ${
        payLink
          ? `<p style="margin: 1.5rem 0;"><a href="${payLink}" style="background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Pay this invoice to reactivate</a></p>
             <p style="font-size:0.9rem;color:#555;">Your shop switches back on automatically as soon as this is paid.</p>`
          : `<p>Get in touch at <a href="mailto:pagraham144@gmail.com">pagraham144@gmail.com</a> to settle this invoice and get your shop back on.</p>`
      }
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

export async function sendStaffPortalEmail({
  type,
  tenantName,
  staffName,
  staffEmail,
  actionLink,
}: {
  type: 'invite' | 'reset'
  tenantName: string
  staffName: string
  staffEmail: string
  actionLink: string
}) {
  if (!staffEmail) return { error: 'Missing staff email' }

  const subject =
    type === 'invite'
      ? `You're invited to your ${tenantName} staff portal`
      : `Access your ${tenantName} staff portal`

  const html = `
    <p>Hi ${staffName},</p>
    ${
      type === 'invite'
        ? `<p><strong>${tenantName}</strong> has set you up with access to your own staff portal, where you can see your bookings and earnings.</p>`
        : `<p>Here's a link to access your <strong>${tenantName}</strong> staff portal.</p>`
    }
    <p><a href="${actionLink}">${type === 'invite' ? 'Set up your account' : 'Access your portal'}</a></p>
  `

  const { data, error } = await resend.emails.send({
    from: fromAddress(tenantName),
    to: staffEmail,
    subject,
    html,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

export async function sendRebookNudgeEmail({
  tenantName,
  subdomain,
  customerEmail,
  customerName,
  lastVisitLabel,
  intervalLabel,
}: {
  tenantName: string
  subdomain: string
  customerEmail: string
  customerName: string
  lastVisitLabel: string
  intervalLabel: string
}) {
  if (!customerEmail) return { error: 'Missing customer email' }

  const bookUrl = `https://${subdomain}.trimbooking.co.uk`

  const { data, error } = await resend.emails.send({
    from: fromAddress(tenantName),
    to: customerEmail,
    subject: `Time for a rebook? — ${tenantName}`,
    html: `
      <p>Hi ${customerName},</p>
      <p>It's been a little while since your last visit to <strong>${tenantName}</strong> (${lastVisitLabel}).
      Based on how often you usually come in (about every ${intervalLabel}), you might be about due!</p>
      <p><a href="${bookUrl}">Book your next appointment</a></p>
      <p>See you soon!</p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

export async function sendBookingEmail(params: BookingEmailParams) {
  if (!params.customerEmail) {
    return { error: 'Missing customer email' }
  }

  const email = buildBookingEmail(params)
  if (!email) {
    return { error: 'Unknown email type' }
  }

  const { data, error } = await resend.emails.send({
    from: fromAddress(params.tenantName),
    to: params.customerEmail,
    subject: email.subject,
    html: email.html,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}

// Sent when match_waitlist_for_cancellation (supabase/migrations/20261003_waitlist.sql)
// finds a waiting customer whose service fits a slot that's just been freed
// by a cancellation. The link goes to a page with Accept/Decline buttons
// (app/tenant/[subdomain]/waitlist/[token]/page.tsx) rather than acting
// directly on click, so an email client's link-prescanning can't accidentally
// accept or decline the offer on the customer's behalf.
export async function sendWaitlistOfferEmail({
  tenantName,
  subdomain,
  customerEmail,
  customerName,
  serviceName,
  staffName,
  offeredStart,
  offerToken,
}: {
  tenantName: string
  subdomain: string
  customerEmail: string
  customerName: string
  serviceName?: string
  staffName?: string
  offeredStart: string
  offerToken: string
}) {
  if (!customerEmail) {
    return { error: 'Missing customer email' }
  }

  const dateStr = new Date(offeredStart).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const offerUrl = `https://${subdomain}.trimbooking.co.uk/waitlist/${offerToken}`

  const { data, error } = await resend.emails.send({
    from: fromAddress(tenantName),
    to: customerEmail,
    subject: `A slot just opened up — ${tenantName}`,
    html: `
      <p>Hi ${customerName},</p>
      <p>Good news — a spot has opened up with <strong>${tenantName}</strong> that matches what
      you're waiting for:</p>
      <p><strong>${serviceName || 'Your service'}</strong>${staffName ? ` with ${staffName}` : ''}<br/>${dateStr}</p>
      <p>This spot is held for you for the next <strong>24 hours</strong>. After that, or if you
      decline, it'll be offered to the next person waiting.</p>
      <p style="margin-top:1.25rem"><a href="${offerUrl}">Accept or decline this slot</a></p>
    `,
  })

  if (error) {
    return { error: error.message }
  }

  return { id: data?.id }
}
