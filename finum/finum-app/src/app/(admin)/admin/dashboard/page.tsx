import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Users, MessageSquare, AlertCircle, ScrollText, TrendingUp, Activity } from 'lucide-react'

async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    totalFeedback,
    unresolvedErrors,
    auditLogsToday,
    onboardingRate,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        sessions: {
          some: {
            expires: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        },
      },
    }),
    prisma.userFeedback.count(),
    prisma.errorLog.count({ where: { resolved: false } }),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.user.aggregate({
      _avg: {
        onboardingStep: true,
      },
      where: {
        onboardingComplete: true,
      },
    }),
  ])

  // Recent activity
  const recentFeedback = await prisma.userFeedback.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  const recentErrors = await prisma.errorLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { resolved: false },
  })

  return {
    totalUsers,
    activeUsers,
    totalFeedback,
    unresolvedErrors,
    auditLogsToday,
    onboardingCompletionRate: onboardingRate._avg.onboardingStep
      ? Math.round((onboardingRate._avg.onboardingStep / 5) * 100)
      : 0,
    recentFeedback,
    recentErrors,
  }
}

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const stats = await getAdminStats()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Vue d'ensemble Admin</h1>
        <p className="text-finum-gray-600 mt-2">
          Métriques et activités de la plateforme Finum
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Utilisateurs Total</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-finum-blue/10 rounded-lg">
              <Users className="w-6 h-6 text-finum-blue" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            {stats.activeUsers} actifs (7 derniers jours)
          </p>
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Feedback Total</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.totalFeedback}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            Bugs, features, et compliments
          </p>
        </div>

        {/* Errors */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Erreurs Non Résolues</p>
              <p className="text-3xl font-bold text-finum-red mt-2">{stats.unresolvedErrors}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-finum-red" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            Nécessitent attention
          </p>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Actions Aujourd'hui</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.auditLogsToday}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ScrollText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            Audit logs enregistrés
          </p>
        </div>

        {/* Onboarding Rate */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Taux d'Onboarding</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">
                {stats.onboardingCompletionRate}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            Utilisateurs ayant complété
          </p>
        </div>

        {/* Activity */}
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Statut Plateforme</p>
              <p className="text-xl font-bold text-green-600 mt-2">🟢 Opérationnel</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-finum-gray-500 mt-4">
            Tous les systèmes fonctionnels
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow border border-finum-gray-200">
          <div className="p-6 border-b border-finum-gray-200">
            <h2 className="text-lg font-semibold text-finum-gray-900">Feedback Récent</h2>
          </div>
          <div className="divide-y divide-finum-gray-200">
            {stats.recentFeedback.length === 0 ? (
              <p className="p-6 text-sm text-finum-gray-500">Aucun feedback récent</p>
            ) : (
              stats.recentFeedback.map((feedback) => (
                <div key={feedback.id} className="p-4 hover:bg-finum-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-finum-gray-900 truncate">
                        {feedback.title}
                      </p>
                      <p className="text-xs text-finum-gray-500 mt-1">
                        {feedback.user.name} • {new Date(feedback.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        feedback.type === 'bug'
                          ? 'bg-red-100 text-red-700'
                          : feedback.type === 'feature'
                          ? 'bg-blue-100 text-blue-700'
                          : feedback.type === 'praise'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {feedback.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-lg shadow border border-finum-gray-200">
          <div className="p-6 border-b border-finum-gray-200">
            <h2 className="text-lg font-semibold text-finum-gray-900">Erreurs Non Résolues</h2>
          </div>
          <div className="divide-y divide-finum-gray-200">
            {stats.recentErrors.length === 0 ? (
              <p className="p-6 text-sm text-green-600">✅ Aucune erreur non résolue</p>
            ) : (
              stats.recentErrors.map((error) => (
                <div key={error.id} className="p-4 hover:bg-finum-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-finum-red mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-finum-gray-900 truncate">
                        {error.message}
                      </p>
                      <p className="text-xs text-finum-gray-500 mt-1">
                        {error.errorType} • {new Date(error.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
