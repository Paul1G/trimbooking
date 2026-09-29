import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import BookingForm from './BookingForm'
import TenantNav from '../TenantNav'
import '../tenant.css'

export const dynamic = 'force-dynamic'

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>
  searchParams: Promise<{ service?: string }>
}) {
  const { subdomain } = await params
  const { service: serviceId } = await searchParams

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (!service) notFound()

  const { data: staffLinks } = await supabase
    .from('staff_services')
    .select('staff_id')
    .eq('service_id', service.id)

  const staffIds = (staffLinks || []).map((l) => l.staff_id)

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .in('id', staffIds)

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: tenant.brand_color }}>
      <TenantNav name={tenant.name} />
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>{service.name}</h1>
          <p>£{service.price} · {service.duration_minutes} min</p>
        </div>

        <BookingForm tenantId={tenant.id} service={service} staffList={staff || []} shopOpeningHours={tenant.opening_hours || {}} />
      </div>
    </div>
  )
}
