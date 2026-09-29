'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../tenant.css'

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const [tenant, setTenant] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        router.push('/login')
        return
      }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', params.subdomain)
        .single()

      if (!tenantData || tenantData.owner_id !== user.id) {
        router.push('/login')
        return
      }

      setTenant(tenantData)
      setChecking(false)
    }
    checkAccess()
  }, [params.subdomain, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-app" style={{ ['--brand' as any]: tenant.brand_color }}>
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>{tenant.name} — Dashboard</h1>
        </div>

        <div className="card-list">
          <div className="card" style={{ cursor: 'default' }}>
            <div>
              <div className="card-title">Services</div>
              <div className="card-sub">Manage what you offer (coming next)</div>
            </div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div>
              <div className="card-title">Staff</div>
              <div className="card-sub">Manage your team (coming next)</div>
            </div>
          </div>
          <div className="card" style={{ cursor: 'default' }}>
            <div>
              <div className="card-title">Bookings</div>
              <div className="card-sub">View and manage appointments (coming next)</div>
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ marginTop: '2rem', background: 'transparent', color: '#666', border: '1px solid #ddd' }}
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
