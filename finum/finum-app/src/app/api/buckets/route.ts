import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createBucket,
  getBuckets,
  getBucketsSummary,
} from '@/lib/services/bucket.service'
import { z } from 'zod'

const bucketSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  allocated: z.number().positive('Le montant alloué doit être positif'),
  period: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'La période doit être monthly ou annual' }),
  }),
  category: z.string().optional(),
  color: z.string().optional(),
  budgetId: z.string().optional(),
})

/**
 * GET /api/buckets
 * Liste tous les buckets de l'utilisateur connecté
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budgetId') || undefined
    const period = searchParams.get('period') || undefined
    const summary = searchParams.get('summary') === 'true'

    if (summary) {
      const summaryData = await getBucketsSummary(session.user.id)
      return NextResponse.json(summaryData)
    }

    const buckets = await getBuckets(session.user.id, { budgetId, period })

    return NextResponse.json({
      buckets,
      count: buckets.length,
    })
  } catch (error) {
    console.error('Error fetching buckets:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des buckets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/buckets
 * Créer un nouveau bucket
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bucketSchema.parse(body)

    const bucket = await createBucket(session.user.id, validatedData)

    return NextResponse.json(bucket, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating bucket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du bucket' },
      { status: 500 }
    )
  }
}
