'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../../tenant.css'

export default function StaffSetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
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
    setTimeout(() => router.push('/staff'), 2000)
  }

  return (
    <div className="tenant-app">
      <div className="tenant-container" style={{ maxWidth: 400 }}>
        <div className="tenant-hero">
          <h1>Set your password</h1>
        </div>

        {success ? (
          <p style={{ color: '#166534' }}>Password set. Taking you to your portal...</p>
        ) : (
          <>
            <div className="field-group">
              <label className="field-label">New password</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Confirm new password</label>
              <input
                className="field-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="btn-primary" onClick={handleUpdate} disabled={loading}>
              {loading ? 'Saving...' : 'Save password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
