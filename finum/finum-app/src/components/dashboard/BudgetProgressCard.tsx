'use client'

interface BudgetProgressCardProps {
  name: string
  allocated: number
  spent: number
  currency?: string
}

export function BudgetProgressCard({
  name,
  allocated,
  spent,
  currency = 'EUR',
}: BudgetProgressCardProps) {
  const remaining = allocated - spent
  const percentage = (spent / allocated) * 100
  const isOver = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100

  const getStatusColor = () => {
    if (isOver) return 'bg-finum-red'
    if (isWarning) return 'bg-yellow-500'
    return 'bg-finum-green'
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-xl shadow-premium p-5 hover:shadow-premium-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-finum-dark">{name}</h4>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            isOver
              ? 'bg-finum-red/10 text-finum-red'
              : isWarning
              ? 'bg-yellow-500/10 text-yellow-600'
              : 'bg-finum-green/10 text-finum-green'
          }`}
        >
          {percentage.toFixed(0)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-2 bg-finum-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-finum-gray-600">Dépensé: </span>
          <span className="font-semibold text-finum-dark font-mono">
            {formatAmount(spent)}
          </span>
        </div>
        <div>
          <span className="text-finum-gray-600">Restant: </span>
          <span
            className={`font-semibold font-mono ${
              isOver ? 'text-finum-red' : 'text-finum-green'
            }`}
          >
            {formatAmount(remaining)}
          </span>
        </div>
      </div>

      {/* Allocated */}
      <div className="mt-2 pt-2 border-t border-finum-gray-100">
        <div className="text-xs text-finum-gray-500">
          Budget alloué:{' '}
          <span className="font-medium text-finum-gray-700 font-mono">
            {formatAmount(allocated)}
          </span>
        </div>
      </div>
    </div>
  )
}
