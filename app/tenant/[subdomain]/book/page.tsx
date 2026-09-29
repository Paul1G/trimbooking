import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import BookingForm from './BookingForm'

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
    <main style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ color: tenant.brand_color }}>{tenant.name}</h1>
      <h2>{service.name} — £{service.price} ({service.duration_minutes} min)</h2>

      <BookingForm
        tenantId={tenant.id}
        service={service}
        staffList={staff || []}
      />
    </main>
  )
}
