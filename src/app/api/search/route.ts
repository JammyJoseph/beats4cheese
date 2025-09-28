import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supaAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bpmMin = parseInt(searchParams.get('bpmMin') || '0')
    const bpmMax = parseInt(searchParams.get('bpmMax') || '300')

    // Validate BPM range
    if (bpmMin < 0 || bpmMax > 300 || bpmMin > bpmMax) {
      return NextResponse.json({ error: 'Invalid BPM range' }, { status: 400 })
    }

    // Query the listings view with BPM filtering
    let query = supabaseAdmin
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply BPM filtering if not default range
    if (bpmMin > 0 || bpmMax < 300) {
      query = query.gte('bpm', bpmMin).lte('bpm', bpmMax)
    }

    const { data: listings, error } = await query

    if (error) {
      console.error('Error fetching listings:', error)
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    return NextResponse.json({
      results: listings || [],
      filters: {
        bpmMin,
        bpmMax
      }
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
