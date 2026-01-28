import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { refreshPatterns, getPatterns } from '@/lib/services/pattern.service'

/**
 * GET /api/patterns - List patterns (optional refresh)
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    const months = parseInt(searchParams.get('months') || '12', 10)

    if (refresh) {
      await refreshPatterns(session.user.id, months)
    }

    const data = await getPatterns(session.user.id, months)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('GET /api/patterns error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patterns' },
      { status: 500 }
    )
  }
}
