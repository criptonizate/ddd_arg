import { getCalculadoraConfig } from '@/lib/actions/calculadora'
import CalculadoraClient from '@/components/admin/CalculadoraClient'

export const metadata = { title: 'Calculadora' }

export default async function CalculadoraPage() {
  const config = await getCalculadoraConfig()
  return <CalculadoraClient initialConfig={config} />
}
