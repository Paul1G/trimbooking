// Registers a new shop's subdomain with the Vercel project via the REST API,
// so a signup is served immediately without anyone touching Vercel or
// Cloudflare by hand. This relies on Cloudflare's existing wildcard CNAME
// (*.trimbooking.co.uk -> cname.vercel-dns.com) already pointing at Vercel's
// edge — adding the exact hostname to the project is what makes Vercel
// actually route it there and issue it a certificate, mirroring how the
// project's first two shops were added manually as individual domains.

const VERCEL_API = 'https://api.vercel.com'

export async function addDomainToVercelProject(hostname: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    return { ok: false, error: 'Vercel API is not configured (missing VERCEL_TOKEN or VERCEL_PROJECT_ID).' }
  }

  const teamId = process.env.VERCEL_TEAM_ID
  const url = `${VERCEL_API}/v10/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: hostname }),
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not reach the Vercel API.' }
  }

  if (res.ok) return { ok: true }

  const body: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null)

  // The domain is already registered on this project — not an error for our purposes.
  if (res.status === 409 || body?.error?.code === 'domain_already_in_use') {
    return { ok: true }
  }

  return { ok: false, error: body?.error?.message || `Vercel API error (${res.status})` }
}
