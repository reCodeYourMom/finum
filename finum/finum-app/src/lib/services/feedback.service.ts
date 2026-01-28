/**
 * Feedback Service - User feedback and bug reporting
 * Allows users to submit feedback, report bugs, and request features
 */

import { prisma } from '@/lib/prisma'
import { createServiceLogger } from '@/lib/logger'

const logger = createServiceLogger('feedback', 'management')

export type FeedbackType = 'bug' | 'feature' | 'general' | 'praise'
export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed'

export interface CreateFeedbackInput {
  userId: string
  type: FeedbackType
  title: string
  description: string
  screenshot?: string
  page?: string
  metadata?: {
    browser?: string
    device?: string
    os?: string
    viewport?: { width: number; height: number }
    [key: string]: any
  }
}

/**
 * Create new feedback
 */
export async function createFeedback(input: CreateFeedbackInput) {
  try {
    const feedback = await prisma.userFeedback.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        description: input.description,
        screenshot: input.screenshot,
        page: input.page,
        metadata: input.metadata,
      },
    })

    logger.info('Feedback created', {
      feedbackId: feedback.id,
      type: feedback.type,
      userId: input.userId,
    })

    return feedback
  } catch (error) {
    logger.error('Failed to create feedback', error as Error, {
      userId: input.userId,
      type: input.type,
    })
    throw error
  }
}

/**
 * Get user's feedback
 */
export async function getUserFeedback(
  userId: string,
  options: {
    type?: FeedbackType
    status?: FeedbackStatus
    limit?: number
  } = {}
) {
  const { type, status, limit = 50 } = options

  return prisma.userFeedback.findMany({
    where: {
      userId,
      ...(type && { type }),
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get all feedback (admin)
 */
export async function getAllFeedback(options: {
  type?: FeedbackType
  status?: FeedbackStatus
  limit?: number
  startDate?: Date
  endDate?: Date
} = {}) {
  const { type, status, limit = 100, startDate, endDate } = options

  return prisma.userFeedback.findMany({
    where: {
      ...(type && { type }),
      ...(status && { status }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: string) {
  return prisma.userFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
) {
  const feedback = await prisma.userFeedback.update({
    where: { id: feedbackId },
    data: { status },
  })

  logger.info('Feedback status updated', {
    feedbackId,
    status,
  })

  return feedback
}

/**
 * Get feedback statistics
 */
export async function getFeedbackStats(days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const feedbacks = await prisma.userFeedback.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      type: true,
      status: true,
      createdAt: true,
    },
  })

  const total = feedbacks.length

  // Count by type
  const byType = feedbacks.reduce((acc, fb) => {
    acc[fb.type] = (acc[fb.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by status
  const byStatus = feedbacks.reduce((acc, fb) => {
    acc[fb.status] = (acc[fb.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by day
  const byDay = feedbacks.reduce((acc, fb) => {
    const day = fb.createdAt.toISOString().split('T')[0]
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate resolution stats
  const resolved = feedbacks.filter(fb => fb.status === 'resolved' || fb.status === 'closed').length
  const resolutionRate = total > 0 ? (resolved / total) * 100 : 0

  return {
    total,
    resolved,
    resolutionRate,
    byType,
    byStatus,
    byDay,
    period: { days, startDate, endDate: new Date() },
  }
}

/**
 * Get trending issues (most reported bugs/features)
 */
export async function getTrendingIssues(
  type: FeedbackType,
  days: number = 7,
  minOccurrences: number = 3
) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const feedbacks = await prisma.userFeedback.findMany({
    where: {
      type,
      createdAt: { gte: startDate },
    },
    select: {
      title: true,
      description: true,
    },
  })

  // Simple keyword extraction (can be enhanced with NLP)
  const keywords = feedbacks
    .flatMap(fb => {
      const text = `${fb.title} ${fb.description}`.toLowerCase()
      return text.split(/\s+/).filter(word => word.length > 4)
    })
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  // Filter by min occurrences and sort
  const trending = Object.entries(keywords)
    .filter(([_, count]) => count >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }))

  return trending
}
