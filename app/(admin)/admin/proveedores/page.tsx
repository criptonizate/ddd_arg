import { getProveedores } from '@/lib/actions/proveedores'
import { formatARS } from '@/lib/utils'
import ProveedoresClient from '@/components/admin/ProveedoresClient'

export const metadata = { title: 'Proveedores' }

export default async function ProveedoresPage() {
  const proveedores = await getProveedores()
  return <ProveedoresClient initialProveedores={proveedores} />
}
