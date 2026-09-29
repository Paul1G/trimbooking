import Link from 'next/link'

export default function TenantNav({ name }: { name: string }) {
  return (
    <nav className="tenant-nav">
      <span className="brand">{name}</span>
      <Link href="/">Services</Link>
      <Link href="/team">Our Team</Link>
    </nav>
  )
}
