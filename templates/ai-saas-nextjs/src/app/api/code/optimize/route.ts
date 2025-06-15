import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { codeGenerationService } from '@/lib/code-generation'
import { getUserPlan, PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, language, optimizationType } = body

    if (!code || !language || !optimizationType) {
      return NextResponse.json({ 
        error: 'Code, language, and optimization type are required' 
      }, { status: 400 })
    }

    if (code.length > 50000) {
      return NextResponse.json({ 
        error: 'Code too large (max 50KB)' 
      }, { status: 400 })
    }

    const validOptimizationTypes = ['performance', 'readability', 'security']
    if (!validOptimizationTypes.includes(optimizationType)) {
      return NextResponse.json({ 
        error: `Invalid optimization type. Valid types: ${validOptimizationTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Check user's plan and usage limits
    const userPlan = await getUserPlan(session.user.id)
    const planConfig = PLANS[userPlan as keyof typeof PLANS]

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Check if user can access optimization features
    if (userPlan === 'FREE') {
      return NextResponse.json({ 
        error: 'Code optimization is not available on the free plan. Please upgrade to access this feature.' 
      }, { status: 403 })
    }

    // Check optimization limits
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const monthlyOptimizations = await prisma.usage.count({
      where: {
        userId: session.user.id,
        type: 'code_optimization',
        date: {
          gte: startOfMonth,
        },
      },
    })

    const optimizationLimit = planConfig.limits.codeOptimizations || 10
    if (optimizationLimit > 0 && monthlyOptimizations >= optimizationLimit) {
      return NextResponse.json({ 
        error: 'Code optimization limit exceeded for your plan',
        limit: optimizationLimit,
        used: monthlyOptimizations,
      }, { status: 429 })
    }

    // Perform code optimization
    const startTime = Date.now()
    const result = await codeGenerationService.optimizeCode(code, language, optimizationType)
    const processingTime = Date.now() - startTime

    // Calculate improvement metrics
    const originalLines = code.split('\n').length
    const optimizedLines = result.code.split('\n').length
    const lineDifference = optimizedLines - originalLines
    const improvement = result.quality.score - 50 // Assume original score around 50

    // Log usage
    const estimatedTokens = Math.ceil((code.length + result.code.length) / 4)
    
    await prisma.usage.create({
      data: {
        userId: session.user.id,
        type: 'code_optimization',
        amount: estimatedTokens,
        metadata: {
          optimizationType,
          language,
          originalLines,
          optimizedLines,
          lineDifference,
          qualityImprovement: improvement,
          processingTime,
        },
      },
    })

    // Update user's token usage
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalTokensUsed: {
          increment: estimatedTokens,
        },
      },
    })

    return NextResponse.json({
      result,
      metrics: {
        originalLines,
        optimizedLines,
        lineDifference,
        qualityImprovement: Math.max(0, improvement),
        processingTime,
        tokensUsed: estimatedTokens,
      },
      planLimits: {
        optimizationLimit,
        used: monthlyOptimizations + 1,
        remaining: Math.max(0, optimizationLimit - monthlyOptimizations - 1),
      },
    })
  } catch (error) {
    console.error('Code optimization error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to optimize code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}