import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from '../TenantNav'
import '../tenant.css'

export const dynamic = 'force-dynamic'

export default async function TeamPage({
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

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_id', tenant.id)

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: tenant.brand_color }}>
      <TenantNav name={tenant.name} logoUrl={tenant.logo_url} />
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>Meet the Team</h1>
        </div>

        <div className="card-list">
          {staff?.map((member) => (
            <Link key={member.id} href={`/team/${member.id}`} className="card">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name} className="avatar" />
              ) : (
                <div className="avatar-fallback">{member.name[0]}</div>
              )}
              <div style={{ flex: 1 }}>
                <div className="card-title">{member.name}</div>
                <div className="card-sub">{member.role}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
