import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getWeeklyReview } from '@/lib/services/coach.service'
import { refreshPatterns } from '@/lib/services/pattern.service'

/**
 * GET /api/coach/weekly - Weekly review summary
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'

    if (refresh) {
      await refreshPatterns(session.user.id)
    }

    const review = await getWeeklyReview(session.user.id)

    return NextResponse.json(review)
  } catch (error: any) {
    console.error('GET /api/coach/weekly error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weekly review' },
      { status: 500 }
    )
  }
}
