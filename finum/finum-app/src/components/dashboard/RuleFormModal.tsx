'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface RuleFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  buckets: any[]
  rule?: any | null
}

type RuleType = 'merchant' | 'category' | 'amount_range' | 'merchant_category'

export function RuleFormModal({
  isOpen,
  onClose,
  onSaved,
  buckets,
  rule,
}: RuleFormModalProps) {
  const [bucketId, setBucketId] = useState('')
  const [type, setType] = useState<RuleType>('merchant')
  const [priority, setPriority] = useState('0')
  const [merchant, setMerchant] = useState('')
  const [merchantContains, setMerchantContains] = useState('')
  const [category, setCategory] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!rule

  useEffect(() => {
    if (!isOpen) return

    setBucketId(rule?.bucketId || '')
    setType(rule?.type || 'merchant')
    setPriority(rule?.priority?.toString() || '0')

    const condition = rule?.condition || {}
    setMerchant(condition.merchant || '')
    setMerchantContains(condition.merchantContains || '')
    setCategory(condition.category || '')
    setMinAmount(condition.minAmount !== undefined ? String(condition.minAmount) : '')
    setMaxAmount(condition.maxAmount !== undefined ? String(condition.maxAmount) : '')

    setError(null)
  }, [isOpen, rule])

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const buildCondition = () => {
    if (type === 'merchant') {
      return { merchant }
    }
    if (type === 'category') {
      return { category }
    }
    if (type === 'amount_range') {
      return {
        ...(minAmount !== '' && { minAmount: parseFloat(minAmount) }),
        ...(maxAmount !== '' && { maxAmount: parseFloat(maxAmount) }),
      }
    }
    return {
      ...(merchantContains && { merchantContains }),
      ...(category && { category }),
    }
  }

  const handleSubmit = async () => {
    if (!bucketId) {
      setError('Bucket requis')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const payload: any = {
        bucketId,
        type,
        condition: buildCondition(),
        priority: priority ? parseInt(priority, 10) : 0,
      }

      const response = await fetch(
        isEditing ? `/api/rules/${rule.id}` : '/api/rules',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      onSaved()
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-premium-lg w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-finum-gray-200">
          <h2 className="text-xl font-bold text-finum-dark">
            {isEditing ? 'Modifier une règle' : 'Créer une règle'}
          </h2>
          <button
            onClick={handleClose}
            className="text-finum-gray-500 hover:text-finum-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Bucket
              </label>
              <select
                value={bucketId}
                onChange={(e) => setBucketId(e.target.value)}
                disabled={isEditing}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue disabled:bg-finum-gray-50"
              >
                <option value="">Sélectionner un bucket</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Type de règle
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RuleType)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
              >
                <option value="merchant">Marchand exact</option>
                <option value="category">Catégorie</option>
                <option value="amount_range">Montant (intervalle)</option>
                <option value="merchant_category">Marchand + catégorie</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Priorité
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
              />
            </div>
          </div>

          {/* Conditions */}
          {type === 'merchant' && (
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Marchand exact
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="Netflix"
              />
            </div>
          )}

          {type === 'category' && (
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="Loisirs"
              />
            </div>
          )}

          {type === 'amount_range' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                  Montant min
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                  Montant max
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                  placeholder="100"
                />
              </div>
            </div>
          )}

          {type === 'merchant_category' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                  Marchand contient
                </label>
                <input
                  type="text"
                  value={merchantContains}
                  onChange={(e) => setMerchantContains(e.target.value)}
                  className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                  placeholder="Uber"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                  placeholder="Transport"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-finum-red/10 border border-finum-red/20 rounded-lg p-3 text-sm text-finum-red">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-finum-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-finum-gray-700 hover:bg-finum-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-finum-blue text-white rounded-lg font-medium hover:bg-finum-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? 'Sauvegarde...'
              : isEditing
              ? 'Mettre à jour'
              : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
