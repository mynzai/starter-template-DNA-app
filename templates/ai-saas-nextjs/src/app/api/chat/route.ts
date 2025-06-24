import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AIService, type AIMessage, type AIServiceConfig } from '@/lib/ai-service'
import { getUserPlan, canUseFeature, PLANS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, chatId, model = 'gpt-3.5-turbo', provider = 'openai' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user and check usage limits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripePriceId: true,
        totalTokensUsed: true,
        totalChats: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userPlan = getUserPlan(user.stripePriceId)
    const currentUsage = {
      tokens: user.totalTokensUsed,
      conversations: user.totalChats,
    }

    // Check if user can use AI features
    if (!canUseFeature(userPlan, currentUsage, 'tokens')) {
      return NextResponse.json(
        { 
          error: 'Token limit exceeded',
          upgrade: true,
          plan: userPlan,
          usage: currentUsage,
        },
        { status: 429 }
      )
    }

    // Check if model is available for user's plan
    const plan = PLANS[userPlan]
    if (!plan.limits.models.includes(model)) {
      return NextResponse.json(
        { 
          error: `Model ${model} not available on ${plan.name} plan`,
          availableModels: plan.limits.models,
        },
        { status: 403 }
      )
    }

    // Get or create chat
    let chat
    if (chatId) {
      chat = await prisma.chat.findFirst({
        where: { id: chatId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userId: session.user.id,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          model,
        },
        include: { messages: true },
      })

      // Update user's total chats count
      await prisma.user.update({
        where: { id: session.user.id },
        data: { totalChats: { increment: 1 } },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
        tokens: Math.ceil(message.length / 4), // Rough token estimate
      },
    })

    // Prepare messages for AI
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
      },
      ...chat.messages.map((msg): AIMessage => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    const config: AIServiceConfig = {
      provider: provider as 'openai' | 'anthropic',
      model,
      temperature: 0.7,
      maxTokens: 1000,
      stream: false,
    }

    // Generate AI response
    const aiService = new AIService()
    const response = await aiService.generateResponse(messages, config)

    if (!response) {
      return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
    }

    // Calculate tokens used
    const responseTokens = Math.ceil(response.length / 4)
    const totalTokens = Math.ceil(message.length / 4) + responseTokens

    // Save AI response
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: response,
        tokens: responseTokens,
      },
    })

    // Update chat and user usage
    await Promise.all([
      prisma.chat.update({
        where: { id: chat.id },
        data: { tokensUsed: { increment: totalTokens } },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { totalTokensUsed: { increment: totalTokens } },
      }),
    ])

    return NextResponse.json({
      response,
      chatId: chat.id,
      tokensUsed: totalTokens,
      model,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}