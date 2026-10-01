import Link from 'next/link'

export default function TenantNav({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <nav className="tenant-nav">
      <span className="brand">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="brand-logo" />
        ) : (
          name
        )}
      </span>
      <Link href="/">Services</Link>
      <Link href="/team">Our Team</Link>
      <Link href="/login">Log in</Link>
    </nav>
  )
}
