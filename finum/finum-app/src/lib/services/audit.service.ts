/**
 * Audit Service - Track critical user actions
 * Records important operations for compliance, debugging, and analytics
 */

import { prisma } from '@/lib/prisma'
import { createServiceLogger } from '@/lib/logger'

const logger = createServiceLogger('audit', 'logging')

export interface AuditLogInput {
  userId: string
  action: string
  entityType?: string
  entityId?: string
  changes?: {
    before?: any
    after?: any
  }
  metadata?: Record<string, any>
}

/**
 * Record an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes,
        metadata: input.metadata,
      },
    })

    logger.debug('Audit log created', {
      userId: input.userId,
      action: input.action,
    })
  } catch (error) {
    // Don't throw - audit logging should never break the app
    logger.error('Failed to create audit log', error as Error, {
      action: input.action,
      userId: input.userId,
    })
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options: {
    limit?: number
    action?: string
    startDate?: Date
    endDate?: Date
  } = {}
) {
  const { limit = 50, action, startDate, endDate } = options

  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(action && { action }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get audit logs for an entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
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
 * Convenience functions for common audit actions
 */

export async function auditBudgetCreate(userId: string, budgetId: string, data: any) {
  return createAuditLog({
    userId,
    action: 'budget.create',
    entityType: 'Budget',
    entityId: budgetId,
    changes: { after: data },
  })
}

export async function auditBudgetUpdate(
  userId: string,
  budgetId: string,
  before: any,
  after: any
) {
  return createAuditLog({
    userId,
    action: 'budget.update',
    entityType: 'Budget',
    entityId: budgetId,
    changes: { before, after },
  })
}

export async function auditBudgetDelete(userId: string, budgetId: string, data: any) {
  return createAuditLog({
    userId,
    action: 'budget.delete',
    entityType: 'Budget',
    entityId: budgetId,
    changes: { before: data },
  })
}

export async function auditTransactionImport(
  userId: string,
  importFile: string,
  stats: { created: number; duplicates: number; errors: number }
) {
  return createAuditLog({
    userId,
    action: 'transaction.import',
    metadata: {
      importFile,
      ...stats,
    },
  })
}

export async function auditBucketCreate(userId: string, bucketId: string, data: any) {
  return createAuditLog({
    userId,
    action: 'bucket.create',
    entityType: 'Bucket',
    entityId: bucketId,
    changes: { after: data },
  })
}

export async function auditBucketUpdate(
  userId: string,
  bucketId: string,
  before: any,
  after: any
) {
  return createAuditLog({
    userId,
    action: 'bucket.update',
    entityType: 'Bucket',
    entityId: bucketId,
    changes: { before, after },
  })
}

export async function auditRuleCreate(userId: string, ruleId: string, data: any) {
  return createAuditLog({
    userId,
    action: 'rule.create',
    entityType: 'Rule',
    entityId: ruleId,
    changes: { after: data },
  })
}

export async function auditRuleDelete(userId: string, ruleId: string, data: any) {
  return createAuditLog({
    userId,
    action: 'rule.delete',
    entityType: 'Rule',
    entityId: ruleId,
    changes: { before: data },
  })
}

export async function auditDecision(
  userId: string,
  decisionType: string,
  context: any,
  justification?: string
) {
  return createAuditLog({
    userId,
    action: `decision.${decisionType}`,
    metadata: {
      context,
      justification,
    },
  })
}

export async function auditAIInteraction(
  userId: string,
  interactionType: 'chat' | 'weekly_review' | 'categorization',
  metadata: {
    tokens?: { input: number; output: number }
    cost?: number
    cached?: boolean
  }
) {
  return createAuditLog({
    userId,
    action: `ai.${interactionType}`,
    metadata,
  })
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(userId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: {
      action: true,
      createdAt: true,
    },
  })

  // Count by action
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by day
  const dailyCounts = logs.reduce((acc, log) => {
    const day = log.createdAt.toISOString().split('T')[0]
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total: logs.length,
    byAction: actionCounts,
    byDay: dailyCounts,
    period: { days, startDate, endDate: new Date() },
  }
}
