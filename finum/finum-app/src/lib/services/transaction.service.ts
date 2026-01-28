import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { toEUR } from '@/lib/utils/currency'
import { normalizeMerchant, generateTransactionHash } from '@/lib/parsers/transaction-parser'
import { getRulesByUser, matchRule } from '@/lib/services/rule.service'
import { refreshPatterns } from '@/lib/services/pattern.service'
import { generateTransactionEmbeddingsBatch } from '@/lib/services/ai/nlp.service'
import { isConfigured as isAIConfigured } from '@/lib/services/ai/ai.service'

export interface CreateTransactionInput {
  userId: string
  date: Date | string
  amount: number
  currency: string
  amountEur?: number
  merchant: string
  description?: string
  category?: string
  bucketId?: string
  importSource?: string
  importFile?: string
}

export interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
  merchant?: string
  category?: string
  bucketId?: string
  isRecurring?: boolean
}

/**
 * Create a new transaction
 */
export async function createTransaction(input: CreateTransactionInput) {
  const date = typeof input.date === 'string' ? new Date(input.date) : input.date

  // Convert to EUR if needed
  const amountEur =
    input.amountEur ??
    (input.currency === 'EUR' ? input.amount : await toEUR(input.amount, input.currency))

  const merchantNorm = normalizeMerchant(input.merchant)

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        date,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        amountEur: new Prisma.Decimal(amountEur),
        merchant: input.merchant,
        merchantNorm,
        description: input.description,
        category: input.category,
        bucketId: input.bucketId,
        importSource: input.importSource,
        importFile: input.importFile,
      },
    })

    if (input.bucketId) {
      await tx.bucket.update({
        where: { id: input.bucketId },
        data: {
          spent: {
            increment: new Prisma.Decimal(amountEur),
          },
        },
      })
    }

    return transaction
  })
}

/**
 * Get all transactions for a user with filters
 */
export async function getUserTransactions(
  userId: string,
  filters?: TransactionFilters,
  options?: {
    skip?: number
    take?: number
    orderBy?: 'date' | 'amount' | 'merchant'
    order?: 'asc' | 'desc'
  }
) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(filters?.startDate && { date: { gte: filters.startDate } }),
    ...(filters?.endDate && { date: { lte: filters.endDate } }),
    ...(filters?.minAmount && {
      amountEur: { gte: new Prisma.Decimal(filters.minAmount) },
    }),
    ...(filters?.maxAmount && {
      amountEur: { lte: new Prisma.Decimal(filters.maxAmount) },
    }),
    ...(filters?.merchant && {
      merchantNorm: { contains: normalizeMerchant(filters.merchant) },
    }),
    ...(filters?.category && { category: filters.category }),
    ...(filters?.bucketId && { bucketId: filters.bucketId }),
    ...(filters?.isRecurring !== undefined && { isRecurring: filters.isRecurring }),
  }

  return prisma.transaction.findMany({
    where,
    include: {
      bucket: true,
      pattern: true,
    },
    orderBy: {
      [options?.orderBy || 'date']: options?.order || 'desc',
    },
    skip: options?.skip,
    take: options?.take,
  })
}

/**
 * Get a single transaction
 */
export async function getTransaction(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      bucket: true,
      pattern: true,
    },
  })
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<CreateTransactionInput>
) {
  const data: any = {}

  if (input.date) {
    data.date = typeof input.date === 'string' ? new Date(input.date) : input.date
  }
  if (input.amount !== undefined) {
    data.amount = new Prisma.Decimal(input.amount)
    if (input.currency) {
      const amountEur =
        input.currency === 'EUR' ? input.amount : await toEUR(input.amount, input.currency)
      data.amountEur = new Prisma.Decimal(amountEur)
    }
  }
  if (input.merchant) {
    data.merchant = input.merchant
    data.merchantNorm = normalizeMerchant(input.merchant)
  }
  if (input.description !== undefined) data.description = input.description
  if (input.category !== undefined) data.category = input.category
  if (input.bucketId !== undefined) data.bucketId = input.bucketId

  return prisma.transaction.update({
    where: { id, userId },
    data,
  })
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string, userId: string) {
  return prisma.transaction.delete({
    where: { id, userId },
  })
}

/**
 * Import transactions from CSV data (with deduplication)
 */
