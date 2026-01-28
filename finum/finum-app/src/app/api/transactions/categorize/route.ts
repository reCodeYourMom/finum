/**
 * POST /api/transactions/categorize
 * Auto-categorize transactions using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { categorizeTransactions } from '@/lib/services/ai/nlp.service'
import { isConfigured } from '@/lib/services/ai/ai.service'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const userId = session.user.id
    const body = await req.json()
    const { transactionIds } = body

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Transaction IDs array is required' },
        { status: 400 }
      )
    }

    // Limit to 50 transactions per batch
    if (transactionIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 transactions per batch' },
        { status: 400 }
      )
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
      },
      select: {
        id: true,
        merchant: true,
        description: true,
        amount: true,
        amountEur: true,
      },
    })

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      )
    }

    // Get existing categories from user's buckets
    const buckets = await prisma.bucket.findMany({
      where: { userId },
      select: { category: true },
      distinct: ['category'],
    })

    const categories = buckets
      .map(b => b.category)
      .filter((c): c is string => !!c)

    // If no categories available, use default ones
    const availableCategories = categories.length > 0
      ? categories
      : ['Alimentation', 'Transport', 'Loisirs', 'Logement', 'Santé', 'Autres']

    // Categorize using AI
    const suggestions = await categorizeTransactions(
      transactions.map(tx => ({
        id: tx.id,
        merchant: tx.merchant,
        description: tx.description || undefined,
        amount: parseFloat(tx.amountEur?.toString() || tx.amount.toString()),
      })),
      availableCategories
    )

    return NextResponse.json({
      suggestions,
      availableCategories,
    })
  } catch (error) {
    console.error('Categorization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
