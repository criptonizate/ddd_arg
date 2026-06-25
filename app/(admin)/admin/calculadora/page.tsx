import { getCalculadoraConfig, getCalculoHistorial } from '@/lib/actions/calculadora'
import CalculadoraClient from '@/components/admin/CalculadoraClient'

export const metadata = { title: 'Calculadora' }

export default async function CalculadoraPage() {
  const [config, historial] = await Promise.all([
    getCalculadoraConfig(),
    getCalculoHistorial(),
  ])
  return <CalculadoraClient initialConfig={config} initialHistorial={historial} />
}