export async function importTransactions(
  userId: string,
  transactions: Array<{
    date: string
    amount: number
    merchant: string
    currency?: string
    description?: string
    category?: string
  }>,
  importFile: string
) {
  const results = {
    created: 0,
    duplicates: 0,
    assigned: 0,
    errors: [] as Array<{ merchant: string; error: string }>,
  }

  // Get existing transaction hashes for deduplication
  const existingTxs = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, amount: true, merchantNorm: true },
  })

  const existingHashes = new Set(
    existingTxs.map((tx) =>
      generateTransactionHash(
        tx.date.toISOString(),
        parseFloat(tx.amount.toString()),
        tx.merchantNorm || tx.merchant || ''
      )
    )
  )

  const rules = await getRulesByUser(userId)

  for (const tx of transactions) {
    try {
      const hash = generateTransactionHash(tx.date, tx.amount, tx.merchant)

      if (existingHashes.has(hash)) {
        results.duplicates++
        continue
      }

      const currency = tx.currency || 'EUR'
      const amountEur = currency === 'EUR' ? tx.amount : await toEUR(tx.amount, currency)
      const merchantNorm = normalizeMerchant(tx.merchant)

      let bucketId: string | undefined
      if (rules.length > 0) {
        for (const rule of rules) {
          if (
            matchRule(rule, {
              id: 'temp',
              merchant: tx.merchant,
              merchantNorm,
              category: tx.category,
              amount: tx.amount,
              amountEur,
            })
          ) {
            bucketId = rule.bucketId
            break
          }
        }
      }

      await createTransaction({
        userId,
        date: new Date(tx.date),
        amount: tx.amount,
        currency,
        amountEur,
        merchant: tx.merchant,
        description: tx.description,
        category: tx.category,
        bucketId,
        importSource: 'csv',
        importFile,
      })

      results.created++
      if (bucketId) {
        results.assigned++
      }
      existingHashes.add(hash)
    } catch (error: any) {
      results.errors.push({
        merchant: tx.merchant,
        error: error.message,
      })
    }
  }

  try {
    await refreshPatterns(userId)
  } catch (error) {
    console.error('Failed to refresh patterns after import:', error)
  }

  // Generate embeddings for new transactions (async, non-blocking)
  if (isAIConfigured() && results.created > 0) {
    // Get the newly created transaction IDs
    const recentTxs = await prisma.transaction.findMany({
      where: {
        userId,
        importFile,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: results.created,
    })

    const txIds = recentTxs.map(tx => tx.id)

    // Generate embeddings in background (don't await)
    generateTransactionEmbeddingsBatch(txIds)
      .then(result => {
        console.log(`Generated embeddings: ${result.success} success, ${result.failed} failed`)
      })
      .catch(error => {
        console.error('Background embedding generation failed:', error)
      })
  }

  return results
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(startDate && { date: { gte: startDate } }),
    ...(endDate && { date: { lte: endDate } }),
  }

  const transactions = await prisma.transaction.findMany({
    where,
  })

  const stats = {
    totalCount: transactions.length,
    totalAmount: 0,
    avgAmount: 0,
    minAmount: Infinity,
    maxAmount: 0,
    byCurrency: {} as Record<string, { count: number; total: number }>,
    byCategory: {} as Record<string, { count: number; total: number }>,
    topMerchants: [] as Array<{ merchant: string; count: number; total: number }>,
  }

  const merchantStats = new Map<string, { count: number; total: number }>()

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amountEur?.toString() || '0')
    stats.totalAmount += amount

    if (amount < stats.minAmount) stats.minAmount = amount
    if (amount > stats.maxAmount) stats.maxAmount = amount

    // By currency
    if (!stats.byCurrency[tx.currency]) {
      stats.byCurrency[tx.currency] = { count: 0, total: 0 }
    }
    stats.byCurrency[tx.currency].count++
    stats.byCurrency[tx.currency].total += amount

    // By category
    if (tx.category) {
      if (!stats.byCategory[tx.category]) {
        stats.byCategory[tx.category] = { count: 0, total: 0 }
      }
      stats.byCategory[tx.category].count++
      stats.byCategory[tx.category].total += amount
    }

    // Merchant stats
    const merchantKey = tx.merchantNorm || tx.merchant
    if (!merchantStats.has(merchantKey)) {
      merchantStats.set(merchantKey, { count: 0, total: 0 })
    }
    const merchant = merchantStats.get(merchantKey)!
    merchant.count++
    merchant.total += amount
  })

  stats.avgAmount = stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0

  // Top 10 merchants
  stats.topMerchants = Array.from(merchantStats.entries())
    .map(([merchant, data]) => ({ merchant, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return stats
}

/**
 * Get unassigned transactions (no bucket)
 */
export async function getUnassignedTransactions(userId: string, limit = 50) {
  return prisma.transaction.findMany({
    where: {
      userId,
      bucketId: null,
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}
