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
    const {
      type,
      language,
      framework,
      description,
      context,
      options,
    } = body

    if (!type || !language || !description) {
      return NextResponse.json({ 
        error: 'Type, language, and description are required' 
      }, { status: 400 })
    }

    if (description.length > 2000) {
      return NextResponse.json({ 
        error: 'Description too long (max 2000 characters)' 
      }, { status: 400 })
    }

    // Check user's plan and usage limits
    const userPlan = await getUserPlan(session.user.id)
    const planConfig = PLANS[userPlan as keyof typeof PLANS]

    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Check code generation limits
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const monthlyGenerations = await prisma.usage.count({
      where: {
        userId: session.user.id,
        type: 'code_generation',
        date: {
          gte: startOfMonth,
        },
      },
    })

    const generationLimit = planConfig.limits.codeGenerations || 5
    if (generationLimit > 0 && monthlyGenerations >= generationLimit) {
      return NextResponse.json({ 
        error: 'Code generation limit exceeded for your plan',
        limit: generationLimit,
        used: monthlyGenerations,
      }, { status: 429 })
    }

    // Validate language and framework support
    const supportedLanguages = ['typescript', 'javascript', 'python', 'java', 'go']
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json({ 
        error: `Language ${language} not supported. Supported: ${supportedLanguages.join(', ')}` 
      }, { status: 400 })
    }

    // Generate code
    const startTime = Date.now()
    const generationRequest = {
      type,
      language,
      framework,
      description,
      context: context || {},
      options: {
        includeComments: options?.includeComments ?? true,
        includeTests: options?.includeTests ?? (userPlan !== 'FREE'),
        includeTypes: options?.includeTypes ?? true,
        stylePreference: options?.stylePreference || 'functional',
        ...options,
      },
    }

    const result = await codeGenerationService.generateCode(generationRequest)
    const processingTime = Date.now() - startTime

    // Log usage with token estimation
    const estimatedTokens = Math.ceil(result.code.length / 4) + Math.ceil(description.length / 4)
    
    await prisma.usage.create({
      data: {
        userId: session.user.id,
        type: 'code_generation',
        amount: estimatedTokens,
        metadata: {
          generationType: type,
          language,
          framework,
          codeLength: result.code.length,
          includeTests: !!result.tests,
          includeDocumentation: !!result.documentation,
          qualityScore: result.quality.score,
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

    // Filter results based on plan
    let filteredResult = result

    if (userPlan === 'FREE') {
      // Free plan gets basic generation only
      filteredResult = {
        ...result,
        tests: undefined,
        documentation: undefined,
        quality: {
          score: result.quality.score,
          suggestions: [],
        },
      }
    } else if (userPlan === 'STARTER') {
      // Starter plan gets limited features
      filteredResult = {
        ...result,
        quality: {
          score: result.quality.score,
          suggestions: result.quality.suggestions.slice(0, 3),
        },
      }
    }

    return NextResponse.json({
      result: filteredResult,
      metadata: {
        processingTime,
        tokensUsed: estimatedTokens,
        planLimits: {
          generationLimit,
          used: monthlyGenerations + 1,
          remaining: Math.max(0, generationLimit - monthlyGenerations - 1),
        },
      },
    })
  } catch (error) {
    console.error('Code generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Get generation templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language')
    const framework = searchParams.get('framework')
    const category = searchParams.get('category')

    const filters: any = {}
    if (language) filters.language = language
    if (framework) filters.framework = framework
    if (category) filters.category = category

    const templates = codeGenerationService.getTemplates(filters)

    return NextResponse.json({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        language: template.language,
        framework: template.framework,
        category: template.category,
        variables: template.variables,
        examples: template.examples.map(example => ({
          name: example.name,
          description: example.description,
        })),
      })),
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}