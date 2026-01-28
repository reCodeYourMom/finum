import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUnassignedTransactions } from '@/lib/services/transaction.service'

/**
 * GET /api/transactions/unassigned - Get unassigned transactions
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const transactions = await getUnassignedTransactions(session.user.id, limit)

    return NextResponse.json({ transactions, count: transactions.length })
  } catch (error: any) {
    console.error('GET /api/transactions/unassigned error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unassigned transactions' },
      { status: 500 }
    )
  }
}
