import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MessageSquare, Bug, Lightbulb, Heart, MessageCircle } from 'lucide-react'

async function getFeedback() {
  const [allFeedback, stats, statusStats] = await Promise.all([
    prisma.userFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { name: true, email: true, image: true },
        },
      },
    }),
    prisma.userFeedback.groupBy({
      by: ['type'],
      _count: true,
    }),
    prisma.userFeedback.groupBy({
      by: ['status'],
      _count: true,
    }),
  ])

  return { allFeedback, stats, statusStats }
}

const feedbackIcons = {
  bug: Bug,
  feature: Lightbulb,
  praise: Heart,
  general: MessageCircle,
}

const feedbackColors = {
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-blue-100 text-blue-700',
  praise: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
}

const statusColors = {
  new: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default async function AdminFeedbackPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const { allFeedback, stats, statusStats } = await getFeedback()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-finum-gray-900">Feedback Utilisateurs</h1>
        <p className="text-finum-gray-600 mt-2">
          Gestion des retours utilisateurs (bugs, features, compliments)
        </p>
      </div>

      {/* Stats by Type */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = feedbackIcons[stat.type as keyof typeof feedbackIcons]
          return (
            <div key={stat.type} className="bg-white rounded-lg shadow p-6 border border-finum-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-finum-gray-600 capitalize">{stat.type}</p>
                  <p className="text-3xl font-bold text-finum-gray-900 mt-2">{stat._count}</p>
                </div>
                <Icon className="w-8 h-8 text-finum-gray-400" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats by Status */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Par Statut</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {statusStats.map((stat) => (
              <div key={stat.status} className="flex items-center justify-between">
                <span className="text-sm text-finum-gray-700 capitalize">{stat.status.replace('_', ' ')}</span>
                <span className="text-sm font-semibold text-finum-gray-900">{stat._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg shadow border border-finum-gray-200">
        <div className="p-6 border-b border-finum-gray-200">
          <h2 className="text-lg font-semibold text-finum-gray-900">Tous les Feedbacks</h2>
        </div>
        <div className="divide-y divide-finum-gray-200">
          {allFeedback.map((feedback) => {
            const Icon = feedbackIcons[feedback.type as keyof typeof feedbackIcons]
            return (
              <div key={feedback.id} className="p-6 hover:bg-finum-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {feedback.user.image ? (
                      <img
                        src={feedback.user.image}
                        alt={feedback.user.name || ''}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-finum-gray-200 flex items-center justify-center">
                        <span className="text-finum-gray-600 font-medium text-sm">
                          {feedback.user.name?.[0] || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${feedbackColors[feedback.type as keyof typeof feedbackColors]}`}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {feedback.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[feedback.status as keyof typeof statusColors]}`}>
                        {feedback.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-finum-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-finum-gray-900 mb-1">
                      {feedback.title}
                    </h3>

                    <p className="text-sm text-finum-gray-700 mb-2">
                      {feedback.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-finum-gray-500">
                      <span>{feedback.user.name}</span>
                      <span>•</span>
                      <span>{feedback.user.email}</span>
                      {feedback.page && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{feedback.page}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {allFeedback.length === 0 && (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-finum-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-finum-gray-600">Aucun feedback</p>
              <p className="text-sm text-finum-gray-500 mt-2">
                Les retours utilisateurs apparaîtront ici
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
