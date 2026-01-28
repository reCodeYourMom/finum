import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getBucketById,
  updateBucket,
  deleteBucket,
  getBucketStats,
} from '@/lib/services/bucket.service'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const bucketUpdateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  allocated: z.number().positive('Le montant alloué doit être positif').optional(),
  period: z.enum(['monthly', 'annual']).optional(),
  category: z.string().optional(),
  color: z.string().optional(),
})

/**
 * GET /api/buckets/[id]
 * Récupérer un bucket par ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    const bucket = await getBucketById(id)

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket non trouvé' }, { status: 404 })
    }

    // Vérifier que le bucket appartient à l'utilisateur
    if (bucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (includeStats) {
      const stats = await getBucketStats(id)
      return NextResponse.json({ ...bucket, stats })
    }

    return NextResponse.json(bucket)
  } catch (error) {
    console.error('Error fetching bucket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du bucket' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/buckets/[id]
 * Mettre à jour un bucket
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Vérifier que le bucket appartient à l'utilisateur
    const existingBucket = await prisma.bucket.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingBucket) {
      return NextResponse.json({ error: 'Bucket non trouvé' }, { status: 404 })
    }

    if (existingBucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const validatedData = bucketUpdateSchema.parse(body)
    const bucket = await updateBucket(id, validatedData)

    return NextResponse.json(bucket)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating bucket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du bucket' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/buckets/[id]
 * Supprimer un bucket
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le bucket appartient à l'utilisateur
    const existingBucket = await prisma.bucket.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingBucket) {
      return NextResponse.json({ error: 'Bucket non trouvé' }, { status: 404 })
    }

    if (existingBucket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await deleteBucket(id)

    return NextResponse.json({ success: true, message: 'Bucket supprimé' })
  } catch (error) {
    console.error('Error deleting bucket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du bucket' },
      { status: 500 }
    )
  }
}
