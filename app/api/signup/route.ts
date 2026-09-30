import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { slugifySubdomain, validateSubdomain } from '@/lib/subdomain'
import { sendWelcomeEmail, sendInvoiceEmail } from '@/lib/email'
import { addDomainToVercelProject } from '@/lib/vercel'
import { prorateSignupInvoice, startOfNextMonth } from '@/lib/billing'

// Sensible defaults for a brand new shop — open Mon–Sat, closed Sunday.
// Keys match lib/availability.ts's dayKeyFor() (sun, mon, tue, wed, thu, fri, sat).
const DEFAULT_OPENING_HOURS = {
  mon: ['09:00', '17:00'],
  tue: ['09:00', '17:00'],
  wed: ['09:00', '17:00'],
  thu: ['09:00', '17:00'],
  fri: ['09:00', '17:00'],
  sat: ['09:00', '13:00'],
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Fully automated, zero-touch tenant provisioning: creates the owner's auth
// account and the tenants row in one request, with sensible defaults, so a
// new shop can sign up and start setting up their page immediately without
// anyone at TrimBooking touching Supabase by hand.
export async function POST(req: NextRequest) {
  let body: { shopName?: string; subdomain?: string; email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const shopName = (body.shopName || '').trim()
  const email = (body.email || '').trim()
  const password = body.password || ''
  const subdomain = slugifySubdomain(body.subdomain || '')

  if (!shopName) {
    return NextResponse.json({ error: 'Please enter your shop name.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const subdomainError = validateSubdomain(subdomain)
  if (subdomainError) {
    return NextResponse.json({ error: subdomainError }, { status: 400 })
  }

  const { data: existingTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (existingTenant) {
    return NextResponse.json({ error: 'That address is already taken — please choose another.' }, { status: 409 })
  }

  const { data: created, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createUserError || !created.user) {
    const message = createUserError?.message?.includes('already been registered')
      ? 'An account already exists for that email.'
      : createUserError?.message || 'Could not create your account.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date()

  const { data: tenantRow, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: shopName,
      subdomain,
      owner_id: created.user.id,
      brand_color: '#111111',
      text_color: '#111111',
      background_color: '#ffffff',
      font_family: 'system',
      opening_hours: DEFAULT_OPENING_HOURS,
      trial_ends_at: trialEndsAt,
      // Regular monthly invoices start from the 1st of next month — the
      // prorated invoice raised below covers the gap between now and then.
      next_invoice_at: startOfNextMonth(now).toISOString(),
    })
    .select('id')
    .single()

  if (tenantError) {
    // Roll back the auth user so a failed signup doesn't leave an orphaned account.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'Could not set up your shop: ' + tenantError.message }, { status: 500 })
  }

  // Register the new subdomain with Vercel so it's actually reachable — without
  // this, the tenant row would exist but the subdomain would 404 forever, so a
  // failure here rolls back everything just like a failed tenant insert does.
  const domainResult = await addDomainToVercelProject(`${subdomain}.trimbooking.co.uk`)
  if (!domainResult.ok) {
    await supabaseAdmin.from('tenants').delete().eq('owner_id', created.user.id)
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json(
      { error: 'Could not set up your shop\'s web address: ' + (domainResult.error || 'unknown error') },
      { status: 500 }
    )
  }

  sendWelcomeEmail({ ownerEmail: email, shopName, subdomain }).catch(() => {
    // Provisioning already succeeded; a failed welcome email shouldn't block signup.
  })

  // Raise and email the prorated first invoice, covering sign-up day through
  // the end of this calendar month. A brand new shop has no staff yet, so
  // this is just the base fee pro-rated — never blocks signup if it fails.
  if (tenantRow?.id) {
    const proration = prorateSignupInvoice(now, 0)
    const { data: invoiceRow } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenantRow.id,
        period_start: proration.periodStart,
        period_end: proration.periodEnd,
        staff_count: proration.staffCount,
        amount_pence: proration.amountPence,
        is_proration: true,
      })
      .select('id')
      .maybeSingle()

    sendInvoiceEmail({
      ownerEmail: email,
      shopName,
      subdomain,
      periodStart: proration.periodStart,
      periodEnd: proration.periodEnd,
      staffCount: proration.staffCount,
      amountPence: proration.amountPence,
      isProration: true,
    })
      .then((result) => {
        if (!result.error && invoiceRow?.id) {
          return supabaseAdmin.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoiceRow.id)
        }
      })
      .catch(() => {
        // Provisioning already succeeded; a failed invoice email shouldn't block signup.
      })
  }

  return NextResponse.json({ subdomain })
}
