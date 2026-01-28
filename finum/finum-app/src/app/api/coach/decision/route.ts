import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { createDecision } from '@/lib/services/decision.service'

const decisionSchema = z.object({
  action: z.enum(['accepted', 'deferred']),
  justification: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
})

/**
 * POST /api/coach/decision - Store weekly review decision
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = decisionSchema.parse(body)

    const decision = await createDecision({
      userId: session.user.id,
      type: 'weekly_review',
      context: {
        action: data.action,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
      justification: data.justification,
    })

    return NextResponse.json(decision, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/coach/decision error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save decision' },
      { status: 500 }
    )
  }
}
