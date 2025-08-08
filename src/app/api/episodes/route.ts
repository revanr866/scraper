import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  animeId: z.string().uuid().optional(),
  animeSlug: z.string().optional(),
  episodeNumber: z.string().optional(),
  sort: z.enum(['episode_number', 'release_date', 'created_at']).optional().default('episode_number'),
  order: z.enum(['asc', 'desc']).optional().default('asc')
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
      .from('episodes')
      .select(`
        *,
        anime:anime_id(
          id,
          title,
          slug,
          poster_url
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(validatedQuery.sort, { ascending: validatedQuery.order === 'asc' })
    
    // Apply filters
    if (validatedQuery.animeId) {
      query = query.eq('anime_id', validatedQuery.animeId)
    }
    
    if (validatedQuery.animeSlug) {
      // First get anime ID from slug
      const { data: animeData } = await supabase
        .from('anime')
        .select('id')
        .eq('slug', validatedQuery.animeSlug)
        .single()
      
      if (animeData) {
        query = query.eq('anime_id', animeData.id)
      } else {
        // If anime not found, return empty result
        return NextResponse.json({
          success: true,
          episodes: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        })
      }
    }
    
    if (validatedQuery.episodeNumber) {
      query = query.eq('episode_number', validatedQuery.episodeNumber)
    }
    
    const { data: episodes, error, count } = await query
    
    if (error) {
      console.error('Error fetching episodes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch episodes' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      episodes: episodes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Error in episodes API:', error)
    
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