import { NextRequest, NextResponse } from 'next/server'
import { sendBookingEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, tenantName, customerEmail, customerName, serviceName, staffName, startTime, manageUrl } = body

    if (!customerEmail || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sendBookingEmail({
      type,
      tenantName,
      customerEmail,
      customerName,
      serviceName,
      staffName,
      startTime,
      manageUrl,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Unknown email type' ? 400 : 500 })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
