import Link from 'next/link'

export default function TenantNav({
  brandColor,
}: {
  brandColor: string
}) {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '1.5rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee',
        marginBottom: '1rem',
      }}
    >
      <Link href="/" style={{ color: brandColor, fontWeight: 600, textDecoration: 'none' }}>
        Services
      </Link>
      <Link href="/team" style={{ color: brandColor, fontWeight: 600, textDecoration: 'none' }}>
        Our Team
      </Link>
    </nav>
  )
}
