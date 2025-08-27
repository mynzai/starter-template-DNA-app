import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const chats = await prisma.chat.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the last message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    const total = await prisma.chat.count({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      chats: chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        tokensUsed: chat.tokensUsed,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat._count.messages,
        lastMessage: chat.messages[0] || null,
      })),
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Get chats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}