import { getUsuariosRegistrados } from '@/lib/actions/filamentos'
import { getFilamentos } from '@/lib/actions/filamentos'
import CuentasClient from '@/components/admin/CuentasClient'

export const metadata = { title: 'Cuentas' }

export default async function CuentasPage() {
  const [usuarios, filamentos] = await Promise.all([
    getUsuariosRegistrados(),
    getFilamentos(),
  ])
  return <CuentasClient usuarios={usuarios} filamentos={filamentos} />
}
