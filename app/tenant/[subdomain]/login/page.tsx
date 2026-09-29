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
      .select('id, owner_id')
      .eq('subdomain', params.subdomain)
      .single()

    if (!tenant || tenant.owner_id !== data.user.id) {
      await supabase.auth.signOut()
      setError('This account does not manage this shop.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
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
      </div>
    </div>
  )
}
