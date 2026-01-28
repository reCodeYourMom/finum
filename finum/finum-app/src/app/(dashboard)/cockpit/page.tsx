'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { BudgetProgressCard } from '@/components/dashboard/BudgetProgressCard'
import { SpendingTrendChart } from '@/components/charts/SpendingTrendChart'

export default function CockpitPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCockpitData = async () => {
    try {
      const response = await fetch('/api/cockpit')
      const cockpitData = await response.json()
      setData(cockpitData)
    } catch (error) {
      console.error('Failed to load cockpit data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCockpitData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-premium p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-finum-gray-200 rounded w-1/4 mx-auto mb-4" />
          <div className="h-4 bg-finum-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-premium p-8 text-center">
        <AlertCircle className="w-12 h-12 text-finum-gray-400 mx-auto mb-4" />
        <p className="text-finum-gray-600">
          Aucune donnée disponible
        </p>
        <p className="text-sm text-finum-gray-500 mt-2">
          Importez des budgets et des transactions pour voir votre tableau de bord
        </p>
      </div>
    )
  }

  const { runRate, trends, health, budgetVsActual } = data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-finum-dark mb-2">Cockpit</h1>
        <p className="text-finum-gray-600">
          Vue d'ensemble de votre trésorerie
        </p>
      </div>

      {/* Health Score */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-finum-blue to-finum-blue/80 rounded-xl shadow-premium-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 mb-2">Score de Santé Financière</p>
              <p className="text-5xl font-bold font-mono">{health}/100</p>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-2">
                {health >= 80 ? '🎉' : health >= 60 ? '👍' : health >= 40 ? '⚠️' : '🚨'}
              </div>
              <p className="text-white/80 text-sm">
                {health >= 80
                  ? 'Excellent'
                  : health >= 60
                  ? 'Bon'
                  : health >= 40
                  ? 'À surveiller'
                  : 'Critique'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Run-rate quotidien"
          value={formatCurrency(runRate.runRate.daily)}
          subtitle={`Jour ${runRate.monthToDate.dayOfMonth}/${runRate.monthToDate.daysInMonth}`}
          icon={Calendar}
          color="blue"
        />
        <MetricCard
          title="Projection fin de mois"
          value={formatCurrency(runRate.runRate.projectedEOM)}
          subtitle="Basé sur tendance actuelle"
          icon={TrendingUp}
          color={
            runRate.runRate.projectedEOM > runRate.budget.totalMonthly
              ? 'red'
              : 'green'
          }
        />
        <MetricCard
          title="Budget mensuel"
          value={formatCurrency(runRate.budget.totalMonthly)}
          subtitle={`${runRate.budget.percentUsed.toFixed(0)}% utilisé`}
          icon={Wallet}
          color="gray"
        />
        <MetricCard
          title="Runway"
          value={
            runRate.runway.months === Infinity
              ? '∞'
              : `${runRate.runway.months.toFixed(1)} mois`
          }
          subtitle={`Cash: ${formatCurrency(runRate.runway.withCurrentCash)}`}
          icon={TrendingDown}
          color={
            runRate.runway.months < 3
              ? 'red'
              : runRate.runway.months < 6
              ? 'gray'
              : 'green'
          }
        />
      </div>

      {/* Spending This Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* MTD Spending */}
        <div className="bg-white rounded-xl shadow-premium p-6">
          <h3 className="text-lg font-bold text-finum-dark mb-4">
            Dépenses MTD
          </h3>
          <div className="mb-4">
            <p className="text-4xl font-bold text-finum-dark font-mono">
              {formatCurrency(runRate.monthToDate.spent)}
            </p>
            <p className="text-sm text-finum-gray-500 mt-1">
              Dépensé ce mois-ci
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-finum-gray-600">Budget restant</span>
              <span className="font-semibold text-finum-dark font-mono">
                {formatCurrency(runRate.budget.remaining)}
              </span>
            </div>
            <div className="h-2 bg-finum-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  runRate.budget.percentUsed >= 100
                    ? 'bg-finum-red'
                    : runRate.budget.percentUsed >= 80
                    ? 'bg-yellow-500'
                    : 'bg-finum-green'
                }`}
                style={{
                  width: `${Math.min(runRate.budget.percentUsed, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-premium p-6">
          <h3 className="text-lg font-bold text-finum-dark mb-4">
            Top Catégories de Dépenses
          </h3>
          <div className="space-y-3">
            {runRate.topCategories.map((cat: any, index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-finum-dark">
                    {cat.category}
                  </span>
                  <span className="text-sm font-mono font-semibold text-finum-dark">
                    {formatCurrency(cat.spent)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-finum-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-finum-blue"
                      style={{ width: `${cat.percentOfTotal}%` }}
                    />
                  </div>
                  <span className="text-xs text-finum-gray-500 min-w-[40px] text-right">
                    {cat.percentOfTotal.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget vs Actual */}
      {budgetVsActual && budgetVsActual.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-finum-dark mb-4">
            Budget vs Réel
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetVsActual.map((bucket: any) => (
              <BudgetProgressCard
                key={bucket.id}
                name={bucket.name}
                allocated={bucket.allocated}
                spent={bucket.spent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Spending Trends */}
      {trends && trends.length > 0 && (
        <SpendingTrendChart data={trends} />
      )}
    </div>
  )
}
