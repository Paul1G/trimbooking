'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import '../home.css'
import './admin.css'

type Tenant = {
  id: string
  name: string
  subdomain: string
  owner_id: string | null
  owner_email: string | null
  disabled: boolean
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  // null = still checking for an existing session
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function authedFetch(path: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token || ''}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  }

  async function loadTenants() {
    const res = await authedFetch('/api/admin/tenants')
    if (res.status === 403 || res.status === 401) {
      setAuthorized(false)
      await supabase.auth.signOut()
      return
    }
    const result = await res.json()
    setTenants(result.tenants || [])
    setAuthorized(true)
  }

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setAuthorized(false)
        return
      }
      await loadTenants()
    }
    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin() {
    setLoginError('')
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError('Incorrect email or password.')
      setLoggingIn(false)
      return
    }
    await loadTenants()
    setLoggingIn(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setAuthorized(false)
    setTenants([])
  }

  async function toggleDisabled(t: Tenant) {
    setBusyId(t.id)
    setActionError('')
    const res = await authedFetch(`/api/admin/tenants/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: !t.disabled }),
    })
    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setActionError(result.error || 'Could not update this shop.')
      setBusyId(null)
      return
    }
    await loadTenants()
    setBusyId(null)
  }

  async function deleteTenant(t: Tenant) {
    const confirmed = window.confirm(
      `Permanently delete "${t.name}" (${t.subdomain}.trimbooking.co.uk)? This deletes all its bookings, staff and services, and cannot be undone.`
    )
    if (!confirmed) return

    setBusyId(t.id)
    setActionError('')
    const res = await authedFetch(`/api/admin/tenants/${t.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setActionError(result.error || 'Could not delete this shop.')
      setBusyId(null)
      return
    }
    await loadTenants()
    setBusyId(null)
  }

  if (authorized === null) {
    return (
      <div className="home">
        <div className="admin-login-wrap">
          <p style={{ color: 'var(--muted)' }}>Checking access...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="home">
        <div className="admin-login-wrap">
          <div className="admin-card">
            <h1 style={{ fontSize: '1.4rem', marginTop: 0, marginBottom: '1.5rem' }}>Admin login</h1>

            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Password</label>
              <input
                className="admin-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {loginError && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{loginError}</p>}

            <button className="btn-dark" style={{ width: '100%' }} onClick={handleLogin} disabled={loggingIn}>
              {loggingIn ? 'Logging in...' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="admin-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Shops</h1>
          <button className="admin-btn" onClick={handleLogout}>Log out</button>
        </div>

        {actionError && <p style={{ color: '#dc2626' }}>{actionError}</p>}

        <div className="admin-shop-list">
          {tenants.map((t) => (
            <div key={t.id} className="admin-shop-card">
              <div style={{ flex: '1 1 260px' }}>
                <div className="admin-shop-name">{t.name}</div>
                <div className="admin-shop-sub">{t.subdomain}.trimbooking.co.uk</div>
                <div className="admin-shop-sub">{t.owner_email || 'no owner account'}</div>
              </div>

              <span
                className="admin-badge"
                style={{
                  background: t.disabled ? '#fee2e2' : '#dcfce7',
                  color: t.disabled ? '#991b1b' : '#166534',
                }}
              >
                {t.disabled ? 'Disabled' : 'Active'}
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="admin-btn" onClick={() => toggleDisabled(t)} disabled={busyId === t.id}>
                  {t.disabled ? 'Enable' : 'Disable'}
                </button>
                <button className="admin-btn admin-btn-danger" onClick={() => deleteTenant(t)} disabled={busyId === t.id}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tenants.length === 0 && <p style={{ color: 'var(--muted)' }}>No shops yet.</p>}
        </div>
      </div>
    </div>
  )
}
