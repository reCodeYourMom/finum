'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { BudgetImportModal } from '@/components/dashboard/BudgetImportModal'
import { BudgetProgressCard } from '@/components/dashboard/BudgetProgressCard'
import { BucketFormModal } from '@/components/dashboard/BucketFormModal'

export default function BudgetPage() {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [buckets, setBuckets] = useState<any[]>([])
  const [isBucketsLoading, setIsBucketsLoading] = useState(true)
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
  const [editingBucket, setEditingBucket] = useState<any | null>(null)

  const loadBudgets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/budget')
      const data = await response.json()
      setBudgets(data.budgets || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Failed to load budgets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBuckets = async () => {
    setIsBucketsLoading(true)
    try {
      const response = await fetch('/api/buckets')
      const data = await response.json()
      setBuckets(data.buckets || [])
    } catch (error) {
      console.error('Failed to load buckets:', error)
    } finally {
      setIsBucketsLoading(false)
    }
  }

  useEffect(() => {
    loadBudgets()
    loadBuckets()
  }, [])

  const handleBucketSaved = () => {
    loadBuckets()
    loadBudgets()
  }

  const handleDeleteBucket = async (bucketId: string) => {
    const confirmed = confirm('Supprimer ce bucket ? Les transactions seront détachées.')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/buckets/${bucketId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur suppression')
      loadBuckets()
      loadBudgets()
    } catch (error) {
      console.error('Failed to delete bucket:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-finum-dark mb-2">Budgets</h1>
          <p className="text-finum-gray-600">
            Gestion de vos budgets et buckets
          </p>
        </div>
        <button
          onClick={() => setIsImportOpen(true)}
          className="flex items-center gap-2 bg-finum-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-finum-blue/90 transition-all hover:shadow-premium"
        >
          <Plus className="w-5 h-5" />
          Importer CSV
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Total Budgets
            </p>
            <p className="text-3xl font-bold text-finum-dark">
              {stats.totalBudgets}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Total Alloué
            </p>
            <p className="text-3xl font-bold text-finum-dark font-mono">
              {formatCurrency(stats.totalAllocated)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Total Dépensé
            </p>
            <p className="text-3xl font-bold text-finum-dark font-mono">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-finum-gray-200 rounded w-1/4 mx-auto mb-4" />
            <div className="h-4 bg-finum-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && budgets.length === 0 && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <p className="text-finum-gray-600 mb-2">
            Aucun budget pour le moment
          </p>
          <p className="text-sm text-finum-gray-500">
            Importez un fichier CSV pour commencer
          </p>
        </div>
      )}

      {/* Budgets List */}
      {!isLoading && budgets.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-finum-dark mb-4">
            Mes Budgets ({budgets.length})
          </h2>

          <div className="space-y-6">
            {budgets.map((budget) => (
              <div key={budget.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-finum-dark">
                      {budget.name}
                    </h3>
                    <p className="text-sm text-finum-gray-500">
                      {budget.period === 'monthly' && 'Budget mensuel'}
                      {budget.period === 'annual' && 'Budget annuel'}
                      {budget.period === 'goal' && 'Objectif'}
                      {budget.category && ` • ${budget.category}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-finum-dark font-mono">
                      {formatCurrency(parseFloat(budget.amount))}
                    </p>
                    <p className="text-sm text-finum-gray-500">
                      {budget.currency}
                    </p>
                  </div>
                </div>

                {/* Buckets */}
                {budget.buckets && budget.buckets.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budget.buckets.map((bucket: any) => (
                      <BudgetProgressCard
                        key={bucket.id}
                        name={bucket.name}
                        allocated={parseFloat(bucket.allocated)}
                        spent={parseFloat(bucket.spent)}
                        currency={budget.currency}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buckets Manager */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-finum-dark">
            Mes Buckets ({buckets.length})
          </h2>
          <button
            onClick={() => {
              setEditingBucket(null)
              setIsBucketModalOpen(true)
            }}
            className="flex items-center gap-2 bg-finum-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-finum-blue/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouveau bucket
          </button>
        </div>

        {isBucketsLoading && (
          <div className="bg-white rounded-xl shadow-premium p-6 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-finum-gray-200 rounded w-1/3 mx-auto mb-3" />
              <div className="h-4 bg-finum-gray-200 rounded w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {!isBucketsLoading && buckets.length === 0 && (
          <div className="bg-white rounded-xl shadow-premium p-8 text-center">
            <p className="text-finum-gray-600 mb-2">
              Aucun bucket pour le moment
            </p>
            <p className="text-sm text-finum-gray-500">
              Créez un bucket pour organiser vos dépenses
            </p>
          </div>
        )}

        {!isBucketsLoading && buckets.length > 0 && (
          <div className="bg-white rounded-xl shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Bucket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Alloué
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Dépensé
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Restant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-finum-gray-200">
                  {buckets.map((bucket) => {
                    const allocated = parseFloat(bucket.allocated || '0')
                    const spent = parseFloat(bucket.spent || '0')
                    const remaining = allocated - spent
                    return (
                      <tr
                        key={bucket.id}
                        className="hover:bg-finum-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-finum-dark">
                            {bucket.color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: bucket.color }}
                              />
                            )}
                            {bucket.name}
                          </div>
                          {bucket.category && (
                            <div className="text-xs text-finum-gray-500 mt-1">
                              {bucket.category}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-finum-gray-600">
                          {bucket.budget?.name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-finum-gray-600">
                          {bucket.period === 'monthly' ? 'Mensuel' : 'Annuel'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                          {formatCurrency(allocated)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                          {formatCurrency(spent)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                          {formatCurrency(remaining)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingBucket(bucket)
                                setIsBucketModalOpen(true)
                              }}
                              className="p-2 text-finum-gray-600 hover:text-finum-blue hover:bg-finum-blue/10 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBucket(bucket.id)}
                              className="p-2 text-finum-gray-600 hover:text-finum-red hover:bg-finum-red/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <BudgetImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={loadBudgets}
      />

      <BucketFormModal
        isOpen={isBucketModalOpen}
        onClose={() => setIsBucketModalOpen(false)}
        onSaved={handleBucketSaved}
        budgets={budgets}
        bucket={editingBucket}
      />
    </div>
  )
}
