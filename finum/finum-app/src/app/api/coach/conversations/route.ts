/**
 * GET /api/coach/conversations
 * Get user's conversation list
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get last message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    const formatted = conversations.map(conv => ({
      id: conv.id,
      title: conv.title || 'Conversation',
      lastMessage: conv.messages[0]?.content.substring(0, 100) || '',
      messageCount: conv._count.messages,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    }))

    return NextResponse.json({ conversations: formatted })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
