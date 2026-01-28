'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, EyeOff, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PatternItem {
  id: string
  merchantNorm: string
  frequency: 'weekly' | 'monthly' | 'quarterly'
  avgAmount: number
  projectedAnnual: number
  status: 'detected' | 'budgeted' | 'ignored'
  transactionCount: number
  totalSpent: number
  unassignedCount: number
  lastTransactionDate: string | null
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternItem[]>([])
  const [blindSpots, setBlindSpots] = useState<PatternItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPatterns = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true)
      const response = await fetch(`/api/patterns?refresh=${refresh}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement des patterns')
      }
      setPatterns(data.patterns || [])
      setBlindSpots(data.blindSpots || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadPatterns(true)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatFrequency = (frequency: PatternItem['frequency']) => {
    switch (frequency) {
      case 'weekly':
        return 'Hebdo'
      case 'monthly':
        return 'Mensuel'
      case 'quarterly':
        return 'Trimestriel'
      default:
        return frequency
    }
  }

  const formatMerchant = (merchant: string) => {
    return merchant
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleStatusUpdate = async (
    patternId: string,
    status: 'detected' | 'budgeted' | 'ignored'
  ) => {
    try {
      const response = await fetch(`/api/patterns/${patternId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise a jour')
      }
      await loadPatterns(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalProjected = patterns.reduce(
    (sum, pattern) => sum + (pattern.projectedAnnual || 0),
    0
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-finum-dark mb-2">Patterns</h1>
          <p className="text-finum-gray-600">Detection des depenses recurrentes</p>
        </div>
        <button
          onClick={() => loadPatterns(true)}
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-premium p-6">
          <p className="text-sm font-medium text-finum-gray-600 mb-2">Patterns detectes</p>
          <p className="text-3xl font-bold text-finum-dark">{patterns.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-premium p-6">
          <p className="text-sm font-medium text-finum-gray-600 mb-2">
            Projection annuelle
          </p>
          <p className="text-3xl font-bold text-finum-dark font-mono">
            {formatCurrency(totalProjected)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-premium p-6">
          <p className="text-sm font-medium text-finum-gray-600 mb-2">Angles morts</p>
          <p className="text-3xl font-bold text-finum-dark">{blindSpots.length}</p>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-finum-gray-200 rounded w-1/4 mx-auto mb-4" />
            <div className="h-4 bg-finum-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {!isLoading && patterns.length === 0 && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <p className="text-finum-gray-600">Aucun pattern detecte</p>
          <p className="text-sm text-finum-gray-500 mt-2">
            Importez des transactions pour lancer la detection
          </p>
        </div>
      )}

      {!isLoading && patterns.length > 0 && (
        <div className="bg-white rounded-xl shadow-premium overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Marchand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Frequence
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Moyenne
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Projection annuelle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Derniere transaction
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finum-gray-200">
                {patterns.map((pattern) => (
                  <tr key={pattern.id} className="hover:bg-finum-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-finum-dark">
                        {formatMerchant(pattern.merchantNorm)}
                      </div>
                      <div className="text-xs text-finum-gray-500">
                        {pattern.transactionCount} transaction(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-finum-gray-600">
                      {formatFrequency(pattern.frequency)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                      {formatCurrency(pattern.avgAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                      {formatCurrency(pattern.projectedAnnual)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-finum-gray-600">
                      {pattern.lastTransactionDate
                        ? format(new Date(pattern.lastTransactionDate), 'dd MMM yyyy', {
                            locale: fr,
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          pattern.status === 'budgeted'
                            ? 'bg-finum-green/10 text-finum-green'
                            : pattern.status === 'ignored'
                            ? 'bg-finum-gray-100 text-finum-gray-600'
                            : 'bg-finum-blue/10 text-finum-blue'
                        }`}
                      >
                        {pattern.status === 'budgeted'
                          ? 'Budgete'
                          : pattern.status === 'ignored'
                          ? 'Ignore'
                          : 'Detecte'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pattern.status !== 'budgeted' && (
                          <button
                            onClick={() => handleStatusUpdate(pattern.id, 'budgeted')}
                            className="p-2 text-finum-gray-600 hover:text-finum-green hover:bg-finum-green/10 rounded-lg transition-colors"
                            title="Marquer comme budgete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {pattern.status !== 'ignored' && (
                          <button
                            onClick={() => handleStatusUpdate(pattern.id, 'ignored')}
                            className="p-2 text-finum-gray-600 hover:text-finum-red hover:bg-finum-red/10 rounded-lg transition-colors"
                            title="Ignorer"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blind spots */}
      {!isLoading && blindSpots.length > 0 && (
        <div className="bg-white rounded-xl shadow-premium overflow-hidden">
          <div className="px-6 py-4 border-b border-finum-gray-200">
            <h2 className="text-lg font-bold text-finum-dark">Angles morts</h2>
            <p className="text-sm text-finum-gray-500">
              Patterns detectes avec transactions non assignees
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Marchand
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Depensee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Non assignees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Projection annuelle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finum-gray-200">
                {blindSpots.map((pattern) => (
                  <tr key={pattern.id} className="hover:bg-finum-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-finum-dark">
                      {formatMerchant(pattern.merchantNorm)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                      {formatCurrency(pattern.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                      {pattern.unassignedCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                      {formatCurrency(pattern.projectedAnnual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
