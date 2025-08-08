import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Try to fetch by ID first, then by slug
    let query = supabase
      .from('anime')
      .select(`
        *,
        episodes:episodes(
          id,
          episode_number,
          title,
          release_date,
          duration,
          download_links,
          streaming_links,
          otakudesu_url,
          anoboy_url,
          created_at,
          updated_at
        )
      `)
    
    // Check if id is a UUID (for ID lookup) or string (for slug lookup)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }
    
    const { data: anime, error } = await query.single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Anime not found' },
          { status: 404 }
        )
      }
      
      console.error('Error fetching anime:', error)
      return NextResponse.json(
        { error: 'Failed to fetch anime' },
        { status: 500 }
      )
    }
    
    // Sort episodes by episode number
    if (anime.episodes) {
      anime.episodes.sort((a: any, b: any) => {
        const aNum = parseFloat(a.episode_number) || 0
        const bNum = parseFloat(b.episode_number) || 0
        return aNum - bNum
      })
    }
    
    return NextResponse.json({
      success: true,
      anime
    })
    
  } catch (error) {
    console.error('Error in anime detail API:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}