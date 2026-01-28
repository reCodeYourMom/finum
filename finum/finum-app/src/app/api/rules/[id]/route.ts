import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { updateRule, deleteRule } from '@/lib/services/rule.service'

const conditionSchema = z.object({
  merchant: z.string().optional(),
  merchantContains: z.string().optional(),
  category: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
})

const ruleUpdateSchema = z.object({
  type: z.enum(['merchant', 'category', 'amount_range', 'merchant_category']).optional(),
  condition: conditionSchema.optional(),
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
 * PATCH /api/rules/[id] - Update a rule
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = ruleUpdateSchema.parse(body)

    const existing = await prisma.rule.findUnique({
      where: { id },
      include: {
        bucket: { select: { userId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (existing.bucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (data.condition || data.type) {
      const nextType = data.type || existing.type
      const nextCondition = data.condition || (existing.condition as any)
      const conditionError = validateRuleCondition(nextType, nextCondition)
      if (conditionError) {
        return NextResponse.json({ error: conditionError }, { status: 400 })
      }
    }

    const rule = await updateRule(id, data)

    return NextResponse.json(rule)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PATCH /api/rules/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rules/[id] - Delete a rule
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.rule.findUnique({
      where: { id },
      include: {
        bucket: { select: { userId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (existing.bucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await deleteRule(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/rules/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete rule' },
      { status: 500 }
    )
  }
}
