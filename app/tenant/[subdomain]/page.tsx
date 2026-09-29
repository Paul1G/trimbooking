import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from './TenantNav'

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

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('price')

  return (
    <main style={{ maxWidth: 600, margin: '0 auto' }}>
      <TenantNav brandColor={tenant.brand_color} />
      <div style={{ padding: '0 3rem 3rem' }}>
      <h1 style={{ color: tenant.brand_color, fontSize: '2.5rem' }}>
        {tenant.name}
      </h1>

      <h2 style={{ marginTop: '2rem' }}>Book an appointment</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {services?.map((service) => (
          <Link
            key={service.id}
            href={`/book?service=${service.id}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>{service.name}</strong>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                {service.duration_minutes} min
              </div>
            </div>
            <div>£{service.price}</div>
          </Link>
        ))}
      </div>
      </div>
    </main>
  )
}
