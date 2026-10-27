import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/actions/auth'
import { getPendingOrdersCount } from '@/lib/actions/orders'
import { getCalculadoraConfig } from '@/lib/actions/calculadora'
import { getFilamentoPedidosPendientesCount, getExtensionPendientesCount } from '@/lib/actions/filamento-pedidos'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminThemeWrapper from '@/components/admin/AdminThemeWrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await getAdminUser()
  } catch {
    redirect('/auth/login')
  }

  const [pendingCount, filamentoPendingCount, extensionPendingCount, calculadoraConfig] = await Promise.all([
    getPendingOrdersCount().catch(() => 0),
    getFilamentoPedidosPendientesCount().catch(() => 0),
    getExtensionPendientesCount().catch(() => 0),
    getCalculadoraConfig().catch(() => null),
  ])

  return (
    <AdminThemeWrapper>
      <AdminSidebar userEmail={user.email ?? ''} pendingCount={pendingCount} filamentoPendingCount={filamentoPendingCount} extensionPendingCount={extensionPendingCount} calculadoraConfig={calculadoraConfig} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </AdminThemeWrapper>
  )
}
