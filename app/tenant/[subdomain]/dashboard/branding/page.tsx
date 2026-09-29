'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../tenant.css'

export default function BrandingPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState('')
  const [brandColor, setBrandColor] = useState('#000000')
  const [logoUrl, setLogoUrl] = useState('')
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
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

      if (!tenant || tenant.owner_id !== user.id) {
        router.push('/login')
        return
      }

      setTenantId(tenant.id)
      setTenantName(tenant.name)
      setBrandColor(tenant.brand_color || '#000000')
      setLogoUrl(tenant.logo_url || '')
      setChecking(false)
    }
    load()
  }, [params.subdomain, router])

  async function handleSave() {
    if (!tenantId) return
    setSaving(true)
    setSaved(false)
    setError('')

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        brand_color: brandColor,
        logo_url: logoUrl || null,
      })
      .eq('id', tenantId)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setSaved(true)
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
      <div className="tenant-container" style={{ maxWidth: 480 }}>
        <Link href="/dashboard" className="back-link">← Back to dashboard</Link>

        <div className="tenant-hero" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h1>Branding</h1>
          <p>Your logo and brand color appear on your booking page and in customer emails.</p>
        </div>

        <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem' }}>
          <div className="field-group">
            <label className="field-label">Logo URL (optional)</label>
            <input
              className="field-input"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Paste the public URL from Supabase Storage"
            />
          </div>

          {logoUrl && (
            <div style={{ margin: '0 0 1.2rem' }}>
              <div className="field-label" style={{ marginBottom: '0.6rem' }}>Preview</div>
              <div style={{ padding: '1rem', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 10 }}>
                <img src={logoUrl} alt={tenantName} className="brand-logo" style={{ height: 40 }} />
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Brand color</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={{ width: 48, height: 40, padding: 0, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              />
              <input
                className="field-input"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={{ maxWidth: 140 }}
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          {saved && <p style={{ color: '#166534', fontSize: '0.9rem', margin: '0.5rem 0' }}>Saved.</p>}

          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: '0.5rem' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
