'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ChatInterface from '@/components/coach/ChatInterface'

interface WeeklyReview {
  period: {
    start: string
    end: string
    nextReviewDate: string
    daysCovered: number
  }
  totals: {
    spent: number
    avgDaily: number
    transactionCount: number
  }
  topCategories: Array<{ category: string; spent: number }>
  unassignedCount: number
  overspentBuckets: Array<{
    id: string
    name: string
    allocated: number
    spent: number
    percentUsed: number
  }>
  warningBuckets: Array<{
    id: string
    name: string
    allocated: number
    spent: number
    percentUsed: number
  }>
  patterns: {
    total: number
    detected: number
    budgeted: number
    ignored: number
    blindSpots: number
  }
  recommendations: string[]
  lastReview: {
    date: string
    action: string
    justification: string | null
  } | null
}

export default function CoachPage() {
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadReview = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true)
      const response = await fetch(`/api/coach/weekly?refresh=${refresh}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement de la revue')
      }
      setReview(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadReview(true)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const submitDecision = async (action: 'accepted' | 'deferred') => {
    if (!review) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/coach/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          justification: note || undefined,
          periodStart: review.period.start,
          periodEnd: review.period.end,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      await loadReview(false)
      setNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-finum-dark mb-2">Coach</h1>
          <p className="text-finum-gray-600">Revue hebdomadaire et discipline budgetaire</p>
        </div>
        <button
          onClick={() => loadReview(true)}
          className="flex items-center gap-2 text-finum-gray-700 px-4 py-2 border border-finum-gray-300 rounded-lg font-medium hover:bg-finum-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Rafraichir
        </button>
      </div>

      {error && (
        <div className="bg-finum-red/10 border border-finum-red/20 rounded-lg p-4 text-sm text-finum-red mb-6">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-finum-gray-200 rounded w-1/4 mx-auto mb-4" />
            <div className="h-4 bg-finum-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {!isLoading && review && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-premium p-6">
              <p className="text-sm font-medium text-finum-gray-600 mb-2">Depense semaine</p>
              <p className="text-3xl font-bold text-finum-dark font-mono">
                {formatCurrency(review.totals.spent)}
              </p>
              <p className="text-xs text-finum-gray-500 mt-1">
                {review.totals.transactionCount} transactions
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-premium p-6">
              <p className="text-sm font-medium text-finum-gray-600 mb-2">Moyenne/jour</p>
              <p className="text-3xl font-bold text-finum-dark font-mono">
                {formatCurrency(review.totals.avgDaily)}
              </p>
              <p className="text-xs text-finum-gray-500 mt-1">
                {review.period.daysCovered} jours couverts
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-premium p-6">
              <p className="text-sm font-medium text-finum-gray-600 mb-2">Angles morts</p>
              <p className="text-3xl font-bold text-finum-dark">
                {review.patterns.blindSpots}
              </p>
              <p className="text-xs text-finum-gray-500 mt-1">
                Patterns non assignes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-premium p-6">
              <h2 className="text-lg font-bold text-finum-dark mb-4">Alertes</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-finum-gray-600">Transactions non assignees</span>
                  <span className="font-semibold text-finum-dark">
                    {review.unassignedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-finum-gray-600">Buckets en depassement</span>
                  <span className="font-semibold text-finum-dark">
                    {review.overspentBuckets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-finum-gray-600">Buckets sous surveillance</span>
                  <span className="font-semibold text-finum-dark">
                    {review.warningBuckets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-finum-gray-600">Patterns detectes</span>
                  <span className="font-semibold text-finum-dark">
                    {review.patterns.detected}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-premium p-6">
              <h2 className="text-lg font-bold text-finum-dark mb-4">Top categories</h2>
              <div className="space-y-3">
                {review.topCategories.length === 0 && (
                  <p className="text-sm text-finum-gray-500">Aucune depense cette semaine</p>
                )}
                {review.topCategories.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-finum-gray-600">{cat.category}</span>
                    <span className="font-semibold text-finum-dark font-mono">
                      {formatCurrency(cat.spent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-premium p-6">
            <h2 className="text-lg font-bold text-finum-dark mb-4">Recommandations</h2>
            <ul className="space-y-2 text-sm text-finum-gray-600">
              {review.recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-premium p-6">
            <h2 className="text-lg font-bold text-finum-dark mb-4">Decision hebdomadaire</h2>
            {review.lastReview && (
              <div className="text-sm text-finum-gray-600 mb-4">
                Derniere revue le{' '}
                {format(new Date(review.lastReview.date), 'dd MMM yyyy', { locale: fr })}
                {review.lastReview.justification && (
                  <div className="mt-2 text-xs text-finum-gray-500">
                    Note: {review.lastReview.justification}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="Note ou justification (optionnelle)"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => submitDecision('accepted')}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-finum-green text-white rounded-lg font-medium hover:bg-finum-green/90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Valider la revue
                </button>
                <button
                  onClick={() => submitDecision('deferred')}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 border border-finum-gray-300 text-finum-gray-700 rounded-lg font-medium hover:bg-finum-gray-50 transition-colors disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  Reporter
                </button>
              </div>

              <div className="text-xs text-finum-gray-500">
                Prochaine revue: {format(new Date(review.period.nextReviewDate), 'dd MMM yyyy', {
                  locale: fr,
                })}
              </div>
            </div>
          </div>
          </div>

          {/* Chat Interface (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 h-[calc(100vh-8rem)]">
              <ChatInterface />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
