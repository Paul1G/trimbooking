// Shared fee math for no-show protection (Stage 3). Amounts here are in
// whole pounds (numeric, e.g. 15.00) — matching services.price and
// bookings.amount_paid's existing convention, not the pence convention used
// by lib/billing.ts for platform billing. Converted to pence only right
// before a Stripe API call (lib/stripeNoShow.ts).

export type NoShowFeeMode = 'flat' | 'percentage' | 'per_service'

export type TenantNoShowSettings = {
  no_show_protection_enabled: boolean
  no_show_card_required: boolean
  no_show_fee_mode: NoShowFeeMode
  no_show_fee_flat: number | null
  no_show_fee_percentage: number | null
}

export type ServiceNoShowFields = {
  price: number
  no_show_fee: number | null
}

// Returns null when the fee can't be worked out (e.g. per-service mode but
// this particular service has no fee set) — callers treat that as "no
// no-show fee applies here" rather than defaulting to some other amount.
export function computeNoShowFee(tenant: TenantNoShowSettings, service: ServiceNoShowFields): number | null {
  if (tenant.no_show_fee_mode === 'flat') {
    return tenant.no_show_fee_flat != null ? Number(tenant.no_show_fee_flat) : null
  }
  if (tenant.no_show_fee_mode === 'percentage') {
    if (tenant.no_show_fee_percentage == null) return null
    return Math.round(service.price * (Number(tenant.no_show_fee_percentage) / 100) * 100) / 100
  }
  if (tenant.no_show_fee_mode === 'per_service') {
    return service.no_show_fee != null ? Number(service.no_show_fee) : null
  }
  return null
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}
