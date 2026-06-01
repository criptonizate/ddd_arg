import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/actions/auth'
import { getPendingOrdersCount } from '@/lib/actions/orders'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminThemeWrapper from '@/components/admin/AdminThemeWrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()
  if (!user) redirect('/auth/login')

  const pendingCount = await getPendingOrdersCount()

  return (
    <AdminThemeWrapper>
      <AdminSidebar userEmail={user.email ?? ''} pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </AdminThemeWrapper>
  )
}
