import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TenantPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  return (
    <main style={{ padding: '3rem', textAlign: 'center' }}>
      <h1 style={{ color: tenant.brand_color, fontSize: '2.5rem' }}>
        {tenant.name}
      </h1>
      <p>Booking coming soon.</p>
    </main>
  )
}
