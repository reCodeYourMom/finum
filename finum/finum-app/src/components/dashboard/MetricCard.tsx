'use client'

import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  color?: 'blue' | 'green' | 'red' | 'gray'
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: MetricCardProps) {
  const colors = {
    blue: 'bg-finum-blue/10 text-finum-blue',
    green: 'bg-finum-green/10 text-finum-green',
    red: 'bg-finum-red/10 text-finum-red',
    gray: 'bg-finum-gray-100 text-finum-gray-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-premium p-6 hover:shadow-premium-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-finum-gray-600">{title}</p>
          {subtitle && (
            <p className="text-xs text-finum-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <p className="text-3xl font-bold text-finum-dark font-mono">{value}</p>
      </div>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? 'text-finum-green' : 'text-finum-red'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-finum-gray-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
