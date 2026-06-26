import { getFilamentos } from '@/lib/actions/filamentos'
import FilamentosClient from '@/components/admin/FilamentosClient'

export const metadata = { title: 'Filamentos' }

export default async function FilamentosPage() {
  const filamentos = await getFilamentos()
  return <FilamentosClient initialFilamentos={filamentos} />
}
