'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../tenant.css'

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams()
  const [tenant, setTenant] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const [serviceCount, setServiceCount] = useState<number | null>(null)
  const [staffCount, setStaffCount] = useState<number | null>(null)
  const [disabled, setDisabled] = useState(false)

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

      if (tenantData.disabled) {
        await supabase.auth.signOut()
        setDisabled(true)
        setChecking(false)
        return
      }

      setTenant(tenantData)
      setChecking(false)

      const [{ count: services }, { count: staff }] = await Promise.all([
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantData.id),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantData.id),
      ])
      setServiceCount(services ?? 0)
      setStaffCount(staff ?? 0)
    }
    checkAccess()
  }, [params.subdomain, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (disabled) {
    return (
      <div className="tenant-app">
        <div className="tenant-container">
          <p>This shop has been disabled. Please contact TrimBooking support.</p>
        </div>
      </div>
    )
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

        {!tenant.paid && tenant.trial_ends_at && daysUntil(tenant.trial_ends_at) <= 7 && (
          <div
            style={{
              background: daysUntil(tenant.trial_ends_at) <= 0 ? '#fee2e2' : '#fef9c3',
              border: `1px solid ${daysUntil(tenant.trial_ends_at) <= 0 ? '#fca5a5' : '#eab308'}`,
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: 0, color: daysUntil(tenant.trial_ends_at) <= 0 ? '#991b1b' : '#854d0e', fontSize: '0.9rem' }}>
              {daysUntil(tenant.trial_ends_at) > 0
                ? `Your free trial ends in ${daysUntil(tenant.trial_ends_at)} day${daysUntil(tenant.trial_ends_at) === 1 ? '' : 's'}. Contact us to keep your booking page active.`
                : 'Your free trial has ended. Contact us to keep your booking page active.'}
            </p>
          </div>
        )}

        {(serviceCount === 0 || staffCount === 0) && (
          <div style={{ background: '#fef9c3', border: '1px solid #eab308', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: '0.4rem' }}>Finish setting up your shop</div>
            <p style={{ margin: '0 0 0.75rem', color: '#854d0e', fontSize: '0.9rem' }}>
              Customers can&apos;t book until you&apos;ve added at least one service and one staff member.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {serviceCount === 0 && (
                <Link href="/dashboard/services" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e', textDecoration: 'underline' }}>
                  Add a service →
                </Link>
              )}
              {staffCount === 0 && (
                <Link href="/dashboard/staff" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#854d0e', textDecoration: 'underline' }}>
                  Add a staff member →
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="settings-grid">
          <Link href="/dashboard/services" className="settings-tile">
            <div className="settings-tile-icon">🧾</div>
            <div className="settings-tile-title">Services</div>
            <div className="settings-tile-sub">Manage what you offer</div>
          </Link>
          <Link href="/dashboard/staff" className="settings-tile">
            <div className="settings-tile-icon">👥</div>
            <div className="settings-tile-title">Staff</div>
            <div className="settings-tile-sub">Manage your team</div>
          </Link>
          <Link href="/dashboard/bookings" className="settings-tile">
            <div className="settings-tile-icon">📅</div>
            <div className="settings-tile-title">Bookings</div>
            <div className="settings-tile-sub">View and manage appointments</div>
          </Link>
          <Link href="/dashboard/customers" className="settings-tile">
            <div className="settings-tile-icon">🙋</div>
            <div className="settings-tile-title">Customers</div>
            <div className="settings-tile-sub">Visit history and who&apos;s due to rebook</div>
          </Link>
          <Link href="/dashboard/hours" className="settings-tile">
            <div className="settings-tile-icon">🕐</div>
            <div className="settings-tile-title">Opening Hours</div>
            <div className="settings-tile-sub">Set your shop&apos;s opening days and times</div>
          </Link>
          <Link href="/dashboard/holidays" className="settings-tile">
            <div className="settings-tile-icon">🏖️</div>
            <div className="settings-tile-title">Holidays &amp; Closures</div>
            <div className="settings-tile-sub">Block out staff holidays or shop-wide closures</div>
          </Link>
          <Link href="/dashboard/branding" className="settings-tile">
            <div className="settings-tile-icon">🎨</div>
            <div className="settings-tile-title">Branding</div>
            <div className="settings-tile-sub">Set your logo and brand color</div>
          </Link>
          <Link href="/dashboard/billing" className="settings-tile">
            <div className="settings-tile-icon">💳</div>
            <div className="settings-tile-title">Billing</div>
            <div className="settings-tile-sub">Invoice or automatic monthly billing</div>
          </Link>
          <Link href="/dashboard/no-show-protection" className="settings-tile">
            <div className="settings-tile-icon">🛡️</div>
            <div className="settings-tile-title">No-show protection</div>
            <div className="settings-tile-sub">Save a card and charge a fee for no-shows</div>
          </Link>
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
