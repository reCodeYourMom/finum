import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ScrollText } from 'lucide-react'

async function getAuditLogs(page = 1, limit = 50) {
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count(),
  ])

  return { logs, total, pages: Math.ceil(total / limit) }
}

export default async function AdminLogsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { logs, total } = await getAuditLogs()

  // Stats by action
  const actionStats = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: true,
    orderBy: {
      _count: {
        action: 'desc',
      },
    },
    take: 10,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Audit Logs</h1>
        <p className="text-finum-gray-600 mt-2">
          Historique des actions utilisateurs sur la plateforme
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <p className="text-sm font-medium text-finum-gray-600">Total des Logs</p>
          <p className="text-3xl font-bold text-finum-gray-900 mt-2">{total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <p className="text-sm font-medium text-finum-gray-600">Aujourd'hui</p>
          <p className="text-3xl font-bold text-finum-gray-900 mt-2">
            {logs.filter((l) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <p className="text-sm font-medium text-finum-gray-600">Action la Plus Fréquente</p>
          <p className="text-lg font-bold text-finum-gray-900 mt-2">
            {actionStats[0]?.action || 'N/A'}
          </p>
          <p className="text-sm text-finum-gray-500">{actionStats[0]?._count || 0} fois</p>
        </div>
      </div>

      {/* Top Actions */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Top 10 Actions</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {actionStats.map((stat) => (
              <div key={stat.action} className="flex items-center justify-between">
                <span className="text-sm text-finum-gray-700 font-mono">{stat.action}</span>
                <span className="text-sm font-semibold text-finum-gray-900">{stat._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200 overflow-hidden">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Logs Récents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-500 uppercase tracking-wider">
                  Entité
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-finum-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-finum-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900">
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-finum-gray-900">{log.user.name}</div>
                    <div className="text-xs text-finum-gray-500">{log.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-mono bg-finum-gray-100 text-finum-gray-700 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-500">
                    {log.entityType ? (
                      <span className="font-mono">{log.entityType}</span>
                    ) : (
                      <span className="text-finum-gray-400">—</span>
                    )}
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
