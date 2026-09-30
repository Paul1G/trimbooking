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
