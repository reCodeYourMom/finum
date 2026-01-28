import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // TODO: Add proper admin role check
  // For now, all authenticated users can access admin
  // In production, check session.user.role === 'admin'

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-finum-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-finum-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-finum-gray-200">
          <Link href="/cockpit" className="flex items-center gap-2 mb-4 text-finum-gray-500 hover:text-finum-blue transition-colors">
            <span className="text-sm">← Retour au dashboard</span>
          </Link>
          <h1 className="text-xl font-bold text-finum-gray-900">Admin Panel</h1>
          <p className="text-sm text-finum-gray-500 mt-1">Finum Management</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-6 overflow-y-auto">
          <AdminNav />
        </div>

        {/* User info */}
        <div className="p-4 border-t border-finum-gray-200">
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || ''}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-finum-gray-900 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-finum-gray-500 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
      </div>
    </ErrorBoundary>
  )
}
