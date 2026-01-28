import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface BucketCreateInput {
  name: string
  allocated: number
  period: 'monthly' | 'annual'
  category?: string
  color?: string
  budgetId?: string
}

export interface BucketUpdateInput {
  name?: string
  allocated?: number
  period?: 'monthly' | 'annual'
  category?: string
  color?: string
}

export interface BucketStats {
  id: string
  name: string
  allocated: number
  spent: number
  remaining: number
  percentUsed: number
  transactionCount: number
  status: 'ok' | 'warning' | 'over'
  period: string
}

/**
 * Créer un nouveau bucket
 */
export async function createBucket(userId: string, data: BucketCreateInput) {
  return prisma.bucket.create({
    data: {
      userId,
      name: data.name,
      allocated: new Prisma.Decimal(data.allocated),
      spent: 0,
      period: data.period,
      category: data.category,
      color: data.color,
      budgetId: data.budgetId,
    },
    include: {
      budget: true,
      _count: {
        select: { transactions: true },
      },
    },
  })
}

/**
 * Récupérer tous les buckets d'un utilisateur
 */
export async function getBuckets(
  userId: string,
  filters?: {
    budgetId?: string
    period?: string
  }
) {
  const where: Prisma.BucketWhereInput = {
    userId,
    ...(filters?.budgetId && { budgetId: filters.budgetId }),
    ...(filters?.period && { period: filters.period }),
  }

  return prisma.bucket.findMany({
    where,
    include: {
      budget: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Récupérer un bucket par ID
 */
export async function getBucketById(bucketId: string) {
  return prisma.bucket.findUnique({
    where: { id: bucketId },
    include: {
      budget: true,
      transactions: {
        orderBy: { date: 'desc' },
        take: 10,
      },
      _count: {
        select: { transactions: true },
      },
    },
  })
}

/**
 * Mettre à jour un bucket
 */
export async function updateBucket(bucketId: string, data: BucketUpdateInput) {
  return prisma.bucket.update({
    where: { id: bucketId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.allocated !== undefined && {
        allocated: new Prisma.Decimal(data.allocated),
      }),
      ...(data.period && { period: data.period }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.color !== undefined && { color: data.color }),
    },
    include: {
      budget: true,
      _count: {
        select: { transactions: true },
      },
    },
  })
}

/**
 * Supprimer un bucket
 */
export async function deleteBucket(bucketId: string) {
  // Détacher les transactions avant suppression
  await prisma.transaction.updateMany({
    where: { bucketId },
    data: { bucketId: null },
  })

  return prisma.bucket.delete({
    where: { id: bucketId },
  })
}

/**
 * Récupérer les stats détaillées d'un bucket
 */
export async function getBucketStats(bucketId: string): Promise<BucketStats | null> {
  const bucket = await prisma.bucket.findUnique({
    where: { id: bucketId },
    include: {
      transactions: {
        select: { amountEur: true },
      },
    },
  })

  if (!bucket) return null

  const spent = bucket.transactions.reduce((sum, t) => {
    return sum + (t.amountEur ? Number(t.amountEur) : 0)
  }, 0)

  const allocated = Number(bucket.allocated)
  const remaining = allocated - spent
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0

  let status: 'ok' | 'warning' | 'over' = 'ok'
  if (percentUsed >= 100) status = 'over'
  else if (percentUsed >= 80) status = 'warning'

  return {
    id: bucket.id,
    name: bucket.name,
    allocated,
    spent,
    remaining,
    percentUsed,
    transactionCount: bucket.transactions.length,
    status,
    period: bucket.period,
  }
}

/**
 * Lier une transaction à un bucket et mettre à jour le montant dépensé
 */
export async function linkTransactionToBucket(
  transactionId: string,
  bucketId: string | null
) {
  // Récupérer l'ancienne transaction pour ajuster les buckets
  const oldTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { bucketId: true, amountEur: true },
  })

  if (!oldTransaction) {
    throw new Error('Transaction not found')
  }

  const amountEur = oldTransaction.amountEur ? Number(oldTransaction.amountEur) : 0

  // Mettre à jour la transaction
  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { bucketId },
  })

  // Ajuster l'ancien bucket (décrémenter)
  if (oldTransaction.bucketId) {
    await prisma.bucket.update({
      where: { id: oldTransaction.bucketId },
      data: {
        spent: {
          decrement: amountEur,
        },
      },
    })
  }

  // Ajuster le nouveau bucket (incrémenter)
  if (bucketId) {
    await prisma.bucket.update({
      where: { id: bucketId },
      data: {
        spent: {
          increment: amountEur,
        },
      },
    })
  }

  return transaction
}

/**
 * Recalculer le montant dépensé de tous les buckets d'un utilisateur
 */
export async function recalculateBucketSpent(userId: string) {
  const buckets = await getBuckets(userId)

  for (const bucket of buckets) {
    const transactions = await prisma.transaction.findMany({
      where: { bucketId: bucket.id },
      select: { amountEur: true },
    })

    const spent = transactions.reduce((sum, t) => {
      return sum + (t.amountEur ? Number(t.amountEur) : 0)
    }, 0)

    await prisma.bucket.update({
      where: { id: bucket.id },
      data: { spent },
    })
  }
}

/**
 * Obtenir un résumé de tous les buckets pour le cockpit
 */
export async function getBucketsSummary(userId: string) {
  const buckets = await getBuckets(userId, { period: 'monthly' })

  const summary = {
    totalAllocated: 0,
    totalSpent: 0,
    totalRemaining: 0,
    percentUsed: 0,
    bucketCount: buckets.length,
    overBudgetCount: 0,
    warningCount: 0,
  }

  for (const bucket of buckets) {
    const allocated = Number(bucket.allocated)
    const spent = Number(bucket.spent)
    summary.totalAllocated += allocated
    summary.totalSpent += spent
    summary.totalRemaining += allocated - spent

    const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0
    if (percentUsed >= 100) summary.overBudgetCount++
    else if (percentUsed >= 80) summary.warningCount++
  }

  if (summary.totalAllocated > 0) {
    summary.percentUsed = (summary.totalSpent / summary.totalAllocated) * 100
  }

  return summary
}
