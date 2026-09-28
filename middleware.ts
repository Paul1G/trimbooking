import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = 'trimbooking.co.uk'

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0]

  let subdomain = ''
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1))
  } else if (host.endsWith('.localhost')) {
    subdomain = host.slice(0, -'.localhost'.length)
  }

  if (!subdomain || subdomain === 'www') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = `/tenant/${subdomain}${req.nextUrl.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
