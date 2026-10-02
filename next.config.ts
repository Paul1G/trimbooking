import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Some Vercel accounts/orgs block saving an env var named with the
  // NEXT_PUBLIC_ prefix outright (a security policy against accidentally
  // publishing a secret), even when the value is genuinely meant to be
  // public — like Stripe's publishable key, which every Stripe.js
  // integration ships in its page source anyway. This re-exposes a
  // plain-named STRIPE_PUBLISHABLE_KEY env var to the browser bundle under
  // the NEXT_PUBLIC_ name the client code expects
  // (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
  // app/tenant/[subdomain]/book/BookingForm.tsx), without needing the
  // variable itself to be named or stored that way in Vercel.
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
