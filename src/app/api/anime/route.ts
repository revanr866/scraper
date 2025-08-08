import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: z.enum(['ongoing', 'completed', 'upcoming']).optional(),
  type: z.enum(['tv', 'movie', 'ova', 'ona', 'special']).optional(),
  genre: z.string().optional(),
  year: z.string().optional(),
  sort: z.enum(['title', 'rating', 'release_date', 'created_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = querySchema.parse(queryParams)
    
    const page = parseInt(validatedQuery.page)
    const limit = parseInt(validatedQuery.limit)
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabase
      .from('anime')
      .select(`
        *,
        episodes:episodes(count)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(validatedQuery.sort, { ascending: validatedQuery.order === 'asc' })
    
    // Apply filters
    if (validatedQuery.search) {
      query = query.or(`title.ilike.%${validatedQuery.search}%,japanese_title.ilike.%${validatedQuery.search}%,synopsis.ilike.%${validatedQuery.search}%`)
    }
    
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status)
    }
    
    if (validatedQuery.type) {
      query = query.eq('type', validatedQuery.type)
    }
    
    if (validatedQuery.genre) {
      query = query.contains('genres', [validatedQuery.genre])
    }
    
    if (validatedQuery.year) {
      const year = parseInt(validatedQuery.year)
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte('release_date', startDate).lte('release_date', endDate)
    }
    
    const { data: anime, error, count } = await query
    
    if (error) {
      console.error('Error fetching anime:', error)
      return NextResponse.json(
        { error: 'Failed to fetch anime' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      anime: anime || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Error in anime API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}