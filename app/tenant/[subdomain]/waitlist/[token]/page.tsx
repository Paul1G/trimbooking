import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TenantNav from '../../TenantNav'
import { tenantBrandStyle, googleFontHref } from '@/lib/branding'
import WaitlistOfferClient from './WaitlistOfferClient'
import '../../tenant.css'

export const dynamic = 'force-dynamic'

export default async function WaitlistOfferPage({
  params,
}: {
  params: Promise<{ subdomain: string; token: string }>
}) {
  const { subdomain, token } = await params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  // Looked up via a security-definer function, not a direct table select —
  // the token itself is what authorizes access, same pattern as the
  // manage-booking page's manage_get_booking.
  const { data: offerRows } = await supabase.rpc('waitlist_get_offer', { p_token: token })
  const offer = offerRows?.[0]

  if (!offer) notFound()

  const fontHref = googleFontHref(tenant.font_family)

  return (
    <div className="tenant-app" style={tenantBrandStyle(tenant) as any}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <TenantNav name={tenant.name} logoUrl={tenant.logo_url} />
      <div className="tenant-container" style={{ maxWidth: 560 }}>
        <div className="tenant-hero" style={{ textAlign: 'left' }}>
          <h1>Your waitlist offer</h1>
        </div>

        <WaitlistOfferClient offer={offer} token={token} subdomain={subdomain} />
      </div>
    </div>
  )
}
