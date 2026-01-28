/**
 * POST /api/coach/chat
 * Handle chat messages with AI coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleChatMessage, type UserFinancialContext } from '@/lib/services/ai/ai-coach.service'
import { isConfigured } from '@/lib/services/ai/ai.service'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if AI is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const userId = session.user.id
    const body = await req.json()
    const { message, conversationId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10, // Last 10 messages for context
          },
        },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: message.substring(0, 50), // Use first 50 chars as title
        },
        include: {
          messages: true,
        },
      })
    }

    // Prepare financial context
    const monthStart = startOfMonth(new Date())
    const monthEnd = endOfMonth(new Date())

    const [buckets, transactions, patterns] = await Promise.all([
      prisma.bucket.findMany({
        where: { userId, period: 'monthly' },
        select: {
          name: true,
          allocated: true,
          spent: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          date: true,
          merchant: true,
          amount: true,
          amountEur: true,
          category: true,
        },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.pattern.findMany({
        where: { userId },
        select: {
          merchantNorm: true,
          frequency: true,
          avgAmount: true,
          projectedAnnual: true,
        },
        take: 5,
      }),
    ])

    const bucketsOverspent = buckets
      .filter(b => parseFloat(b.spent.toString()) > parseFloat(b.allocated.toString()))
      .map(b => ({
        name: b.name,
        allocated: parseFloat(b.allocated.toString()),
        spent: parseFloat(b.spent.toString()),
        overspend: parseFloat(b.spent.toString()) - parseFloat(b.allocated.toString()),
      }))

    const context: UserFinancialContext = {
      userId,
      totalBudget: buckets.reduce((sum, b) => sum + parseFloat(b.allocated.toString()), 0),
      bucketsOverspent,
      recentTransactions: transactions.map(tx => ({
        date: tx.date.toISOString().split('T')[0],
        merchant: tx.merchant,
        amount: parseFloat(tx.amountEur?.toString() || tx.amount.toString()),
        category: tx.category || undefined,
      })),
      patterns: patterns.map(p => ({
        merchant: p.merchantNorm,
        frequency: p.frequency,
        avgAmount: parseFloat(p.avgAmount.toString()),
        projectedAnnual: parseFloat(p.projectedAnnual.toString()),
      })),
    }

    // Get conversation history
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Handle chat with AI
    const response = await handleChatMessage(message, context, conversationHistory)

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Save assistant response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: response.message,
        metadata: {
          sources: response.sources,
          usage: response.usage,
          fromCache: response.fromCache,
        },
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: response.message,
      sources: response.sources,
      fromCache: response.fromCache,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
