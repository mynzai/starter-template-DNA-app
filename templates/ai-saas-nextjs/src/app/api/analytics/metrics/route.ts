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
        { error: 'Analytics features require a paid plan' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    const metrics = await analyticsService.getKeyMetrics(user.id, timeRange)

    return NextResponse.json({
      metrics,
      timeRange,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics metrics' },
      { status: 500 }
    )
  }
}