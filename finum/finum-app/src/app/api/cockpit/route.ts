import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  calculateRunRate,
  getSpendingTrends,
  calculateBudgetHealth,
  getBudgetVsActual,
} from '@/lib/services/runrate.service'

/**
 * GET /api/cockpit - Get cockpit metrics for current user
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const currentCash = parseFloat(searchParams.get('cash') || '0')

    // Calculate all metrics
    const [runRate, trends, health, budgetVsActual] = await Promise.all([
      calculateRunRate(session.user.id, currentCash),
      getSpendingTrends(session.user.id, 6),
      calculateBudgetHealth(session.user.id),
      getBudgetVsActual(session.user.id),
    ])

    return NextResponse.json({
      runRate,
      trends,
      health,
      budgetVsActual,
    })
  } catch (error: any) {
    console.error('GET /api/cockpit error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cockpit data' },
      { status: 500 }
    )
  }
}
