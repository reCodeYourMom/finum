import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { parseCSV } from '@/lib/parsers/csv-parser'
import { importBudgets } from '@/lib/services/budget.service'

const BudgetCSVSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const str = String(val).replace(/[^\d.,-]/g, '').replace(',', '.')
      const num = parseFloat(str)
      if (isNaN(num)) throw new Error('Invalid amount')
      return num
    }),
  currency: z.string().default('EUR').transform((val) => val.toUpperCase()),
  period: z
    .enum(['monthly', 'annual', 'goal'])
    .default('monthly'),
  category: z.string().optional(),
})

/**
 * POST /api/budget/import - Import budgets from CSV
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

    // Parse CSV
    const result = await parseCSV(file, BudgetCSVSchema)

    if (result.errors.length > 0 && result.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse CSV',
          details: result.errors,
        },
        { status: 400 }
      )
    }

    // Import budgets
    const importResult = await importBudgets(session.user.id, result.data)

    return NextResponse.json({
      success: true,
      created: importResult.created,
      errors: importResult.errors,
      parseErrors: result.errors,
      meta: result.meta,
    })
  } catch (error: any) {
    console.error('POST /api/budget/import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import budgets' },
      { status: 500 }
    )
  }
}
