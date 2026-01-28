'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SpendingTrendChartProps {
  data: Array<{
    month: string
    year: number
    spent: number
    transactions: number
  }>
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-premium p-6">
      <h3 className="text-lg font-bold text-finum-dark mb-4">
        Tendances de dépenses
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis
            dataKey="month"
            stroke="#6C757D"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6C757D"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E9ECEF',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number) =>
              new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(value)
            }
          />
          <Line
            type="monotone"
            dataKey="spent"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-finum-gray-600">Mois affiché</p>
          <p className="text-lg font-bold text-finum-dark">{data.length}</p>
        </div>
        <div>
          <p className="text-xs text-finum-gray-600">Total dépensé</p>
          <p className="text-lg font-bold text-finum-dark font-mono">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
            }).format(
              data.reduce((sum, d) => sum + d.spent, 0)
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-finum-gray-600">Transactions</p>
          <p className="text-lg font-bold text-finum-dark">
            {data.reduce((sum, d) => sum + d.transactions, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}
