import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { subMonths } from 'date-fns'
import {
  detectRecurringPatterns,
  normalizeMerchant,
} from '@/lib/parsers/transaction-parser'

const DEFAULT_LOOKBACK_MONTHS = 12

type DetectedPattern = {
  merchantNorm: string
  frequency: 'weekly' | 'monthly' | 'quarterly'
  avgAmount: number
  count: number
}

function patternKey(merchantNorm: string, frequency: string) {
  return `${merchantNorm}__${frequency}`
}

function frequencyMultiplier(frequency: DetectedPattern['frequency']) {
  if (frequency === 'weekly') return 52
  if (frequency === 'monthly') return 12
  return 4
}

async function ensureMerchantNorms(
  transactions: Array<{ id: string; merchant: string; merchantNorm: string | null }>
) {
  const updates: Promise<any>[] = []

  transactions.forEach((tx) => {
    if (!tx.merchantNorm) {
      const normalized = normalizeMerchant(tx.merchant)
      tx.merchantNorm = normalized
      updates.push(
        prisma.transaction.update({
          where: { id: tx.id },
          data: { merchantNorm: normalized },
        })
      )
    }
  })

  if (updates.length > 0) {
    await Promise.all(updates)
  }
}

export async function refreshPatterns(userId: string, months = DEFAULT_LOOKBACK_MONTHS) {
  const since = subMonths(new Date(), months)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: since },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      amountEur: true,
      merchant: true,
      merchantNorm: true,
      bucketId: true,
    },
  })

  if (transactions.length === 0) {
    return []
  }

  await ensureMerchantNorms(transactions)

  const patternInputs = transactions.map((tx) => ({
    date: tx.date.toISOString(),
    amount: parseFloat((tx.amountEur ?? tx.amount).toString()),
    merchantNorm: tx.merchantNorm || normalizeMerchant(tx.merchant),
  }))

  const detected = detectRecurringPatterns(patternInputs) as DetectedPattern[]
  const activeKeys = new Set(detected.map((p) => patternKey(p.merchantNorm, p.frequency)))

  // Cleanup old detected patterns that are no longer recurring
  const existingDetected = await prisma.pattern.findMany({
    where: { userId, status: 'detected' },
    select: { id: true, merchantNorm: true, frequency: true },
  })

  const deletions = existingDetected
    .filter((p) => !activeKeys.has(patternKey(p.merchantNorm, p.frequency)))
    .map((p) => prisma.pattern.delete({ where: { id: p.id } }))

  if (deletions.length > 0) {
    await Promise.all(deletions)
  }

  const patterns: Array<{ id: string; merchantNorm: string }> = []

  for (const pattern of detected) {
    const projectedAnnual =
      Math.round(pattern.avgAmount * frequencyMultiplier(pattern.frequency) * 100) / 100

    const existing = await prisma.pattern.findFirst({
      where: {
        userId,
        merchantNorm: pattern.merchantNorm,
        frequency: pattern.frequency,
      },
    })

    const data = {
      merchantNorm: pattern.merchantNorm,
      frequency: pattern.frequency,
      avgAmount: new Prisma.Decimal(pattern.avgAmount),
      projectedAnnual: new Prisma.Decimal(projectedAnnual),
    }

    const record = existing
      ? await prisma.pattern.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.pattern.create({
          data: {
            userId,
            status: 'detected',
            ...data,
          },
        })

    patterns.push({ id: record.id, merchantNorm: record.merchantNorm })
  }

  // Reset recurring flags for recent transactions, then reassign patterns
  await prisma.transaction.updateMany({
    where: { userId, date: { gte: since } },
    data: { patternId: null, isRecurring: false },
  })

  for (const pattern of patterns) {
    await prisma.transaction.updateMany({
      where: {
        userId,
        merchantNorm: pattern.merchantNorm,
        date: { gte: since },
      },
      data: { patternId: pattern.id, isRecurring: true },
    })
  }

  return patterns
}

export async function getPatterns(userId: string, months = DEFAULT_LOOKBACK_MONTHS) {
  const since = subMonths(new Date(), months)

  const patterns = await prisma.pattern.findMany({
    where: { userId },
    include: {
      transactions: {
        where: { date: { gte: since } },
        select: {
          id: true,
          date: true,
          amount: true,
          amountEur: true,
          bucketId: true,
        },
      },
    },
    orderBy: { projectedAnnual: 'desc' },
  })

  const formatted = patterns.map((pattern) => {
    const amounts = pattern.transactions.map((tx) =>
      parseFloat((tx.amountEur ?? tx.amount).toString())
    )
    const totalSpent = amounts.reduce((sum, val) => sum + val, 0)
    const lastTransactionDate =
      pattern.transactions.length > 0
        ? pattern.transactions
            .map((tx) => tx.date)
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : null

    const unassignedCount = pattern.transactions.filter((tx) => !tx.bucketId).length

    return {
      id: pattern.id,
      merchantNorm: pattern.merchantNorm,
      frequency: pattern.frequency,
      avgAmount: parseFloat(pattern.avgAmount.toString()),
      projectedAnnual: parseFloat(pattern.projectedAnnual.toString()),
      status: pattern.status,
      transactionCount: pattern.transactions.length,
      totalSpent,
      unassignedCount,
      lastTransactionDate,
    }
  })

  const blindSpots = formatted.filter(
    (pattern) => pattern.status === 'detected' && pattern.unassignedCount > 0
  )

  return { patterns: formatted, blindSpots }
}

export async function updatePatternStatus(
  patternId: string,
  status: 'detected' | 'budgeted' | 'ignored'
) {
  return prisma.pattern.update({
    where: { id: patternId },
    data: { status },
  })
}
