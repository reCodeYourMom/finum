/**
 * GET /api/feedback - Get user's feedback
 * POST /api/feedback - Submit new feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createFeedback, getUserFeedback, type FeedbackType } from '@/lib/services/feedback.service'
import { createAPILogger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const logger = createAPILogger('feedback.list')

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    logger.setContext({ userId })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as FeedbackType | null
    const status = searchParams.get('status') as any

    const feedbacks = await getUserFeedback(userId, {
      type: type || undefined,
      status: status || undefined,
    })

    logger.info('Feedback retrieved', { count: feedbacks.length })

    return NextResponse.json({ feedbacks })
  } catch (error) {
    logger.error('Failed to get feedback', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const logger = createAPILogger('feedback.create')

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    logger.setContext({ userId })

    const body = await req.json()
    const { type, title, description, screenshot, page, metadata } = body

    // Validation
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Type, title, and description are required' },
        { status: 400 }
      )
    }

    if (!['bug', 'feature', 'general', 'praise'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      )
    }

    if (description.length > 5000) {
      return NextResponse.json(
        { error: 'Description must be 5000 characters or less' },
        { status: 400 }
      )
    }

    const feedback = await createFeedback({
      userId,
      type,
      title,
      description,
      screenshot,
      page,
      metadata,
    })

    logger.info('Feedback created', { feedbackId: feedback.id, type })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create feedback', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
