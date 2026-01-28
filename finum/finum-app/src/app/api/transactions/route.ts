import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getUserTransactions,
  createTransaction,
  getTransactionStats,
} from '@/lib/services/transaction.service'

/**
 * GET /api/transactions - Get all transactions for current user
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Pagination
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')

    // Filters
    const filters: any = {}
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!)
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!)
    }
    if (searchParams.get('merchant')) {
      filters.merchant = searchParams.get('merchant')!
    }
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!
    }
    if (searchParams.get('bucketId')) {
      filters.bucketId = searchParams.get('bucketId')!
    }

    const transactions = await getUserTransactions(session.user.id, filters, {
      skip,
      take,
      orderBy: (searchParams.get('orderBy') as any) || 'date',
      order: (searchParams.get('order') as any) || 'desc',
    })

    const stats = await getTransactionStats(
      session.user.id,
      filters.startDate,
      filters.endDate
    )

    return NextResponse.json({ transactions, stats })
  } catch (error: any) {
    console.error('GET /api/transactions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transactions - Create a new transaction
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const transaction = await createTransaction({
      userId: session.user.id,
      date: new Date(body.date),
      amount: body.amount,
      currency: body.currency || 'EUR',
      merchant: body.merchant,
      description: body.description,
      category: body.category,
      bucketId: body.bucketId,
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/transactions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
