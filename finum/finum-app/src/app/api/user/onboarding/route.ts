import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAPILogger } from '@/lib/logger'
import { auditLog } from '@/lib/services/audit.service'

/**
 * POST /api/user/onboarding
 * Mark user onboarding as complete
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const logger = createAPILogger('user.onboarding', userId)

  try {
    logger.info('Completing user onboarding', { userId })

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingComplete: true,
        onboardingStep: 5,
      },
    })

    // Audit log
    await auditLog({
      userId,
      action: 'onboarding.complete',
      entityType: 'User',
      entityId: userId,
      metadata: {
        completedAt: new Date().toISOString(),
      },
    })

    logger.info('Onboarding completed successfully', { userId })

    return NextResponse.json({
      success: true,
      user: {
        onboardingComplete: user.onboardingComplete,
        onboardingStep: user.onboardingStep,
      },
    })
  } catch (error) {
    logger.error('Failed to complete onboarding', error as Error, { userId })
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/onboarding
 * Update onboarding step
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const logger = createAPILogger('user.onboarding.step', userId)

  try {
    const body = await req.json()
    const { step } = body

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      )
    }

    logger.info('Updating onboarding step', { userId, step })

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: step,
      },
    })

    return NextResponse.json({
      success: true,
      onboardingStep: user.onboardingStep,
    })
  } catch (error) {
    logger.error('Failed to update onboarding step', error as Error, { userId })
    return NextResponse.json(
      { error: 'Failed to update onboarding step' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/onboarding
 * Get current onboarding status
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingComplete: true,
        onboardingStep: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      onboardingComplete: user.onboardingComplete,
      onboardingStep: user.onboardingStep,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    )
  }
}
