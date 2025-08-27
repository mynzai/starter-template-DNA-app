import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics-service'
import { getUserFromSession } from '@/lib/auth'
import { getUserPlan } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getUserPlan(user.id)
    
    // Check plan restrictions
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'AI insights require a paid plan' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    const insights = await analyticsService.generateInsights(user.id, timeRange)

    return NextResponse.json({
      insights,
      timeRange,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}