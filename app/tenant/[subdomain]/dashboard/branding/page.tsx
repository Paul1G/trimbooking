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
  const [uploading, setUploading] = useState(false)
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Please choose an image smaller than 2MB.')
      return
    }

    setUploading(true)
    setError('')
    setSaved(false)

    const ext = file.name.split('.').pop()
    const path = `${tenantId}/logo-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setUploading(false)
      setError('Upload failed: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)
    const publicUrl = publicUrlData.publicUrl

    setLogoUrl(publicUrl)

    // Save immediately so the upload isn't lost if they navigate away before clicking Save
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ logo_url: publicUrl })
      .eq('id', tenantId)

    setUploading(false)

    if (updateError) {
      setError('Uploaded, but failed to save: ' + updateError.message)
      return
    }
    setSaved(true)

    // Reset the file input so choosing the same file again still fires onChange
    e.target.value = ''
  }

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
            <label className="field-label">Logo</label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: 10, background: '#fafafa',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={tenantName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No logo</span>
                )}
              </div>

              <div>
                <label
                  htmlFor="logo-upload"
                  style={{
                    display: 'inline-block', padding: '0.6rem 1.1rem', borderRadius: 8,
                    border: '1px solid var(--border)', background: '#fff', cursor: uploading ? 'default' : 'pointer',
                    fontSize: '0.88rem', fontWeight: 600, opacity: uploading ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  PNG or JPG, up to 2MB
                </div>
              </div>
            </div>
          </div>

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
