import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { ragService } from '@/lib/rag-service'
import { getUserPlan, PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, chatId, options = {} } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check user's plan and usage limits
    const userPlan = await getUserPlan(session.user.id)
    const planConfig = PLANS[userPlan as keyof typeof PLANS]

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Check RAG query limits for the plan
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const monthlyRagQueries = await prisma.usage.count({
      where: {
        userId: session.user.id,
        type: 'rag_query',
        date: {
          gte: startOfMonth,
        },
      },
    })

    const ragLimit = planConfig.limits.ragQueries || 0
    if (ragLimit > 0 && monthlyRagQueries >= ragLimit) {
      return NextResponse.json({ 
        error: 'RAG query limit exceeded for your plan',
        limit: ragLimit,
        used: monthlyRagQueries,
      }, { status: 429 })
    }

    // Prepare RAG request
    const ragRequest = {
      query: query.trim(),
      userId: session.user.id,
      chatId,
      options: {
        maxContext: Math.min(options.maxContext || 5, planConfig.limits.maxContext || 5),
        minRelevanceScore: options.minRelevanceScore || 0.7,
        includeMetadata: options.includeMetadata !== false,
        model: options.model || planConfig.limits.models[0] || 'gpt-3.5-turbo',
        provider: options.provider || 'openai',
      },
    }

    // Generate RAG response
    const response = await ragService.generateResponse(ragRequest)

    // Log usage
    await prisma.usage.create({
      data: {
        userId: session.user.id,
        type: 'rag_query',
        amount: response.tokenUsage.total,
        metadata: {
          model: ragRequest.options.model,
          provider: ragRequest.options.provider,
          sourcesCount: response.sources.length,
          confidence: response.confidence,
          processingTime: response.processingTime,
        },
      },
    })

    // Update user's token usage
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalTokensUsed: {
          increment: response.tokenUsage.total,
        },
      },
    })

    return NextResponse.json({
      response: response.response,
      sources: response.sources,
      confidence: response.confidence,
      tokenUsage: response.tokenUsage,
      processingTime: response.processingTime,
      metadata: {
        sourcesUsed: response.sources.length,
        avgRelevanceScore: response.sources.length > 0 
          ? response.sources.reduce((sum, s) => sum + s.relevanceScore, 0) / response.sources.length
          : 0,
        model: ragRequest.options.model,
        provider: ragRequest.options.provider,
      },
    })
  } catch (error) {
    console.error('RAG query error:', error)
    
    // Log failed query for debugging
    if (error instanceof Error) {
      console.error('RAG Error Details:', {
        message: error.message,
        stack: error.stack,
      })
    }

    return NextResponse.json(
      { 
        error: 'Failed to process RAG query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Get RAG statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'month' // 'day', 'week', 'month'

    let startDate: Date
    const now = new Date()

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Get usage statistics
    const usageStats = await prisma.usage.findMany({
      where: {
        userId: session.user.id,
        type: 'rag_query',
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'desc' },
    })

    // Calculate statistics
    const totalQueries = usageStats.length
    const totalTokens = usageStats.reduce((sum, usage) => sum + usage.amount, 0)
    const avgProcessingTime = usageStats.length > 0
      ? usageStats.reduce((sum, usage) => sum + (usage.metadata as any)?.processingTime || 0, 0) / usageStats.length
      : 0
    const avgConfidence = usageStats.length > 0
      ? usageStats.reduce((sum, usage) => sum + (usage.metadata as any)?.confidence || 0, 0) / usageStats.length
      : 0

    // Get knowledge base stats
    const kbStats = await ragService.getKnowledgeBaseStats(session.user.id)

    // Get plan limits
    const userPlan = await getUserPlan(session.user.id)
    const planConfig = PLANS[userPlan as keyof typeof PLANS]

    return NextResponse.json({
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      usage: {
        totalQueries,
        totalTokens,
        avgProcessingTime: Math.round(avgProcessingTime),
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
      knowledgeBase: kbStats,
      limits: {
        ragQueries: planConfig?.limits.ragQueries || 0,
        maxContext: planConfig?.limits.maxContext || 5,
        models: planConfig?.limits.models || ['gpt-3.5-turbo'],
      },
      recentQueries: usageStats.slice(0, 10).map(usage => ({
        date: usage.date,
        tokens: usage.amount,
        metadata: usage.metadata,
      })),
    })
  } catch (error) {
    console.error('Error fetching RAG statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch RAG statistics' },
      { status: 500 }
    )
  }
}