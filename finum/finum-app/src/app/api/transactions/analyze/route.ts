/**
 * POST /api/transactions/analyze
 * Analyze transaction patterns for a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { analyzeTransactionPatterns } from '@/lib/services/ai/nlp.service'
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
    const { timeframeMonths = 3 } = body

    if (timeframeMonths < 1 || timeframeMonths > 12) {
      return NextResponse.json(
        { error: 'Timeframe must be between 1 and 12 months' },
        { status: 400 }
      )
    }

    const analysis = await analyzeTransactionPatterns(userId, timeframeMonths)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
