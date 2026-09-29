import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantNav from '../TenantNav'

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
    <main style={{ maxWidth: 700, margin: '0 auto' }}>
      <TenantNav brandColor={tenant.brand_color} />
      <div style={{ padding: '0 3rem 3rem' }}>
        <h1 style={{ color: tenant.brand_color }}>Meet the Team</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {staff?.map((member) => (
            <Link
              key={member.id}
              href={`/team/${member.id}`}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '1rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: tenant.brand_color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  {member.name[0]}
                </div>
              )}
              <div>
                <strong>{member.name}</strong>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>{member.role}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
