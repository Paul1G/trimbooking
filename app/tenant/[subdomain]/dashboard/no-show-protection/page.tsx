'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import '../../tenant.css'

type NoShowFeeMode = 'flat' | 'percentage' | 'per_service'

export default function NoShowProtectionPage() {
  const router = useRouter()
  const params = useParams()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [enabled, setEnabled] = useState(false)
  const [cardRequired, setCardRequired] = useState(true)
  const [feeMode, setFeeMode] = useState<NoShowFeeMode>('flat')
  const [feeFlat, setFeeFlat] = useState('')
  const [feePercentage, setFeePercentage] = useState('')

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
      setEnabled(!!tenant.no_show_protection_enabled)
      setCardRequired(tenant.no_show_card_required !== false)
      setFeeMode((tenant.no_show_fee_mode as NoShowFeeMode) || 'flat')
      setFeeFlat(tenant.no_show_fee_flat != null ? String(tenant.no_show_fee_flat) : '')
      setFeePercentage(tenant.no_show_fee_percentage != null ? String(tenant.no_show_fee_percentage) : '')
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
        no_show_protection_enabled: enabled,
        no_show_card_required: cardRequired,
        no_show_fee_mode: feeMode,
        no_show_fee_flat: feeFlat === '' ? null : Number(feeFlat),
        no_show_fee_percentage: feePercentage === '' ? null : Number(feePercentage),
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
    <div className="tenant-app">
      <div className="tenant-container">
        <div className="tenant-hero">
          <h1>No-show protection</h1>
        </div>

        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          <Link href="/dashboard">← Back to dashboard</Link>
        </p>

        <p style={{ color: '#555', marginBottom: '1.5rem' }}>
          When this is on, customers add a card when they book (nothing is charged). If they don&apos;t show up, your
          staff can charge a no-show fee straight to that card — paid directly to them, same as an in-person payment
          would be.
        </p>

        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Turn on no-show protection
          </label>
        </div>

        {enabled && (
          <>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Card at booking time</div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={cardRequired} onChange={() => setCardRequired(true)} style={{ marginTop: 4 }} />
                <span>
                  <strong>Required</strong> — a customer can&apos;t complete a booking without adding a card.
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                <input type="radio" checked={!cardRequired} onChange={() => setCardRequired(false)} style={{ marginTop: 4 }} />
                <span>
                  <strong>Optional</strong> — a customer can skip it. If they no-show without a card on file, your
                  staff just log the fee as owed instead of charging it automatically.
                </span>
              </label>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>No-show fee amount</div>

              <label style={{ display: 'block', marginBottom: '0.6rem', cursor: 'pointer' }}>
                <input type="radio" checked={feeMode === 'flat'} onChange={() => setFeeMode('flat')} /> One flat fee for any service
              </label>
              {feeMode === 'flat' && (
                <div style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                  <label className="field-label">Fee (£)</label>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={feeFlat}
                    onChange={(e) => setFeeFlat(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '0.6rem', cursor: 'pointer' }}>
                <input type="radio" checked={feeMode === 'percentage'} onChange={() => setFeeMode('percentage')} /> Percentage of the
                service price
              </label>
              {feeMode === 'percentage' && (
                <div style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                  <label className="field-label">Percentage (%)</label>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={feePercentage}
                    onChange={(e) => setFeePercentage(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                </div>
              )}

              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input type="radio" checked={feeMode === 'per_service'} onChange={() => setFeeMode('per_service')} /> Set a different
                fee per service
              </label>
              {feeMode === 'per_service' && (
                <p style={{ marginLeft: '1.5rem', marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                  Set each service&apos;s no-show fee from <Link href="/dashboard/services">Services</Link>. A service
                  with no fee set won&apos;t have a no-show fee applied.
                </p>
              )}
            </div>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
        {saved && <p style={{ color: '#166534' }}>Saved.</p>}

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
