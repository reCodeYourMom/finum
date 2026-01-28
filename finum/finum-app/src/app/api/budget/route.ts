import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getUserBudgets,
  createBudget,
  getBudgetStats,
} from '@/lib/services/budget.service'

/**
 * GET /api/budget - Get all budgets for current user
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgets = await getUserBudgets(session.user.id)
    const stats = await getBudgetStats(session.user.id)

    return NextResponse.json({ budgets, stats })
  } catch (error: any) {
    console.error('GET /api/budget error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budget - Create a new budget
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const budget = await createBudget({
      userId: session.user.id,
      name: body.name,
      amount: body.amount,
      currency: body.currency || 'EUR',
      period: body.period || 'monthly',
      category: body.category,
    })

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/budget error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create budget' },
      { status: 500 }
    )
  }
}
