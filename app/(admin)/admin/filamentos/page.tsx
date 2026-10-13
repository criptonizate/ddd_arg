import { getFilamentos } from '@/lib/actions/filamentos'
import { getClientesBasic } from '@/lib/actions/clientes'
import FilamentosClient from '@/components/admin/FilamentosClient'

export const metadata = { title: 'Filamentos' }

export default async function FilamentosPage() {
  const [filamentos, clientes] = await Promise.all([
    getFilamentos(),
    getClientesBasic().catch(() => []),
  ])
  return <FilamentosClient initialFilamentos={filamentos} clientes={clientes} />
}
