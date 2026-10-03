import { NextRequest, NextResponse } from 'next/server'
import { sendWaitlistOfferEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantName, subdomain, customerEmail, customerName, serviceName, staffName, offeredStart, offerToken } = body

    if (!customerEmail || !offerToken || !offeredStart) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sendWaitlistOfferEmail({
      tenantName,
      subdomain,
      customerEmail,
      customerName,
      serviceName,
      staffName,
      offeredStart,
      offerToken,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
