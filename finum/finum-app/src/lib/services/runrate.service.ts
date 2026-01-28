import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, differenceInDays, getDaysInMonth } from 'date-fns'

export interface RunRateMetrics {
  // Current month data
  monthToDate: {
    spent: number
    dayOfMonth: number
    daysInMonth: number
  }
  // Run-rate calculations
  runRate: {
    daily: number
    monthly: number
    projectedEOM: number
  }
  // Budget comparisons
  budget: {
    totalMonthly: number
    allocated: number
    remaining: number
    percentUsed: number
  }
  // Runway (months until zero if no income)
  runway: {
    months: number
    withCurrentCash: number
    withProjectedSpend: number
  }
  // Top spending categories
  topCategories: Array<{
    category: string
    spent: number
    percentOfTotal: number
  }>
}

/**
 * Calculate run-rate metrics for a user
 */
export async function calculateRunRate(
  userId: string,
  currentCash: number = 0
): Promise<RunRateMetrics> {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const dayOfMonth = now.getDate()
  const daysInMonth = getDaysInMonth(now)

  // Get transactions for current month
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: monthStart,
        lte: now,
      },
    },
    include: {
      bucket: true,
    },
  })

  // Calculate month-to-date spending
  const spentMTD = transactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amountEur?.toString() || '0'),
    0
  )

  // Calculate daily run-rate
  const dailyRunRate = dayOfMonth > 0 ? spentMTD / dayOfMonth : 0

  // Project end of month
  const projectedEOM = dailyRunRate * daysInMonth

  // Get monthly budgets
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      period: 'monthly',
    },
    include: {
      buckets: true,
    },
  })

  const totalMonthlyBudget = budgets.reduce(
    (sum, b) => sum + parseFloat(b.amount.toString()),
    0
  )

  const totalAllocated = budgets.reduce((sum, b) => {
    return (
      sum +
      b.buckets.reduce((bSum, bucket) => bSum + parseFloat(bucket.allocated.toString()), 0)
    )
  }, 0)

  const remaining = totalMonthlyBudget - spentMTD
  const percentUsed = totalMonthlyBudget > 0 ? (spentMTD / totalMonthlyBudget) * 100 : 0

  // Calculate runway
  const avgMonthlySpend = dailyRunRate * 30 // Approximate monthly
  const runwayMonths =
    avgMonthlySpend > 0 ? currentCash / avgMonthlySpend : Infinity

  // Top categories
  const categorySpending = new Map<string, number>()
  transactions.forEach((tx) => {
    const category = tx.category || 'Uncategorized'
    const amount = parseFloat(tx.amountEur?.toString() || '0')
    categorySpending.set(category, (categorySpending.get(category) || 0) + amount)
  })

  const topCategories = Array.from(categorySpending.entries())
    .map(([category, spent]) => ({
      category,
      spent,
      percentOfTotal: spentMTD > 0 ? (spent / spentMTD) * 100 : 0,
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  return {
    monthToDate: {
      spent: spentMTD,
      dayOfMonth,
      daysInMonth,
    },
    runRate: {
      daily: dailyRunRate,
      monthly: dailyRunRate * 30,
      projectedEOM,
    },
    budget: {
      totalMonthly: totalMonthlyBudget,
      allocated: totalAllocated,
      remaining,
      percentUsed,
    },
    runway: {
      months: runwayMonths,
      withCurrentCash: currentCash,
      withProjectedSpend: avgMonthlySpend,
    },
    topCategories,
  }
}

/**
 * Get spending trends over time
 */
export async function getSpendingTrends(userId: string, months: number = 6) {
  const trends: Array<{
    month: string
    year: number
    spent: number
    transactions: number
  }> = []

  for (let i = 0; i < months; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)

    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    const spent = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amountEur?.toString() || '0'),
      0
    )

    trends.unshift({
      month: date.toLocaleString('fr-FR', { month: 'short' }),
      year: date.getFullYear(),
      spent,
      transactions: transactions.length,
    })
  }

  return trends
}

/**
 * Calculate budget health score (0-100)
 */
export async function calculateBudgetHealth(userId: string): Promise<number> {
  const metrics = await calculateRunRate(userId)

  let score = 100

  // Penalty for overspending
  if (metrics.budget.percentUsed > 100) {
    score -= Math.min(50, (metrics.budget.percentUsed - 100) * 2)
  }

  // Penalty for projected overspending
  const projectedPercent =
    metrics.budget.totalMonthly > 0
      ? (metrics.runRate.projectedEOM / metrics.budget.totalMonthly) * 100
      : 0

  if (projectedPercent > 100) {
    score -= Math.min(30, (projectedPercent - 100) * 1.5)
  }

  // Penalty for low runway
  if (metrics.runway.months < 3) {
    score -= 20
  } else if (metrics.runway.months < 6) {
    score -= 10
  }

  return Math.max(0, Math.round(score))
}

/**
 * Get budget vs actual comparison
 */
export async function getBudgetVsActual(userId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)

  // Get all buckets with their allocations
  const buckets = await prisma.bucket.findMany({
    where: {
      userId,
      period: 'monthly',
    },
    include: {
      transactions: {
        where: {
          date: {
            gte: monthStart,
          },
        },
      },
    },
  })

  return buckets.map((bucket) => {
    const allocated = parseFloat(bucket.allocated.toString())
    const spent = bucket.transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amountEur?.toString() || '0'),
      0
    )
    const remaining = allocated - spent
    const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0

    return {
      id: bucket.id,
      name: bucket.name,
      allocated,
      spent,
      remaining,
      percentUsed,
      status:
        percentUsed >= 100
          ? 'over'
          : percentUsed >= 80
          ? 'warning'
          : 'ok',
    }
  })
}
