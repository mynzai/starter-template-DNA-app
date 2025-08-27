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
    
    // Natural language queries only for premium plans
    if (plan !== 'premium' && plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Natural language queries require premium plan' },
        { status: 403 }
      )
    }

    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const result = await analyticsService.naturalLanguageQuery(query, user.id)

    return NextResponse.json({
      ...result,
      query,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Natural language query error:', error)
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    )
  }
}