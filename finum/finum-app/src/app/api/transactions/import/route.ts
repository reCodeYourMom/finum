import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseTransactionCSV } from '@/lib/parsers/transaction-parser'
import { importTransactions } from '@/lib/services/transaction.service'

/**
 * POST /api/transactions/import - Import transactions from CSV
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse CSV with automatic column mapping and validation
    const result = await parseTransactionCSV(file)

    if (result.errors.length > 0 && result.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse CSV',
          details: result.errors,
        },
        { status: 400 }
      )
    }

    // Import transactions with deduplication
    const importResult = await importTransactions(
      session.user.id,
      result.data,
      file.name
    )

    return NextResponse.json({
      success: true,
      created: importResult.created,
      duplicates: importResult.duplicates,
      assigned: importResult.assigned,
      errors: importResult.errors,
      parseErrors: result.errors,
      meta: result.meta,
    })
  } catch (error: any) {
    console.error('POST /api/transactions/import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
