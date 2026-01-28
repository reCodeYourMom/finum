import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type DecisionType =
  | 'override'
  | 'friction_bypass'
  | 'pattern_action'
  | 'weekly_review'

export interface DecisionCreateInput {
  userId: string
  type: DecisionType
  context?: Prisma.InputJsonValue
  justification?: string
}

export async function createDecision(input: DecisionCreateInput) {
  return prisma.decision.create({
    data: {
      userId: input.userId,
      type: input.type,
      context: input.context || {},
      justification: input.justification,
    },
  })
}

export async function getLatestDecisionByType(userId: string, type: DecisionType) {
  return prisma.decision.findFirst({
    where: { userId, type },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDecisions(userId: string, type?: DecisionType, take = 20) {
  return prisma.decision.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
}
