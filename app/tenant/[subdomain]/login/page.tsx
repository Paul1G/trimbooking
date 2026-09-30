'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../tenant.css'

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    // Confirm this user owns THIS tenant, not just any tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, owner_id, disabled')
      .eq('subdomain', params.subdomain)
      .single()

    if (!tenant || tenant.owner_id !== data.user.id) {
      // Not the owner — check whether this account is a staff member here instead.
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('tenant_id', tenant?.id || '')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!staffRow) {
        await supabase.auth.signOut()
        setError('This account does not manage this shop.')
        setLoading(false)
        return
      }

      if (tenant?.disabled) {
        await supabase.auth.signOut()
        setError('This shop has been disabled. Please contact TrimBooking support.')
        setLoading(false)
        return
      }

      router.push('/staff')
      return
    }

    if (tenant.disabled) {
      await supabase.auth.signOut()
      setError('This shop has been disabled. Please contact TrimBooking support.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email above first, then click Forgot password')
      return
    }
    setError('')
    const redirectTo = window.location.origin + '/tenant/' + params.subdomain + '/reset-password'
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    if (resetError) {
      setError(resetError.message)
      return
    }
    setResetSent(true)
  }

  return (
    <div className="tenant-app">
      <div className="tenant-container" style={{ maxWidth: 400 }}>
        <div className="tenant-hero">
          <h1>Owner Login</h1>
        </div>

        <div className="field-group">
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          {resetSent ? (
            <span style={{ color: '#166534' }}>Check your email for a reset link.</span>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); handleReset() }} style={{ color: '#666' }}>
              Forgot password?
            </a>
          )}
        </p>
      </div>
    </div>
  )
}
