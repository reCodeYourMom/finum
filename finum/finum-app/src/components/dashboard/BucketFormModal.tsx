'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BucketFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  budgets: any[]
  bucket?: any | null
}

export function BucketFormModal({
  isOpen,
  onClose,
  onSaved,
  budgets,
  bucket,
}: BucketFormModalProps) {
  const [name, setName] = useState('')
  const [allocated, setAllocated] = useState('')
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [budgetId, setBudgetId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!bucket

  useEffect(() => {
    if (!isOpen) return

    setName(bucket?.name || '')
    setAllocated(bucket?.allocated ? String(bucket.allocated) : '')
    setPeriod(bucket?.period || 'monthly')
    setCategory(bucket?.category || '')
    setColor(bucket?.color || '')
    setBudgetId(bucket?.budgetId || '')
    setError(null)
  }, [isOpen, bucket])

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!name || !allocated) {
      setError('Nom et montant requis')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const payload: any = {
        name,
        allocated: parseFloat(allocated),
        period,
        category: category || undefined,
        color: color || undefined,
        budgetId: budgetId || undefined,
      }

      const response = await fetch(
        isEditing ? `/api/buckets/${bucket.id}` : '/api/buckets',
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
      <div className="bg-white rounded-xl shadow-premium-lg w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-finum-gray-200">
          <h2 className="text-xl font-bold text-finum-dark">
            {isEditing ? 'Modifier le bucket' : 'Créer un bucket'}
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
          <div>
            <label className="block text-sm font-medium text-finum-gray-700 mb-1">
              Nom du bucket
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
              placeholder="Ex: Alimentation"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Montant alloué (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={allocated}
                onChange={(e) => setAllocated(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Période
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'annual')}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
              >
                <option value="monthly">Mensuel</option>
                <option value="annual">Annuel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-finum-gray-700 mb-1">
              Budget associé (optionnel)
            </label>
            <select
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
              className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
            >
              <option value="">Aucun budget</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Catégorie (optionnel)
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="Loisirs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-finum-gray-700 mb-1">
                Couleur (optionnel)
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-2 border border-finum-gray-300 rounded-lg focus:ring-2 focus:ring-finum-blue/20 focus:border-finum-blue"
                placeholder="#3B82F6"
              />
            </div>
          </div>

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
