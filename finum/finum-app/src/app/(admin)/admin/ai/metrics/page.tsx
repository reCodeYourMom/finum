import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Brain, DollarSign, Zap, TrendingUp, MessageSquare } from 'lucide-react'

async function getAIMetrics() {
  const [conversations, messages, cacheLogs, recentUsage] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.aICache.count(),
    prisma.message.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    }),
  ])

  // Estimate costs (rough approximation)
  const avgTokensPerMessage = 2500
  const costPerToken = 0.000003 // Sonnet 3.5 price
  const estimatedCost = messages * avgTokensPerMessage * costPerToken

  // Cache hit rate
  const cacheHitRate = cacheLogs > 0 ? Math.round((cacheLogs / (messages + cacheLogs)) * 100) : 0

  return {
    conversations,
    messages,
    cacheLogs,
    cacheHitRate,
    estimatedCost,
    recentUsage,
  }
}

export default async function AdminAIMetricsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const metrics = await getAIMetrics()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Métriques IA</h1>
        <p className="text-finum-gray-600 mt-2">
          Utilisation et coûts des fonctionnalités d'intelligence artificielle
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Conversations</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{metrics.conversations}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-finum-blue" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Messages</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">{metrics.messages}</p>
            </div>
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Cache Hit Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics.cacheHitRate}%</p>
            </div>
            <Zap className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-finum-gray-500 mt-2">{metrics.cacheLogs} hits</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-finum-gray-600">Coût Estimé</p>
              <p className="text-3xl font-bold text-finum-gray-900 mt-2">
                ${metrics.estimatedCost.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-finum-gray-400" />
          </div>
          <p className="text-xs text-finum-gray-500 mt-2">Depuis le début</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Répartition des Coûts</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-finum-gray-700">Chat Messages (Sonnet 3.5)</span>
                <span className="text-sm font-semibold text-finum-gray-900">
                  ~${(metrics.messages * 2500 * 0.000003).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-finum-gray-200 rounded-full h-2">
                <div className="bg-finum-blue h-2 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-finum-gray-700">Embeddings (OpenAI)</span>
                <span className="text-sm font-semibold text-finum-gray-900">~$0.50</span>
              </div>
              <div className="w-full bg-finum-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '20%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-finum-gray-700">Categorization (Haiku)</span>
                <span className="text-sm font-semibold text-finum-gray-900">~$0.30</span>
              </div>
              <div className="w-full bg-finum-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-finum-gray-200">
            <p className="text-sm text-finum-gray-600">
              💡 <strong>Optimisation:</strong> Le cache réduit les coûts d'environ {metrics.cacheHitRate}%.
              Pour 100 utilisateurs actifs, coût mensuel estimé: ~$21-25.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Usage */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Utilisation Récente</h2>
        </div>
        <div className="divide-y divide-finum-gray-200">
          {metrics.recentUsage.length === 0 ? (
            <p className="p-6 text-sm text-finum-gray-500">Aucune utilisation récente</p>
          ) : (
            metrics.recentUsage.map((message) => (
              <div key={message.id} className="p-4 hover:bg-finum-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-finum-gray-900">
                      {message.conversation.user.name}
                    </p>
                    <p className="text-xs text-finum-gray-500 mt-1">
                      {message.conversation.user.email}
                    </p>
                    <p className="text-sm text-finum-gray-700 mt-2 line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                  <span className="text-xs text-finum-gray-500 ml-4 whitespace-nowrap">
                    {new Date(message.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Recommandations</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Augmentez le TTL du cache pour les requêtes fréquentes (actuellement 1h pour weekly reviews)</li>
          <li>• Utilisez Haiku pour les tâches simples (categorization) au lieu de Sonnet</li>
          <li>• Implémentez le streaming pour réduire la latence perçue</li>
          <li>• Surveillez les utilisateurs avec usage élevé (rate limiting: 30 req/h)</li>
        </ul>
      </div>
    </div>
  )
}
