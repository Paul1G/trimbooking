import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from './TenantNav'
import './tenant.css'

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
    <div className="tenant-app" style={{ ['--brand' as any]: tenant.brand_color }}>
      <TenantNav name={tenant.name} />
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>{tenant.name}</h1>
          <p>Choose a service to book your appointment</p>
        </div>

        <div className="card-list">
          {services?.map((service) => (
            <Link key={service.id} href={`/book?service=${service.id}`} className="card">
              <div>
                <div className="card-title">{service.name}</div>
                <div className="card-sub">{service.duration_minutes} min</div>
              </div>
              <div className="card-price">£{service.price}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
