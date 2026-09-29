import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// From address: uses the shop's subdomain so it's clearly tied to that shop,
// but sent from your verified root domain.
function fromAddress(tenantName: string) {
  return `${tenantName} <bookings@trimbooking.co.uk>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, tenantName, customerEmail, customerName, serviceName, staffName, startTime } = body

    if (!customerEmail || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const dateStr = new Date(startTime).toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })

    let subject = ''
    let html = ''

    if (type === 'requested') {
      subject = `Booking request received — ${tenantName}`
      html = `
        <p>Hi ${customerName},</p>
        <p>Thanks for your booking request with <strong>${tenantName}</strong>.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>We'll email you as soon as the shop confirms your appointment.</p>
      `
    } else if (type === 'confirmed') {
      subject = `Your appointment is confirmed — ${tenantName}`
      html = `
        <p>Hi ${customerName},</p>
        <p>Good news — your appointment with <strong>${tenantName}</strong> is confirmed.</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>See you then!</p>
      `
    } else if (type === 'declined') {
      subject = `Update on your booking request — ${tenantName}`
      html = `
        <p>Hi ${customerName},</p>
        <p>Unfortunately <strong>${tenantName}</strong> isn't able to confirm this appointment:</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>Please get in touch with the shop directly, or make a new booking for a different time.</p>
      `
    } else if (type === 'cancelled') {
      subject = `Your appointment has been cancelled — ${tenantName}`
      html = `
        <p>Hi ${customerName},</p>
        <p>Your appointment with <strong>${tenantName}</strong> has been cancelled:</p>
        <p><strong>${serviceName}</strong> with ${staffName}<br/>${dateStr}</p>
        <p>Please get in touch with the shop if you have any questions.</p>
      `
    } else {
      return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: fromAddress(tenantName),
      to: customerEmail,
      subject,
      html,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
