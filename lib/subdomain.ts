// Shared rules for shop subdomains (yourshop.trimbooking.co.uk), used by both
// the signup form's live availability check and the signup API itself.

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'mail', 'email', 'ftp',
  'ns1', 'ns2', 'autodiscover', 'cpanel', 'webmail', 'blog', 'support',
  'help', 'status', 'staging', 'dev', 'test', 'demo', 'trimbooking',
  'shop', 'manage', 'login', 'signup', 'static', 'assets', 'cdn', 'docs',
])

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/

export function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain) return 'Please choose a web address for your shop.'
  if (subdomain.length < 3) return 'Must be at least 3 characters.'
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return 'Use only lowercase letters, numbers and hyphens — no spaces or symbols.'
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) return 'That address is reserved — please choose another.'
  return null
}
