import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Users, UserCheck, TrendingUp, Calendar } from 'lucide-react'

async function getUsers() {
  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: {
          select: {
            budgets: true,
            transactions: true,
            conversations: true,
            feedback: true,
          },
        },
      },
    }),
    {
      total: await prisma.user.count(),
      withBudgets: await prisma.user.count({
        where: {
          budgets: {
            some: {},
          },
        },
      }),
      onboardingComplete: await prisma.user.count({
        where: {
          onboardingComplete: true,
        },
      }),
      activeThisWeek: await prisma.user.count({
        where: {
          sessions: {
            some: {
              expires: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),
    },
  ])

  return { users, stats }
}

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { users, stats } = await getUsers()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Utilisateurs</h1>
        <p className="text-finum-gray-600 mt-2">
          Gestion et statistiques des utilisateurs de la plateforme
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Total Utilisateurs</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-finum-blue" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Actifs (7j)</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeThisWeek}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Avec Budgets</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.withBudgets}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-finum-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Onboarding OK</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stats.onboardingComplete}</p>
            </div>
            <Calendar className="w-8 h-8 text-finum-gray-400" />
          </div>
          <p className="text-xs text-finum-gray-500 mt-2">
            {Math.round((stats.onboardingComplete / stats.total) * 100)}% taux de complétion
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200 overflow-hidden">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Liste des Utilisateurs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Budgets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-finum-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-finum-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || ''}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-finum-gray-200 flex items-center justify-center mr-3">
                          <span className="text-finum-gray-600 font-medium text-xs">
                            {user.name?.[0] || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-finum-gray-900">{user.name}</div>
                        <div className="text-xs text-finum-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.onboardingComplete ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        ✓ Complété
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                        {user.onboardingStep}/5
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900 text-center">
                    {user._count.budgets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900 text-center">
                    {user._count.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900 text-center">
                    {user._count.conversations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900 text-center">
                    {user._count.feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
