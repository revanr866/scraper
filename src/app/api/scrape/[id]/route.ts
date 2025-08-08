import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateJobSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  progress: z.number().min(0).max(100).optional(),
  error_message: z.string().optional(),
  result: z.any().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    await checkAdminAccess()
    
    const resolvedParams = await params
    const { data: job, error } = await supabaseAdmin
      .from('scrape_jobs')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching job:', error)
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      job
    })
    
  } catch (error) {
    console.error('Error in scrape job GET:', error)
    
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    await checkAdminAccess()
    
    const resolvedParams = await params
    
    // Parse request body
    const body = await request.json()
    const validatedData = updateJobSchema.parse(body)
    
    // Update job in database
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }
    
    const { data: job, error } = await supabaseAdmin
      .from('scrape_jobs')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      
      console.error('Error updating job:', error)
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      job
    })
    
  } catch (error) {
    console.error('Error in scrape job PATCH:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin access
    await checkAdminAccess()
    
    const resolvedParams = await params
    
    // Delete job from database
    const { error } = await supabaseAdmin
      .from('scrape_jobs')
      .delete()
      .eq('id', resolvedParams.id)
    
    if (error) {
      console.error('Error deleting job:', error)
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in scrape job DELETE:', error)
    
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