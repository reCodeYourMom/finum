import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { linkTransactionToBucket } from '@/lib/services/bucket.service'
import { createRuleFromTransaction } from '@/lib/services/rule.service'
import { createDecision } from '@/lib/services/decision.service'

const assignSchema = z.object({
  bucketId: z.string().nullable(),
  createRule: z.boolean().optional(),
  ruleType: z.enum(['merchant', 'category']).optional(),
  justification: z.string().optional(),
})

/**
 * PATCH /api/transactions/[id] - Assign transaction to bucket (optional rule creation)
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
    const data = assignSchema.parse(body)

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        bucketId: true,
        amount: true,
        amountEur: true,
        currency: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (data.bucketId) {
      const bucket = await prisma.bucket.findUnique({
        where: { id: data.bucketId },
        select: { userId: true, allocated: true, spent: true, name: true },
      })

      if (!bucket || bucket.userId !== session.user.id) {
        return NextResponse.json({ error: 'Bucket not found' }, { status: 404 })
      }

      if (data.justification) {
        const amountEur = parseFloat(
          (transaction.amountEur ?? transaction.amount).toString()
        )
        const allocated = parseFloat(bucket.allocated.toString())
        const spent = parseFloat(bucket.spent.toString())
        await createDecision({
          userId: session.user.id,
          type: 'friction_bypass',
          justification: data.justification,
          context: {
            transactionId: id,
            bucketId: data.bucketId,
            bucketName: bucket.name,
            allocated,
            spent,
            amountEur,
            currency: transaction.currency,
          },
        })
      }
    }

    const updated = await linkTransactionToBucket(id, data.bucketId)

    let rule = null
    let ruleError: string | null = null
    if (data.createRule) {
      if (!data.bucketId) {
        return NextResponse.json(
          { error: 'Bucket requis pour créer une règle' },
          { status: 400 }
        )
      }
      try {
        rule = await createRuleFromTransaction(
          id,
          data.bucketId,
          data.ruleType || 'merchant'
        )
      } catch (err: any) {
        ruleError = err.message || 'Erreur lors de la création de règle'
      }
    }

    return NextResponse.json({ transaction: updated, rule, ruleError })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PATCH /api/transactions/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign transaction' },
      { status: 500 }
    )
  }
}
