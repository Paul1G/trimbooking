import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from '../../TenantNav'

export const dynamic = 'force-dynamic'

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ subdomain: string; staffId: string }>
}) {
  const { subdomain, staffId } = await params

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (!tenant) notFound()

  const { data: staffMember } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()

  if (!staffMember) notFound()

  const { data: serviceLinks } = await supabase
    .from('staff_services')
    .select('service_id')
    .eq('staff_id', staffId)

  const serviceIds = (serviceLinks || []).map((l) => l.service_id)

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds)

  return (
    <main style={{ maxWidth: 600, margin: '0 auto' }}>
      <TenantNav brandColor={tenant.brand_color} />
      <div style={{ padding: '0 3rem 3rem' }}>
        <Link href="/team" style={{ color: '#666', fontSize: '0.9rem' }}>
          ← Back to team
        </Link>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginTop: '1rem' }}>
          {staffMember.photo_url ? (
            <img
              src={staffMember.photo_url}
              alt={staffMember.name}
              style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: tenant.brand_color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '2rem',
              }}
            >
              {staffMember.name[0]}
            </div>
          )}
          <div>
            <h1 style={{ margin: 0, color: tenant.brand_color }}>{staffMember.name}</h1>
            <p style={{ margin: 0, color: '#666' }}>{staffMember.role}</p>
          </div>
        </div>

        {staffMember.bio && <p style={{ marginTop: '1.5rem' }}>{staffMember.bio}</p>}

        <h2 style={{ marginTop: '2rem' }}>Services</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {services?.map((service) => (
            <Link
              key={service.id}
              href={`/book?service=${service.id}&staff=${staffId}`}
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
