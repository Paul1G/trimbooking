'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../../home.css'
import '../admin.css'

export default function AdminResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/admin'), 2000)
  }

  return (
    <div className="home">
      <div className="admin-login-wrap">
        <div className="admin-card">
          <h1 style={{ fontSize: '1.4rem', marginTop: 0, marginBottom: '1.5rem' }}>Reset password</h1>

          {success ? (
            <p style={{ color: '#166534' }}>Password updated. Redirecting to login...</p>
          ) : (
            <>
              <div className="admin-field">
                <label className="admin-label">New password</label>
                <input
                  className="admin-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label className="admin-label">Confirm new password</label>
                <input
                  className="admin-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                />
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>}

              <button className="btn-dark" style={{ width: '100%' }} onClick={handleUpdate} disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
