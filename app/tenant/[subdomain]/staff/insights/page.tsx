'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { loadMyInsights } from '@/lib/insightsData'
import type { CapacityInputs, InsightBooking } from '@/lib/insights'
import InsightsView from '../../InsightsView'
import '../../tenant.css'

// A staff member's own insights: their takings, utilisation, best week, top
// clients and lapsed clients — built only from their own bookings via the
// same staff_get_my_bookings function as the rest of their portal.
export default function MyInsightsPage() {
  const router = useRouter()
  const params = useParams()
  const [brandColor, setBrandColor] = useState('#000000')
  const [name, setName] = useState('')
  const [data, setData] = useState<{ bookings: InsightBooking[]; capacity: CapacityInputs } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        router.push('/login')
        return
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, brand_color, disabled, opening_hours')
        .eq('subdomain', params.subdomain)
        .single()

      if (!tenant || tenant.disabled) {
        router.push('/login')
        return
      }

      const { data: me, error: meError } = await supabase.rpc('staff_get_my_data', { p_tenant_id: tenant.id })
      if (meError || !me) {
        router.push('/login')
        return
      }

      setBrandColor(tenant.brand_color)
      setName(me.name)
      try {
        setData(await loadMyInsights(tenant, me.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load your bookings')
      }
    }
    load()
  }, [params.subdomain, router])

  return (
    <div className="tenant-app" style={{ ['--brand' as string]: brandColor }}>
      <div className="tenant-container">
        <Link href="/staff" className="back-link">← Back to my bookings</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>{name ? `${name}'s insights` : 'My insights'}</h1>
          <p>Your own takings, how full your diary is, your best weeks and your regulars. Only you can see this.</p>
        </div>

        {error && <p className="error-text">{error}</p>}
        {!error && !data && <p>Loading…</p>}
        {data && (
          <InsightsView
            bookings={data.bookings}
            capacity={data.capacity}
            showMoney
            showContacts={false}
            showStaffTable={false}
          />
        )}
      </div>
    </div>
  )
}
