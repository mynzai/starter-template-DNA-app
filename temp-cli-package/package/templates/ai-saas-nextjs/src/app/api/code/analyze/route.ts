import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { codeAnalysisService } from '@/lib/code-analysis'
import { getUserPlan, PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, filename, language } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    if (code.length > 50000) {
      return NextResponse.json({ 
        error: 'Code too large (max 50KB)' 
      }, { status: 400 })
    }

    // Check user's plan and usage limits
    const userPlan = await getUserPlan(session.user.id)
    const planConfig = PLANS[userPlan as keyof typeof PLANS]

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Check code analysis limits
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const monthlyAnalyses = await prisma.usage.count({
      where: {
        userId: session.user.id,
        type: 'code_analysis',
        date: {
          gte: startOfMonth,
        },
      },
    })

    const analysisLimit = planConfig.limits.codeAnalyses || 10
    if (analysisLimit > 0 && monthlyAnalyses >= analysisLimit) {
      return NextResponse.json({ 
        error: 'Code analysis limit exceeded for your plan',
        limit: analysisLimit,
        used: monthlyAnalyses,
      }, { status: 429 })
    }

    // Perform code analysis
    const startTime = Date.now()
    const analysis = await codeAnalysisService.analyzeCode(code, filename)
    const processingTime = Date.now() - startTime

    // Log usage
    await prisma.usage.create({
      data: {
        userId: session.user.id,
        type: 'code_analysis',
        amount: 1,
        metadata: {
          language: analysis.language,
          framework: analysis.framework,
          linesOfCode: analysis.complexity.linesOfCode,
          complexity: analysis.complexity.cyclomaticComplexity,
          processingTime,
        },
      },
    })

    // Filter results based on plan
    let filteredAnalysis = analysis

    if (userPlan === 'FREE') {
      // Free plan gets basic analysis only
      filteredAnalysis = {
        ...analysis,
        suggestions: analysis.suggestions.slice(0, 3),
        security: {
          vulnerabilities: [],
          score: 0,
        },
        performance: {
          issues: [],
          score: 0,
        },
      }
    } else if (userPlan === 'STARTER') {
      // Starter plan gets limited detailed analysis
      filteredAnalysis = {
        ...analysis,
        suggestions: analysis.suggestions.slice(0, 10),
        security: {
          vulnerabilities: analysis.security.vulnerabilities.slice(0, 5),
          score: analysis.security.score,
        },
      }
    }

    return NextResponse.json({
      analysis: filteredAnalysis,
      metadata: {
        processingTime,
        planLimits: {
          analysisLimit,
          used: monthlyAnalyses + 1,
          remaining: Math.max(0, analysisLimit - monthlyAnalyses - 1),
        },
      },
    })
  } catch (error) {
    console.error('Code analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Get analysis history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const analyses = await prisma.usage.findMany({
      where: {
        userId: session.user.id,
        type: 'code_analysis',
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        date: true,
        metadata: true,
      },
    })

    const total = await prisma.usage.count({
      where: {
        userId: session.user.id,
        type: 'code_analysis',
      },
    })

    return NextResponse.json({
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        date: analysis.date,
        language: (analysis.metadata as any)?.language,
        framework: (analysis.metadata as any)?.framework,
        linesOfCode: (analysis.metadata as any)?.linesOfCode,
        complexity: (analysis.metadata as any)?.complexity,
        processingTime: (analysis.metadata as any)?.processingTime,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching analysis history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis history' },
      { status: 500 }
    )
  }
}