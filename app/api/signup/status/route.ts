import { NextRequest, NextResponse } from 'next/server'

// Polled by the signup success screen: a newly-registered Vercel domain can
// take up to a minute to finish issuing its SSL certificate, so we check
// server-side (no browser CORS issues) whether the shop's own login page is
// actually serving yet before sending the owner there.
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get('subdomain')
  if (!subdomain) {
    return NextResponse.json({ ready: false }, { status: 400 })
  }

  try {
    const res = await fetch(`https://${subdomain}.trimbooking.co.uk/login`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ ready: res.ok })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
