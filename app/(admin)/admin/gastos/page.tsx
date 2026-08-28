import GastosClient from '@/components/admin/GastosClient'
import { getGastos } from '@/lib/actions/gastos'

export const metadata = { title: 'Mis gastos' }

export default async function GastosPage() {
  const dbEntries = await getGastos()
  return <GastosClient initialEntries={dbEntries} />
}
