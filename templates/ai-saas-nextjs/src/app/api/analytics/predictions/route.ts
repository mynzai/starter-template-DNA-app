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
    
    // Predictive analytics only for premium plans
    if (plan !== 'premium' && plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Predictive analytics require premium plan' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'active_users'
    const forecastDays = parseInt(searchParams.get('days') || '30')

    const predictions = await analyticsService.getPredictiveAnalytics(
      user.id,
      metric,
      forecastDays
    )

    return NextResponse.json({
      predictions,
      metric,
      forecastDays,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Predictive analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}