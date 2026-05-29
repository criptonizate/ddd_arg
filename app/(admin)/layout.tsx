import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/actions/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
