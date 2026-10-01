'use client'

import { useCustomerHistory, formatCustomerTenure } from '@/lib/customerHistory'

// Shown inside a booking's detail popup on any owner-facing calendar — the
// customer's last few visits, how many they've had in total, and how long
// they've been coming here. Pure client-side lookup by email, so it works
// the same whether it's opened from the main bookings calendar or a single
// staff member's calendar.
export default function CustomerHistoryView({
  tenantId,
  customerEmail,
  excludeBookingId,
}: {
  tenantId: string | null
  customerEmail: string | null
  excludeBookingId?: string
}) {
  const history = useCustomerHistory(tenantId, customerEmail, excludeBookingId)

  if (!customerEmail) return null

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '0.5rem' }}>
        Customer history
      </div>

      {history.loading && <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>Loading...</p>}

      {!history.loading && history.error && (
        <p style={{ fontSize: '0.85rem', color: '#991b1b', margin: 0 }}>
          Couldn&apos;t load history: {history.error}
        </p>
      )}

      {!history.loading && !history.error && history.totalVisits === 0 && (
        <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>No previous visits — this is their first time.</p>
      )}

      {!history.loading && !history.error && history.totalVisits > 0 && (
        <>
          <p style={{ fontSize: '0.85rem', margin: '0 0 0.6rem' }}>
            <strong>{history.totalVisits}</strong> visit{history.totalVisits === 1 ? '' : 's'} total
            {history.customerSince && (
              <>
                {' '}· customer since{' '}
                {new Date(history.customerSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}({formatCustomerTenure(history.customerSince)})
              </>
            )}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {history.recentVisits.map((v) => (
              <div key={v.id} style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ color: '#444' }}>{v.service_name || 'Appointment'}{v.staff_name ? ` with ${v.staff_name}` : ''}</span>
                <span style={{ color: '#999', whiteSpace: 'nowrap' }}>
                  {new Date(v.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
