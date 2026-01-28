'use client'

import { useState, useEffect } from 'react'
import { Plus, Filter, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { TransactionImportModal } from '@/components/dashboard/TransactionImportModal'
import { RuleFormModal } from '@/components/dashboard/RuleFormModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function TransactionsPage() {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [buckets, setBuckets] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [unassigned, setUnassigned] = useState<any[]>([])
  const [isBucketsLoading, setIsBucketsLoading] = useState(true)
  const [isRulesLoading, setIsRulesLoading] = useState(true)
  const [isUnassignedLoading, setIsUnassignedLoading] = useState(true)
  const [assignments, setAssignments] = useState<
    Record<string, { bucketId: string; createRule: boolean; ruleType: 'merchant' | 'category' }>
  >({})
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any | null>(null)
  const [frictionTarget, setFrictionTarget] = useState<{
    transactionId: string
    bucketId: string
    bucketName: string
    amountEur: number
    allocated: number
    spent: number
  } | null>(null)
  const [frictionNote, setFrictionNote] = useState('')

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/transactions?take=100')
      const data = await response.json()
      setTransactions(data.transactions || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Failed to load transactions:', error)
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

  const loadRules = async () => {
    setIsRulesLoading(true)
    try {
      const response = await fetch('/api/rules')
      const data = await response.json()
      setRules(data.rules || [])
    } catch (error) {
      console.error('Failed to load rules:', error)
    } finally {
      setIsRulesLoading(false)
    }
  }

  const loadUnassigned = async () => {
    setIsUnassignedLoading(true)
    try {
      const response = await fetch('/api/transactions/unassigned?limit=20')
      const data = await response.json()
      setUnassigned(data.transactions || [])
    } catch (error) {
      console.error('Failed to load unassigned transactions:', error)
    } finally {
      setIsUnassignedLoading(false)
    }
  }

  const handleImportComplete = () => {
    loadTransactions()
    loadUnassigned()
  }

  useEffect(() => {
    loadTransactions()
    loadBuckets()
    loadRules()
    loadUnassigned()
  }, [])

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatRuleType = (type: string) => {
    switch (type) {
      case 'merchant':
        return 'Marchand'
      case 'category':
        return 'Catégorie'
      case 'amount_range':
        return 'Montant'
      case 'merchant_category':
        return 'Marchand + Catégorie'
      default:
        return type
    }
  }

  const formatRuleCondition = (rule: any) => {
    const condition = rule.condition || {}
    switch (rule.type) {
      case 'merchant':
        return `Marchand = ${condition.merchant || '—'}`
      case 'category':
        return `Catégorie = ${condition.category || '—'}`
      case 'amount_range': {
        const min = condition.minAmount !== undefined ? condition.minAmount : '—'
        const max = condition.maxAmount !== undefined ? condition.maxAmount : '—'
        return `Montant entre ${min} et ${max}`
      }
      case 'merchant_category':
        return `Marchand contient ${condition.merchantContains || '—'} • Catégorie ${
          condition.category || '—'
        }`
      default:
        return '—'
    }
  }

  const getAmountEur = (tx: any) => {
    if (tx.amountEur !== undefined && tx.amountEur !== null) {
      return parseFloat(tx.amountEur)
    }
    return parseFloat(tx.amount)
  }

  const submitAssignment = async (transactionId: string, justification?: string) => {
    const selection = assignments[transactionId]
    if (!selection?.bucketId) {
      setAssignmentError('Sélectionnez un bucket pour assigner')
      return
    }

    setAssignmentError(null)
    setAssigning((prev) => ({ ...prev, [transactionId]: true }))

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketId: selection.bucketId,
          createRule: selection.createRule,
          ruleType: selection.ruleType,
          justification,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'assignation")
      }

      if (data.ruleError) {
        setAssignmentError(data.ruleError)
      }

      setAssignments((prev) => {
        const next = { ...prev }
        delete next[transactionId]
        return next
      })

      loadUnassigned()
      loadTransactions()
      if (selection.createRule) {
        loadRules()
      }
    } catch (error: any) {
      setAssignmentError(error.message)
    } finally {
      setAssigning((prev) => ({ ...prev, [transactionId]: false }))
    }
  }

  const handleAssign = async (tx: any) => {
    const selection = assignments[tx.id]
    if (!selection?.bucketId) {
      setAssignmentError('Sélectionnez un bucket pour assigner')
      return
    }

    const bucket = buckets.find((b) => b.id === selection.bucketId)
    if (bucket) {
      const amountEur = getAmountEur(tx)
      const allocated = parseFloat(bucket.allocated || '0')
      const spent = parseFloat(bucket.spent || '0')
      const willSpend = spent + amountEur

      if (allocated > 0 && willSpend > allocated) {
        setFrictionTarget({
          transactionId: tx.id,
          bucketId: bucket.id,
          bucketName: bucket.name,
          amountEur,
          allocated,
          spent,
        })
        setFrictionNote('')
        return
      }
    }

    await submitAssignment(tx.id)
  }

  const handleDeleteRule = async (ruleId: string) => {
    const confirmed = confirm('Supprimer cette règle ?')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur suppression')
      loadRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  const getAssignment = (transactionId: string) => {
    return (
      assignments[transactionId] || {
        bucketId: '',
        createRule: false,
        ruleType: 'merchant' as const,
      }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-finum-dark mb-2">
            Transactions
          </h1>
          <p className="text-finum-gray-600">Historique de vos transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-finum-gray-700 px-4 py-2 border border-finum-gray-300 rounded-lg font-medium hover:bg-finum-gray-50 transition-colors">
            <Filter className="w-5 h-5" />
            Filtrer
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 bg-finum-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-finum-blue/90 transition-all hover:shadow-premium"
          >
            <Plus className="w-5 h-5" />
            Importer CSV
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Total Transactions
            </p>
            <p className="text-3xl font-bold text-finum-dark">
              {stats.totalCount}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Montant Total
            </p>
            <p className="text-3xl font-bold text-finum-dark font-mono">
              {formatCurrency(stats.totalAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Montant Moyen
            </p>
            <p className="text-3xl font-bold text-finum-dark font-mono">
              {formatCurrency(stats.avgAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-premium p-6">
            <p className="text-sm font-medium text-finum-gray-600 mb-2">
              Plus Grande Transaction
            </p>
            <p className="text-3xl font-bold text-finum-dark font-mono">
              {formatCurrency(stats.maxAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Unassigned Transactions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-finum-dark">
              Transactions à assigner ({unassigned.length})
            </h2>
            <p className="text-sm text-finum-gray-500">
              Assignez un bucket et créez une règle si besoin
            </p>
          </div>
          <button
            onClick={loadUnassigned}
            className="flex items-center gap-2 text-finum-gray-700 px-3 py-2 border border-finum-gray-300 rounded-lg font-medium hover:bg-finum-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
        </div>

        {assignmentError && (
          <div className="bg-finum-red/10 border border-finum-red/20 rounded-lg p-3 text-sm text-finum-red mb-4">
            {assignmentError}
          </div>
        )}

        {!isBucketsLoading && buckets.length === 0 && (
          <div className="bg-finum-blue/5 border border-finum-blue/20 rounded-lg p-3 text-sm text-finum-blue mb-4">
            Créez au moins un bucket pour activer l'assignation.
          </div>
        )}

        {isUnassignedLoading && (
          <div className="bg-white rounded-xl shadow-premium p-6 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-finum-gray-200 rounded w-1/3 mx-auto mb-3" />
              <div className="h-4 bg-finum-gray-200 rounded w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {!isUnassignedLoading && unassigned.length === 0 && (
          <div className="bg-white rounded-xl shadow-premium p-6 text-center">
            <p className="text-finum-gray-600">
              Toutes les transactions sont assignées 🎉
            </p>
          </div>
        )}

        {!isUnassignedLoading && unassigned.length > 0 && (
          <div className="bg-white rounded-xl shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Marchand
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Assignation
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-finum-gray-200">
                  {unassigned.map((tx) => {
                    const selection = getAssignment(tx.id)
                    return (
                      <tr key={tx.id} className="hover:bg-finum-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900">
                          {format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-finum-dark">
                            {tx.merchant}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-finum-dark">
                          {formatCurrency(parseFloat(tx.amount), tx.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-600">
                          {tx.category || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <select
                              value={selection.bucketId}
                              onChange={(e) =>
                                setAssignments((prev) => ({
                                  ...prev,
                                  [tx.id]: {
                                    ...selection,
                                    bucketId: e.target.value,
                                  },
                                }))
                              }
                              disabled={isBucketsLoading || buckets.length === 0}
                              className="w-full px-3 py-2 border border-finum-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue disabled:bg-finum-gray-50"
                            >
                              <option value=\"\">Sélectionner un bucket</option>
                              {buckets.map((bucket) => (
                                <option key={bucket.id} value={bucket.id}>
                                  {bucket.name}
                                </option>
                              ))}
                            </select>

                            <label className="flex items-center gap-2 text-xs text-finum-gray-600">
                              <input
                                type="checkbox"
                                checked={selection.createRule}
                                onChange={(e) =>
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [tx.id]: {
                                      ...selection,
                                      createRule: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              Créer une règle automatiquement
                            </label>

                            {selection.createRule && (
                              <select
                                value={selection.ruleType}
                                onChange={(e) =>
                                  setAssignments((prev) => ({
                                    ...prev,
                                    [tx.id]: {
                                      ...selection,
                                      ruleType: e.target.value as 'merchant' | 'category',
                                    },
                                  }))
                                }
                                className="w-full px-3 py-2 border border-finum-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                              >
                                <option value="merchant">Marchand</option>
                                <option value="category">Catégorie</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleAssign(tx)}
                            disabled={assigning[tx.id] || !selection.bucketId}
                            className="px-4 py-2 bg-finum-blue text-white rounded-lg text-sm font-medium hover:bg-finum-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assigning[tx.id] ? 'Assignation...' : 'Assigner'}
                          </button>
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
      {!isLoading && transactions.length === 0 && (
        <div className="bg-white rounded-xl shadow-premium p-8 text-center">
          <p className="text-finum-gray-600 mb-2">
            Aucune transaction pour le moment
          </p>
          <p className="text-sm text-finum-gray-500">
            Importez un fichier CSV pour commencer
          </p>
        </div>
      )}

      {/* Transactions Table */}
      {!isLoading && transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Marchand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                    Bucket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finum-gray-200">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-finum-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-finum-gray-900">
                      {format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-finum-dark">
                        {tx.merchant}
                      </div>
                      {tx.isRecurring && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-finum-blue/10 text-finum-blue">
                          Récurrent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-finum-gray-600">
                      {tx.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-finum-gray-100 text-finum-gray-800">
                          {tx.category}
                        </span>
                      ) : (
                        <span className="text-sm text-finum-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-semibold text-finum-dark">
                      {formatCurrency(parseFloat(tx.amount), tx.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-finum-gray-600">
                      {tx.bucket?.name || (
                        <span className="text-finum-gray-400">Non assigné</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {transactions.length >= 100 && (
            <div className="bg-finum-gray-50 px-6 py-4 flex items-center justify-between border-t border-finum-gray-200">
              <p className="text-sm text-finum-gray-600">
                Affichage de 100 transactions sur {stats?.totalCount}
              </p>
              <button className="text-sm font-medium text-finum-blue hover:text-finum-blue/80">
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rules Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-finum-dark">
              Règles d'assignation ({rules.length})
            </h2>
            <p className="text-sm text-finum-gray-500">
              Priorité élevée = appliquée en premier
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadRules}
              className="flex items-center gap-2 text-finum-gray-700 px-3 py-2 border border-finum-gray-300 rounded-lg font-medium hover:bg-finum-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
            <button
              onClick={() => {
                setEditingRule(null)
                setIsRuleModalOpen(true)
              }}
              className="flex items-center gap-2 bg-finum-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-finum-blue/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouvelle règle
            </button>
          </div>
        </div>

        {isRulesLoading && (
          <div className="bg-white rounded-xl shadow-premium p-6 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-finum-gray-200 rounded w-1/3 mx-auto mb-3" />
              <div className="h-4 bg-finum-gray-200 rounded w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {!isRulesLoading && rules.length === 0 && (
          <div className="bg-white rounded-xl shadow-premium p-6 text-center">
            <p className="text-finum-gray-600 mb-2">Aucune règle définie</p>
            <p className="text-sm text-finum-gray-500">
              Créez une règle pour assigner automatiquement vos transactions
            </p>
          </div>
        )}

        {!isRulesLoading && rules.length > 0 && (
          <div className="bg-white rounded-xl shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-finum-gray-50 border-b border-finum-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Bucket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Priorité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-finum-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-finum-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-finum-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-finum-dark font-medium">
                        {rule.bucket?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-finum-gray-600">
                        {formatRuleType(rule.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-finum-gray-600">
                        {formatRuleCondition(rule)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-finum-dark">
                        {rule.priority ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingRule(rule)
                              setIsRuleModalOpen(true)
                            }}
                            className="p-2 text-finum-gray-600 hover:text-finum-blue hover:bg-finum-blue/10 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-finum-gray-600 hover:text-finum-red hover:bg-finum-red/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <TransactionImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />

      <RuleFormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSaved={loadRules}
        buckets={buckets}
        rule={editingRule}
      />

      {frictionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-premium-lg w-full max-w-lg mx-4">
            <div className="p-6 border-b border-finum-gray-200">
              <h3 className="text-lg font-bold text-finum-dark">
                Depassement de budget
              </h3>
              <p className="text-sm text-finum-gray-500 mt-1">
                Ce bucket depasse le budget alloue. Une justification est requise.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-finum-gray-50 rounded-lg p-4 text-sm text-finum-gray-700 space-y-1">
                <div>
                  Bucket: <span className="font-medium">{frictionTarget.bucketName}</span>
                </div>
                <div>
                  Depense actuelle:{' '}
                  <span className="font-medium">
                    {formatCurrency(frictionTarget.spent)}
                  </span>
                </div>
                <div>
                  Transaction:{' '}
                  <span className="font-medium">
                    {formatCurrency(frictionTarget.amountEur)}
                  </span>
                </div>
                <div>
                  Nouveau total:{' '}
                  <span className="font-medium">
                    {formatCurrency(frictionTarget.spent + frictionTarget.amountEur)}
                  </span>
                </div>
                <div>
                  Budget alloue:{' '}
                  <span className="font-medium">
                    {formatCurrency(frictionTarget.allocated)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-finum-gray-700 mb-2">
                  Justification
                </label>
                <textarea
                  value={frictionNote}
                  onChange={(e) => setFrictionNote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                  placeholder="Expliquez la raison du depassement..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-finum-gray-200">
              <button
                onClick={() => {
                  setFrictionTarget(null)
                  setFrictionNote('')
                }}
                className="px-4 py-2 text-finum-gray-700 hover:bg-finum-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!frictionTarget) return
                  const note = frictionNote.trim()
                  if (!note) return
                  const transactionId = frictionTarget.transactionId
                  setFrictionTarget(null)
                  setFrictionNote('')
                  await submitAssignment(transactionId, note)
                }}
                disabled={!frictionNote.trim()}
                className="px-6 py-2 bg-finum-red text-white rounded-lg font-medium hover:bg-finum-red/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
