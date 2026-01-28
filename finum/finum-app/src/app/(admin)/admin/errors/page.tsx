import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

async function getErrorLogs() {
  const [unresolvedErrors, resolvedErrors, errorsByType] = await Promise.all([
    prisma.errorLog.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.errorLog.count({ where: { resolved: true } }),
    prisma.errorLog.groupBy({
      by: ['errorType'],
      _count: true,
      where: { resolved: false },
    }),
  ])

  return { unresolvedErrors, resolvedErrors, errorsByType }
}

export default async function AdminErrorsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { unresolvedErrors, resolvedErrors, errorsByType } = await getErrorLogs()
  const totalErrors = unresolvedErrors.length + resolvedErrors
  const resolutionRate = totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Erreurs</h1>
        <p className="text-finum-gray-600 mt-2">
          Gestion et suivi des erreurs de la plateforme
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Non Résolues</p>
              <p className="text-3xl font-bold text-finum-red mt-2">{unresolvedErrors.length}</p>
            </div>
            <XCircle className="w-8 h-8 text-finum-red" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Résolues</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{resolvedErrors}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Taux de Résolution</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{resolutionRate}%</p>
            </div>
            <AlertCircle className="w-8 h-8 text-finum-blue" />
          </div>
        </div>
      </div>

      {/* Errors by Type */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Erreurs par Type</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {errorsByType.map((stat) => (
              <div key={stat.errorType} className="flex items-center justify-between">
                <span className="text-sm text-finum-gray-700 capitalize">{stat.errorType}</span>
                <span className="text-sm font-semibold text-finum-gray-900">{stat._count}</span>
              </div>
            ))}
            {errorsByType.length === 0 && (
              <p className="text-sm text-finum-gray-500">Aucune erreur non résolue</p>
            )}
          </div>
        </div>
      </div>

      {/* Unresolved Errors Table */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200 overflow-hidden">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Erreurs Non Résolues</h2>
        </div>
        <div className="overflow-x-auto">
          {unresolvedErrors.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-600">Aucune erreur non résolue</p>
              <p className="text-sm text-finum-gray-500 mt-2">Tous les systèmes fonctionnent correctement</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                    Date/Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-finum-gray-200">
                {unresolvedErrors.map((error) => (
                  <tr key={error.id} className="hover:bg-finum-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900">
                      {new Date(error.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded capitalize">
                        {error.errorType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-finum-gray-700 max-w-md truncate">
                      {error.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-500 font-mono">
                      {error.errorCode || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
