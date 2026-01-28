import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  createRule,
  getRulesByBucket,
  getRulesByUser,
  getRulesStats,
} from '@/lib/services/rule.service'

const conditionSchema = z.object({
  merchant: z.string().optional(),
  merchantContains: z.string().optional(),
  category: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
})

const ruleSchema = z.object({
  bucketId: z.string(),
  type: z.enum(['merchant', 'category', 'amount_range', 'merchant_category']),
  condition: conditionSchema,
  priority: z.number().int().optional(),
})

function validateRuleCondition(type: string, condition: any) {
  if (type === 'merchant' && !condition.merchant) {
    return 'Le marchand est requis'
  }
  if (type === 'category' && !condition.category) {
    return 'La catégorie est requise'
  }
  if (
    type === 'amount_range' &&
    condition.minAmount === undefined &&
    condition.maxAmount === undefined
  ) {
    return 'Un minimum ou un maximum est requis'
  }
  if (type === 'amount_range') {
    if (
      condition.minAmount !== undefined &&
      condition.maxAmount !== undefined &&
      condition.minAmount > condition.maxAmount
    ) {
      return 'Le minimum doit être inférieur au maximum'
    }
  }
  if (
    type === 'merchant_category' &&
    !condition.merchantContains &&
    !condition.category
  ) {
    return 'Merchant ou catégorie requis'
  }
  return null
}

/**
 * GET /api/rules - List rules for current user (optional bucketId or stats)
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bucketId = searchParams.get('bucketId')
    const stats = searchParams.get('stats') === 'true'

    if (stats) {
      const data = await getRulesStats(session.user.id)
      return NextResponse.json({ stats: data, count: data.length })
    }

    if (bucketId) {
      const bucket = await prisma.bucket.findUnique({
        where: { id: bucketId },
        select: { userId: true },
      })

      if (!bucket || bucket.userId !== session.user.id) {
        return NextResponse.json({ error: 'Bucket not found' }, { status: 404 })
      }

      const rules = await getRulesByBucket(bucketId)
      return NextResponse.json({ rules, count: rules.length })
    }

    const rules = await getRulesByUser(session.user.id)
    return NextResponse.json({ rules, count: rules.length })
  } catch (error: any) {
    console.error('GET /api/rules error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rules - Create a rule
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = ruleSchema.parse(body)

    const bucket = await prisma.bucket.findUnique({
      where: { id: data.bucketId },
      select: { userId: true },
    })

    if (!bucket || bucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 })
    }

    const conditionError = validateRuleCondition(data.type, data.condition)
    if (conditionError) {
      return NextResponse.json({ error: conditionError }, { status: 400 })
    }

    const rule = await createRule({
      bucketId: data.bucketId,
      type: data.type,
      condition: data.condition,
      priority: data.priority,
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('POST /api/rules error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create rule' },
      { status: 500 }
    )
  }
}
