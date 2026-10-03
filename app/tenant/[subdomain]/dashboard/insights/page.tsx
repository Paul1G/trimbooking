'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { resolveShopRole, type ShopRole } from '@/lib/shopAccess'
import { loadShopInsights } from '@/lib/insightsData'
import type { CapacityInputs, InsightBooking } from '@/lib/insights'
import InsightsView from '../../InsightsView'
import '../../tenant.css'

export default function InsightsPage() {
  const router = useRouter()
  const params = useParams()
  const [brandColor, setBrandColor] = useState('#000000')
  const [role, setRole] = useState<ShopRole | null>(null)
  const [data, setData] = useState<{ bookings: InsightBooking[]; capacity: CapacityInputs } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        router.push('/login')
        return
      }

      const { data: tenant } = await supabase.from('tenants').select('*').eq('subdomain', params.subdomain).single()
      const shopRole = tenant ? await resolveShopRole(supabase, tenant, user.id) : null
      if (!tenant || !shopRole || tenant.disabled) {
        router.push('/login')
        return
      }

      setBrandColor(tenant.brand_color)
      setRole(shopRole)
      try {
        setData(await loadShopInsights(tenant))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load bookings')
      }
    }
    load()
  }, [params.subdomain, router])

  return (
    <div className="tenant-app" style={{ ['--brand' as string]: brandColor }}>
      <div className="tenant-container">
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Insights</h1>
          <p>
            How the shop is doing, who your best clients are, who you haven&apos;t seen for a while, and when you&apos;re busy or quiet.
          </p>
        </div>

        {error && <p className="error-text">{error}</p>}
        {!error && !data && <p>Loading…</p>}
        {data && role && (
          <InsightsView
            bookings={data.bookings}
            capacity={data.capacity}
            // Takings are owner-only, the same way billing is.
            showMoney={role === 'owner'}
            showContacts
            showStaffTable={data.capacity.staff.length > 1}
            customersHref="/dashboard/customers"
          />
        )}
      </div>
    </div>
  )
}
