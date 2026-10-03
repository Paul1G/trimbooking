import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { slugifySubdomain, validateSubdomain } from '@/lib/subdomain'
import { sendWelcomeEmail } from '@/lib/email'
import { addDomainToVercelProject } from '@/lib/vercel'
import { startOfNextMonth } from '@/lib/billing'

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
  let body: { shopName?: string; subdomain?: string; email?: string; password?: string; termsAccepted?: boolean }
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
  // Enforced server-side too, not just by disabling the checkbox client-side —
  // this is what makes the Terms/Privacy acceptance (and the Stripe Connect
  // disclosure inside the Terms) something that actually happened, rather
  // than something the signup form merely displayed.
  if (!body.termsAccepted) {
    return NextResponse.json({ error: 'Please agree to the Terms of Service and Privacy Policy to continue.' }, { status: 400 })
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

  // One auth login per email is a Supabase constraint, not a TrimBooking
  // one — the same person can already own one shop and be invited as staff
  // at another (app/api/staff/invite/route.ts reuses their existing login
  // for that). This is the owner-signup equivalent: if that email already
  // has an account anywhere (another shop they own, or a shop they're staff
  // at), reuse it as the new tenant's owner instead of failing outright —
  // but only once the submitted password is confirmed to actually be
  // theirs. Without that check, anyone could type in someone else's email
  // here and attach a brand new shop to that person's identity.
  let ownerId: string
  let createdNewAuthUser: boolean

  if (createUserError || !created.user) {
    const alreadyExists = /already been registered|already exists/i.test(createUserError?.message || '')
    if (!alreadyExists) {
      return NextResponse.json({ error: createUserError?.message || 'Could not create your account.' }, { status: 400 })
    }

    const verifyClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: signInData, error: signInError } = await verifyClient.auth.signInWithPassword({ email, password })

    if (signInError || !signInData.user) {
      return NextResponse.json(
        {
          error:
            "An account already exists for that email, and that password doesn't match it. " +
            'Log in and add a new shop from there, or use a different email for this one.',
        },
        { status: 400 }
      )
    }

    ownerId = signInData.user.id
    createdNewAuthUser = false
  } else {
    ownerId = created.user.id
    createdNewAuthUser = true
  }

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date()

  const { data: tenantRow, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      name: shopName,
      subdomain,
      owner_id: ownerId,
      brand_color: '#111111',
      text_color: '#111111',
      background_color: '#ffffff',
      font_family: 'system',
      opening_hours: DEFAULT_OPENING_HOURS,
      trial_ends_at: trialEndsAt,
      // A gate for the monthly billing cron, not tied to anything charged
      // yet — it only ever fires once this tenant is also marked `paid`.
      next_invoice_at: startOfNextMonth(now).toISOString(),
      terms_accepted_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (tenantError) {
    // Roll back the auth user so a failed signup doesn't leave an orphaned
    // account — but only when this request created it. A reused, pre-existing
    // account (someone adding a second shop to their own login) must never be
    // deleted just because THIS tenant insert failed.
    if (createdNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(ownerId)
    return NextResponse.json({ error: 'Could not set up your shop: ' + tenantError.message }, { status: 500 })
  }

  // Register the new subdomain with Vercel so it's actually reachable — without
  // this, the tenant row would exist but the subdomain would 404 forever, so a
  // failure here rolls back everything just like a failed tenant insert does.
  const domainResult = await addDomainToVercelProject(`${subdomain}.trimbooking.co.uk`)
  if (!domainResult.ok) {
    // Delete by this specific tenant's id, never by owner_id — with account
    // reuse, owner_id may already belong to other shops this same person
    // owns, and deleting by owner_id would wipe those out too.
    await supabaseAdmin.from('tenants').delete().eq('id', tenantRow.id)
    if (createdNewAuthUser) await supabaseAdmin.auth.admin.deleteUser(ownerId)
    return NextResponse.json(
      { error: 'Could not set up your shop\'s web address: ' + (domainResult.error || 'unknown error') },
      { status: 500 }
    )
  }

  // Both of these run via Next's after() rather than a bare fire-and-forget
  // promise: on Vercel, the serverless function can be frozen the instant the
  // response below is sent, which can kill an un-awaited async call (and even
  // its .catch()) before it ever runs. after() tells the runtime to keep the
  // function alive until these finish, so they reliably complete without
  // making the signup request itself wait for them.
  after(async () => {
    await sendWelcomeEmail({ ownerEmail: email, shopName, subdomain }).catch(() => {
      // Provisioning already succeeded; a failed welcome email shouldn't block signup.
    })
  })

  // No invoice is raised here — the shop is free for the full 30-day trial.
  // The first invoice goes out automatically ~7 days before trial_ends_at
  // (see app/api/cron/send-trial-invoices), or whenever this tenant is
  // marked "paid" in /admin, whichever comes first.

  return NextResponse.json({ subdomain })
}
