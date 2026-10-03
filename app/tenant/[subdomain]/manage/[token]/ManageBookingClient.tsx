'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { offerFreedSlotToWaitlist } from '@/lib/waitlist'
import AvailabilityPicker, { WorkingHours, BreakWindows } from '../../AvailabilityPicker'

type Staff = {
  id: string
  name: string
  role: string
  working_hours: WorkingHours
  breaks?: BreakWindows | null
}
type Service = { id: string; name: string; duration_minutes: number; price: number }

type Booking = {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  start_time: string
  end_time: string
  status: string
  staff: Staff | null
  services: Service | null
  last_booking: { start_time: string; service_name: string | null } | null
}

function statusLabel(status: string) {
  if (status === 'pending') return { text: 'Awaiting confirmation', bg: '#fef9c3', color: '#854d0e' }
  if (status === 'confirmed') return { text: 'Confirmed', bg: '#dcfce7', color: '#166534' }
  if (status === 'cancelled') return { text: 'Cancelled', bg: '#fee2e2', color: '#991b1b' }
  if (status === 'declined') return { text: 'Declined', bg: '#fee2e2', color: '#991b1b' }
  return { text: status, bg: '#f3f4f6', color: '#374151' }
}

export default function ManageBookingClient({
  tenantId,
  tenantName,
  subdomain,
  shopOpeningHours,
  booking: initialBooking,
  manageToken,
}: {
  tenantId: string
  tenantName: string
  subdomain: string
  shopOpeningHours: WorkingHours
  booking: Booking
  manageToken: string
}) {
  const [booking, setBooking] = useState(initialBooking)
  const [mode, setMode] = useState<'view' | 'reschedule'>('view')
  const [selection, setSelection] = useState<{ date: string; slot: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [contactWindows, setContactWindows] = useState<[number, number][] | undefined>(undefined)

  // manage_get_booking returns the service's name/duration/price for display,
  // but not its parallel-treatment config — fetched separately here (the
  // services table is already anon-readable, same as on the public booking
  // page) so a reschedule respects the same contact windows as a new booking.
  useEffect(() => {
    async function loadParallelConfig() {
      if (!booking.services) return
      const { data } = await supabase
        .from('services')
        .select('allow_parallel, contact_windows')
        .eq('id', booking.services.id)
        .single()
      if (data?.allow_parallel && data.contact_windows) {
        setContactWindows(data.contact_windows)
      } else {
        setContactWindows(undefined)
      }
    }
    loadParallelConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.services?.id])

  const isPast = new Date(booking.start_time) < new Date()
  const isCancelled = booking.status === 'cancelled'
  const isDeclined = booking.status === 'declined'
  const canManage = !isPast && !isCancelled && !isDeclined

  const dateStr = new Date(booking.start_time).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function handleCancel() {
    if (!confirm('Cancel this booking? This can\'t be undone.')) return
    setSaving(true)
    setError('')

    const { data: ok, error: rpcError } = await supabase.rpc('manage_cancel_booking', {
      p_token: manageToken,
    })

    if (rpcError || !ok) {
      setSaving(false)
      setError(rpcError?.message || 'This booking can no longer be cancelled.')
      return
    }

    fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cancelled',
        tenantName,
        customerEmail: booking.customer_email,
        customerName: booking.customer_name,
        serviceName: booking.services?.name,
        staffName: booking.staff?.name,
        startTime: booking.start_time,
      }),
    }).catch(() => {})

    if (booking.staff?.id) {
      offerFreedSlotToWaitlist({
        supabase,
        tenantId,
        staffId: booking.staff.id,
        slotStart: booking.start_time,
        slotEnd: booking.end_time,
        tenantName,
        subdomain,
        staffName: booking.staff?.name,
      })
    }

    setBooking({ ...booking, status: 'cancelled' })
    setMessage('Your booking has been cancelled.')
    setSaving(false)
  }

  async function handleConfirmReschedule() {
    if (!selection || !booking.services) return
    setSaving(true)
    setError('')

    const [h, m] = selection.slot.split(':').map(Number)
    const startTime = new Date(selection.date + 'T00:00:00')
    startTime.setHours(h, m, 0, 0)
    const endTime = new Date(startTime.getTime() + booking.services.duration_minutes * 60000)

    // Moving a booking sends it back to "pending" so the shop can confirm the new time.
    const { data: ok, error: rpcError } = await supabase.rpc('manage_reschedule_booking', {
      p_token: manageToken,
      p_start: startTime.toISOString(),
      p_end: endTime.toISOString(),
    })

    if (rpcError || !ok) {
      setSaving(false)
      setError(rpcError?.message || 'This booking can no longer be moved.')
      return
    }

    const manageUrl = `https://${subdomain}.trimbooking.co.uk/manage/${manageToken}`

    fetch('/api/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'rescheduled',
        tenantName,
        customerEmail: booking.customer_email,
        customerName: booking.customer_name,
        serviceName: booking.services?.name,
        staffName: booking.staff?.name,
        startTime: startTime.toISOString(),
        manageUrl,
      }),
    }).catch(() => {})

    if (booking.staff?.id) {
      offerFreedSlotToWaitlist({
        supabase,
        tenantId,
        staffId: booking.staff.id,
        slotStart: booking.start_time,
        slotEnd: booking.end_time,
        tenantName,
        subdomain,
        staffName: booking.staff?.name,
      })
    }

    setBooking({ ...booking, start_time: startTime.toISOString(), end_time: endTime.toISOString(), status: 'pending' })
    setMode('view')
    setSelection(null)
    setMessage('Your booking has been moved and is awaiting confirmation from the shop.')
    setSaving(false)
  }

  const status = statusLabel(booking.status)

  return (
    <div>
      <div className="card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div className="card-title" style={{ fontSize: '1.1rem' }}>{booking.services?.name}</div>
            <div className="card-sub">with {booking.staff?.name}</div>
          </div>
          <span
            style={{
              fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999,
              background: status.bg, color: status.color, whiteSpace: 'nowrap',
            }}
          >
            {status.text}
          </span>
        </div>

        <p style={{ margin: '0 0 0.4rem' }}>{dateStr}</p>
        <p className="card-sub" style={{ margin: 0 }}>{booking.customer_name} · {booking.customer_phone}</p>

        {booking.last_booking && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: 0 }}>
            Your last visit was {new Date(booking.last_booking.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {booking.last_booking.service_name ? ` for ${booking.last_booking.service_name}` : ''}.
          </p>
        )}
      </div>

      {message && (
        <p style={{ color: '#166534', fontSize: '0.9rem', marginTop: '1rem' }}>{message}</p>
      )}
      {error && <p className="error-text">{error}</p>}

      {isPast && !isCancelled && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>This appointment has already taken place.</p>
      )}
      {isCancelled && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>This booking is cancelled.</p>
      )}
      {isDeclined && (
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
          This booking wasn&apos;t able to be confirmed by the shop. Please make a new booking if you&apos;d still like to visit.
        </p>
      )}

      {canManage && mode === 'view' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn-primary" onClick={() => setMode('reschedule')} disabled={saving}>
            Move to a different time
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, cursor: 'pointer' }}
          >
            Cancel booking
          </button>
        </div>
      )}

      {canManage && mode === 'reschedule' && booking.staff && booking.services && (
        <div style={{ marginTop: '1.5rem' }}>
          <AvailabilityPicker
            tenantId={tenantId}
            staff={booking.staff}
            durationMinutes={booking.services.duration_minutes}
            shopOpeningHours={shopOpeningHours}
            initialDate={new Date(booking.start_time)}
            excludeBookingId={booking.id}
            contactWindows={contactWindows}
            onSelect={setSelection}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn-primary" onClick={handleConfirmReschedule} disabled={!selection || saving}>
              {saving ? 'Saving...' : 'Confirm new time'}
            </button>
            <button
              onClick={() => { setMode('view'); setSelection(null) }}
              disabled={saving}
              style={{ padding: '0.8rem 1.6rem', background: 'transparent', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
