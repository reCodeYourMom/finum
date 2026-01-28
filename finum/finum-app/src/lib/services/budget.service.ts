import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface CreateBudgetInput {
  userId: string
  name: string
  amount: number
  currency: string
  period: 'monthly' | 'annual' | 'goal'
  category?: string
}

export interface UpdateBudgetInput {
  name?: string
  amount?: number
  currency?: string
  period?: 'monthly' | 'annual' | 'goal'
  category?: string
}

/**
 * Create a new budget
 */
export async function createBudget(input: CreateBudgetInput) {
  return prisma.budget.create({
    data: {
      userId: input.userId,
      name: input.name,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency,
      period: input.period,
      category: input.category,
    },
    include: {
      buckets: true,
    },
  })
}

/**
 * Get all budgets for a user
 */
export async function getUserBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    include: {
      buckets: {
        include: {
          transactions: {
            take: 5,
            orderBy: { date: 'desc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get a single budget by ID
 */
export async function getBudget(id: string, userId: string) {
  return prisma.budget.findFirst({
    where: { id, userId },
    include: {
      buckets: {
        include: {
          transactions: {
            orderBy: { date: 'desc' },
          },
          rules: true,
        },
      },
    },
  })
}

/**
 * Update a budget
 */
export async function updateBudget(
  id: string,
  userId: string,
  input: UpdateBudgetInput
) {
  return prisma.budget.update({
    where: { id, userId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.amount && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.currency && { currency: input.currency }),
      ...(input.period && { period: input.period }),
      ...(input.category !== undefined && { category: input.category }),
    },
    include: {
      buckets: true,
    },
  })
}

/**
 * Delete a budget
 */
export async function deleteBudget(id: string, userId: string) {
  return prisma.budget.delete({
    where: { id, userId },
  })
}

/**
 * Import budgets from CSV data
 */
export async function importBudgets(
  userId: string,
  budgets: Array<{
    name: string
    amount: number
    currency?: string
    period?: string
    category?: string
  }>
) {
  const results = {
    created: 0,
    errors: [] as Array<{ name: string; error: string }>,
  }

  for (const budget of budgets) {
    try {
      await createBudget({
        userId,
        name: budget.name,
        amount: budget.amount,
        currency: budget.currency || 'EUR',
        period: (budget.period as any) || 'monthly',
        category: budget.category,
      })
      results.created++
    } catch (error: any) {
      results.errors.push({
        name: budget.name,
        error: error.message,
      })
    }
  }

  return results
}

/**
 * Get budget statistics
 */
export async function getBudgetStats(userId: string) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: {
      buckets: {
        include: {
          transactions: true,
        },
      },
    },
  })

  const stats = {
    totalBudgets: budgets.length,
    totalAllocated: 0,
    totalSpent: 0,
    byPeriod: {
      monthly: { count: 0, allocated: 0 },
      annual: { count: 0, allocated: 0 },
      goal: { count: 0, allocated: 0 },
    },
  }

  budgets.forEach((budget) => {
    const amount = parseFloat(budget.amount.toString())
    stats.totalAllocated += amount

    if (budget.period in stats.byPeriod) {
      stats.byPeriod[budget.period as keyof typeof stats.byPeriod].count++
      stats.byPeriod[budget.period as keyof typeof stats.byPeriod].allocated += amount
    }

    budget.buckets.forEach((bucket) => {
      stats.totalSpent += parseFloat(bucket.spent.toString())
    })
  })

  return stats
}
