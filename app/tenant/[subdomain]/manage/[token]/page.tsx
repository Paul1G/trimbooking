import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import TenantNav from '../../TenantNav'
import { tenantBrandStyle, googleFontHref } from '@/lib/branding'
import ManageBookingClient from './ManageBookingClient'
import '../../tenant.css'

export const dynamic = 'force-dynamic'

export default async function ManageBookingPage({
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
  // the token itself is what authorizes access, so the booking table stays
  // off-limits to anonymous queries in general.
  const { data: booking } = await supabase
    .rpc('manage_get_booking', { p_token: token, p_tenant_id: tenant.id })

  if (!booking) notFound()

  const fontHref = googleFontHref(tenant.font_family)

  return (
    <div className="tenant-app" style={tenantBrandStyle(tenant) as any}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <TenantNav name={tenant.name} logoUrl={tenant.logo_url} />
      <div className="tenant-container" style={{ maxWidth: 560 }}>
        <div className="tenant-hero" style={{ textAlign: 'left' }}>
          <h1>Manage your booking</h1>
        </div>

        <ManageBookingClient
          tenantId={tenant.id}
          tenantName={tenant.name}
          subdomain={subdomain}
          shopOpeningHours={tenant.opening_hours || {}}
          booking={booking as any}
          manageToken={token}
        />
      </div>
    </div>
  )
}
