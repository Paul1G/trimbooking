import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from '../../TenantNav'
import '../../tenant.css'

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
    <div className="tenant-app" style={{ ['--brand' as any]: tenant.brand_color }}>
      <TenantNav name={tenant.name} logoUrl={tenant.logo_url} />
      <div className="tenant-container">
        <Link href="/team" className="back-link">← Back to team</Link>

        <div className="profile-header">
          {staffMember.photo_url ? (
            <img src={staffMember.photo_url} alt={staffMember.name} className="avatar-lg" />
          ) : (
            <div className="avatar-lg-fallback">{staffMember.name[0]}</div>
          )}
          <div>
            <h1>{staffMember.name}</h1>
            <p>{staffMember.role}</p>
          </div>
        </div>

        {staffMember.bio && <p className="bio">{staffMember.bio}</p>}

        <h2 className="section-title">Services</h2>
        <div className="card-list">
          {services?.map((service) => (
            <Link
              key={service.id}
              href={`/book?service=${service.id}&staff=${staffId}`}
              className="card"
            >
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
