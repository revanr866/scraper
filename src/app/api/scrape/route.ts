import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { addScrapeJob } from '@/lib/redis'
import { z } from 'zod'

const scrapeJobSchema = z.object({
  type: z.enum(['anime', 'episode', 'batch']),
  source: z.enum(['otakudesu', 'anoboy']).optional(),
  targetUrl: z.string().url(),
  targetSlug: z.string().optional(),
  animeId: z.string().uuid().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const userId = await checkAdminAccess()
    
    // Parse request body
    const body = await request.json()
    const validatedData = scrapeJobSchema.parse(body)
    
    // Extract slug from URL if not provided
    let targetSlug = validatedData.targetSlug
    if (!targetSlug) {
      const urlParts = validatedData.targetUrl.split('/')
      targetSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]
    }
    
    // Determine source from URL if not provided
    let source = validatedData.source
    if (!source) {
      if (validatedData.targetUrl.includes('otakudesu')) {
        source = 'otakudesu'
      } else if (validatedData.targetUrl.includes('anoboy')) {
        source = 'anoboy'
      } else {
        source = 'otakudesu' // Default to otakudesu
      }
    }
    
    // Create job record in database
    const { data: job, error } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        type: validatedData.type,
        source,
        target_url: validatedData.targetUrl,
        target_slug: targetSlug,
        anime_id: validatedData.animeId,
        status: 'pending',
        progress: 0,
        created_by: userId
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json(
        { error: 'Failed to create scrape job' },
        { status: 500 }
      )
    }
    
    // Add job to queue
    const queueJob = await addScrapeJob({
      id: job.id,
      type: validatedData.type,
      source,
      targetUrl: validatedData.targetUrl,
      targetSlug,
      animeId: validatedData.animeId,
      createdBy: userId
    })
    
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        queueId: queueJob.id,
        type: job.type,
        source: job.source,
        targetUrl: job.target_url,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at
      }
    })
    
  } catch (error) {
    console.error('Error in scrape API:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await checkAdminAccess()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    
    const offset = (page - 1) * limit
    
    // Build query
    let query = supabaseAdmin
      .from('scrape_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data: jobs, error, count } = await query
    
    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
    
  } catch (error) {
    console.error('Error in scrape API GET:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}