import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth'
import { getQueueStats } from '@/lib/redis'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await checkAdminAccess()
    
    // Get queue statistics
    const queueStats = await getQueueStats()
    
    // Get database statistics
    const [animeCount, episodeCount, jobStats] = await Promise.all([
      // Count total anime
      supabaseAdmin
        .from('anime')
        .select('*', { count: 'exact', head: true }),
      
      // Count total episodes
      supabaseAdmin
        .from('episodes')
        .select('*', { count: 'exact', head: true }),
      
      // Get job statistics
      supabaseAdmin
        .from('scrape_jobs')
        .select('status')
    ])
    
    // Process job statistics
    const jobStatusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
    
    if (jobStats.data) {
      jobStats.data.forEach((job: any) => {
        if (job.status in jobStatusCounts) {
          jobStatusCounts[job.status as keyof typeof jobStatusCounts]++
        }
      })
    }
    
    // Get recent jobs (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentJobs } = await supabaseAdmin
      .from('scrape_jobs')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      success: true,
      stats: {
        queue: queueStats,
        database: {
          totalAnime: animeCount.count || 0,
          totalEpisodes: episodeCount.count || 0,
          totalJobs: jobStats.data?.length || 0
        },
        jobs: {
          byStatus: jobStatusCounts,
          recent: recentJobs || []
        }
      }
    })
    
  } catch (error) {
    console.error('Error in queue stats API:', error)
    
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