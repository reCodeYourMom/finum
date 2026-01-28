import { prisma } from '@/lib/prisma'
import {
  startOfWeek,
  endOfWeek,
  differenceInDays,
  addWeeks,
  min,
  format,
} from 'date-fns'
import { getPatterns } from '@/lib/services/pattern.service'
import { getLatestDecisionByType } from '@/lib/services/decision.service'
import { generateWeeklyReview as generateAIWeeklyReview, type UserFinancialContext } from '@/lib/services/ai/ai-coach.service'
import { isConfigured as isAIConfigured } from '@/lib/services/ai/ai.service'

export async function getWeeklyReview(userId: string, referenceDate = new Date()) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
  const periodEnd = min([referenceDate, weekEnd])
  const dayCount = differenceInDays(periodEnd, weekStart) + 1

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: weekStart,
        lte: periodEnd,
      },
    },
  })

  const totalSpent = transactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amountEur?.toString() || tx.amount.toString()),
    0
  )

  const avgDaily = dayCount > 0 ? totalSpent / dayCount : 0

  const categoryMap = new Map<string, number>()
  transactions.forEach((tx) => {
    const category = tx.category || 'Non classe'
    const amount = parseFloat(tx.amountEur?.toString() || tx.amount.toString())
    categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
  })

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  const unassignedCount = transactions.filter((tx) => !tx.bucketId).length

  const buckets = await prisma.bucket.findMany({
    where: { userId, period: 'monthly' },
  })

  const bucketSummaries = buckets.map((bucket) => {
    const allocated = parseFloat(bucket.allocated.toString())
    const spent = parseFloat(bucket.spent.toString())
    const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0
    return {
      id: bucket.id,
      name: bucket.name,
      allocated,
      spent,
      percentUsed,
    }
  })

  const overspentBuckets = bucketSummaries.filter((bucket) => bucket.percentUsed >= 100)
  const warningBuckets = bucketSummaries.filter(
    (bucket) => bucket.percentUsed >= 80 && bucket.percentUsed < 100
  )

  const patternsData = await getPatterns(userId, 12)
  const patternCounts = {
    total: patternsData.patterns.length,
    detected: patternsData.patterns.filter((p) => p.status === 'detected').length,
    budgeted: patternsData.patterns.filter((p) => p.status === 'budgeted').length,
    ignored: patternsData.patterns.filter((p) => p.status === 'ignored').length,
    blindSpots: patternsData.blindSpots.length,
  }

  const lastReview = await getLatestDecisionByType(userId, 'weekly_review')
  const nextReviewDate = addWeeks(weekStart, 1)

  // Try to generate AI recommendations if configured
  let recommendations: string[] | Array<{ title: string; description: string; reasoning: string }> = []
  let aiEnhanced = false

  if (isAIConfigured()) {
    try {
      // Prepare context for AI
      const context: UserFinancialContext = {
        userId,
        totalBudget: buckets.reduce((sum, b) => sum + parseFloat(b.allocated.toString()), 0),
        bucketsOverspent: overspentBuckets.map(b => ({
          name: b.name,
          allocated: b.allocated,
          spent: b.spent,
          overspend: b.spent - b.allocated,
        })),
        recentTransactions: transactions.slice(0, 30).map(tx => ({
          date: format(tx.date, 'yyyy-MM-dd'),
          merchant: tx.merchant,
          amount: parseFloat(tx.amountEur?.toString() || tx.amount.toString()),
          category: tx.category || undefined,
        })),
        patterns: patternsData.patterns.slice(0, 5).map(p => ({
          merchant: p.merchantNorm,
          frequency: p.frequency,
          avgAmount: parseFloat(p.avgAmount.toString()),
          projectedAnnual: parseFloat(p.projectedAnnual.toString()),
        })),
      }

      const aiReview = await generateAIWeeklyReview(context)

      if (aiReview.recommendations.length > 0) {
        recommendations = aiReview.recommendations
        aiEnhanced = true
      }
    } catch (error) {
      console.error('Failed to generate AI recommendations, falling back to rule-based:', error)
    }
  }

  // Fallback to rule-based recommendations if AI not available or failed
  if (!aiEnhanced) {
    const ruleBasedRecs: string[] = []
    if (overspentBuckets.length > 0) {
      ruleBasedRecs.push('Verifier les buckets en depassement et ajuster les montants')
    }
    if (unassignedCount > 0) {
      ruleBasedRecs.push('Assigner les transactions non classees')
    }
    if (patternCounts.blindSpots > 0) {
      ruleBasedRecs.push('Creer un bucket pour les patterns non assignes')
    }
    if (ruleBasedRecs.length === 0) {
      ruleBasedRecs.push('Rien a signaler, continuez sur cette lancee')
    }
    recommendations = ruleBasedRecs
  }

  return {
    period: {
      start: weekStart,
      end: periodEnd,
      nextReviewDate,
      daysCovered: dayCount,
    },
    totals: {
      spent: totalSpent,
      avgDaily,
      transactionCount: transactions.length,
    },
    topCategories,
    unassignedCount,
    overspentBuckets,
    warningBuckets,
    patterns: patternCounts,
    recommendations,
    aiEnhanced,
    lastReview: lastReview
      ? {
          date: lastReview.createdAt,
          action: (lastReview.context as any)?.action || 'reviewed',
          justification: lastReview.justification || null,
        }
      : null,
  }
}

/**
 * Get AI-powered weekly review
 * This is a wrapper that can be called from API routes with ?ai=true parameter
 */
export async function getAIWeeklyReview(userId: string, referenceDate = new Date()) {
  return getWeeklyReview(userId, referenceDate)
}
