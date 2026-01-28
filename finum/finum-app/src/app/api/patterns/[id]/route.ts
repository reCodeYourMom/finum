import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { updatePatternStatus } from '@/lib/services/pattern.service'

const statusSchema = z.object({
  status: z.enum(['detected', 'budgeted', 'ignored']),
})

/**
 * PATCH /api/patterns/[id] - Update pattern status
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
    const data = statusSchema.parse(body)

    const existing = await prisma.pattern.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pattern = await updatePatternStatus(id, data.status)

    return NextResponse.json(pattern)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PATCH /api/patterns/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update pattern' },
      { status: 500 }
    )
  }
}
