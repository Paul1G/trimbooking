'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolveShopRole } from '@/lib/shopAccess'
import Link from 'next/link'
import WeeklyHoursEditor, { WorkingHours } from '../WeeklyHoursEditor'
import '../../tenant.css'

export default function HoursPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState('#000000')
  const [hours, setHours] = useState<WorkingHours>({})
  const [checking, setChecking] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', params.subdomain)
        .single()

      const role = tenant ? await resolveShopRole(supabase, tenant, user.id) : null
      if (!tenant || !role) {
        router.push('/login')
        return
      }

      setTenantId(tenant.id)
      setBrandColor(tenant.brand_color)
      setHours(tenant.opening_hours || {})
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function save() {
    if (!tenantId) return
    setError('')
    setSaved(false)

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ opening_hours: hours })
      .eq('id', tenantId)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
    <div className="tenant-app" style={{ ['--brand' as any]: brandColor }}>
      <div className="tenant-container" style={{ maxWidth: 500 }}>
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Opening Hours</h1>
          <p>Set the days and hours your shop is open.</p>
        </div>

        <WeeklyHoursEditor value={hours} onChange={setHours} />

        {error && <p className="error-text">{error}</p>}
        {saved && <p style={{ color: '#166534', fontSize: '0.9rem' }}>Saved.</p>}

        <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={save}>
          Save opening hours
        </button>
      </div>
    </div>
  )
}
