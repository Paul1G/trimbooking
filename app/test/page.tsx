import { supabase } from '@/lib/supabase'

export default async function TestPage() {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Tenants in database:</h1>
      <pre>{JSON.stringify(tenants, null, 2)}</pre>
    </div>
  )
}