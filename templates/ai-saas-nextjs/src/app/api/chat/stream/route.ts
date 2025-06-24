import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AIService, type AIMessage, type AIServiceConfig } from '@/lib/ai-service'
import { getUserPlan, canUseFeature, PLANS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { message, chatId, model = 'gpt-3.5-turbo', provider = 'openai' } = await request.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userPlan = getUserPlan(user.stripePriceId)
    const currentUsage = {
      tokens: user.totalTokensUsed,
      conversations: user.totalChats,
    }

    // Check if user can use AI features
    if (!canUseFeature(userPlan, currentUsage, 'tokens')) {
      return new Response(JSON.stringify({
        error: 'Token limit exceeded',
        upgrade: true,
        plan: userPlan,
        usage: currentUsage,
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if model is available for user's plan
    const plan = PLANS[userPlan]
    if (!plan.limits.models.includes(model)) {
      return new Response(JSON.stringify({
        error: `Model ${model} not available on ${plan.name} plan`,
        availableModels: plan.limits.models,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
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
        tokens: Math.ceil(message.length / 4),
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
      stream: true,
    }

    // Create streaming response
    const encoder = new TextEncoder()
    let fullResponse = ''
    let totalTokens = 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiService = new AIService()
          const responseStream = await aiService.generateStreamResponse(messages, config)

          for await (const chunk of responseStream) {
            if (chunk.delta) {
              fullResponse += chunk.delta
              totalTokens += chunk.tokens || 0

              // Send chunk to client
              const data = JSON.stringify({
                delta: chunk.delta,
                done: false,
                tokensUsed: totalTokens,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            if (chunk.done) {
              // Save AI response to database
              const responseTokens = Math.ceil(fullResponse.length / 4)
              const totalUsage = Math.ceil(message.length / 4) + responseTokens

              await Promise.all([
                prisma.message.create({
                  data: {
                    chatId: chat.id,
                    role: 'assistant',
                    content: fullResponse,
                    tokens: responseTokens,
                  },
                }),
                prisma.chat.update({
                  where: { id: chat.id },
                  data: { tokensUsed: { increment: totalUsage } },
                }),
                prisma.user.update({
                  where: { id: session.user.id },
                  data: { totalTokensUsed: { increment: totalUsage } },
                }),
              ])

              // Send final chunk
              const finalData = JSON.stringify({
                delta: '',
                done: true,
                tokensUsed: totalUsage,
                chatId: chat.id,
                model,
              })
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
              controller.close()
              break
            }
          }
        } catch (error) {
          console.error('Streaming error:', error)
          const errorData = JSON.stringify({
            error: 'Streaming failed',
            done: true,
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}