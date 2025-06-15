import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics-service'
import { getUserFromSession } from '@/lib/auth'
import { getUserPlan } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(user.id)
    
    // A/B testing only for paid plans
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'A/B testing requires a paid plan' },
        { status: 403 }
      )
    }

    const config = await request.json()
    
    // Validate required fields
    if (!config.name || !config.variants || !config.metric) {
      return NextResponse.json(
        { error: 'Name, variants, and metric are required' },
        { status: 400 }
      )
    }

    const experimentId = await analyticsService.createABTest({
      ...config,
      userId: user.id,
      startDate: new Date(config.startDate || Date.now()),
      endDate: new Date(config.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return NextResponse.json({
      experimentId,
      message: 'A/B test created successfully',
    })
  } catch (error) {
    console.error('A/B test creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const experimentId = searchParams.get('id')

    if (!experimentId) {
      return NextResponse.json(
        { error: 'Experiment ID is required' },
        { status: 400 }
      )
    }

    const results = await analyticsService.analyzeABTestResults(experimentId)

    return NextResponse.json({
      ...results,
      experimentId,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('A/B test analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze A/B test' },
      { status: 500 }
    )
  }
}