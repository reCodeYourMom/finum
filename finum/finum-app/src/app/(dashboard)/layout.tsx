import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import FeedbackWidget from '@/components/feedback/FeedbackWidget'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-finum-gray-50">
        <DashboardNav />
        <div className="flex-1 flex flex-col">
          <DashboardHeader user={session.user} />
          <main className="flex-1 p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
        <FeedbackWidget />
      </div>
    </ErrorBoundary>
  )
}
