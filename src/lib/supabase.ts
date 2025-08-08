import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Database = {
  public: {
    Tables: {
      anime: {
        Row: {
          id: string
          title: string
          japanese_title: string | null
          slug: string
          poster: string | null
          synopsis: string | null
          rating: string | null
          type: string | null
          status: string | null
          episode_count: string | null
          duration: string | null
          release_date: string | null
          studio: string | null
          genres: string[] | null
          mal_id: number | null
          mal_data: any | null
          otakudesu_url: string | null
          anoboy_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          japanese_title?: string | null
          slug: string
          poster?: string | null
          synopsis?: string | null
          rating?: string | null
          type?: string | null
          status?: string | null
          episode_count?: string | null
          duration?: string | null
          release_date?: string | null
          studio?: string | null
          genres?: string[] | null
          mal_id?: number | null
          mal_data?: any | null
          otakudesu_url?: string | null
          anoboy_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          japanese_title?: string | null
          slug?: string
          poster?: string | null
          synopsis?: string | null
          rating?: string | null
          type?: string | null
          status?: string | null
          episode_count?: string | null
          duration?: string | null
          release_date?: string | null
          studio?: string | null
          genres?: string[] | null
          mal_id?: number | null
          mal_data?: any | null
          otakudesu_url?: string | null
          anoboy_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          id: string
          anime_id: string
          episode_number: number
          title: string | null
          slug: string
          otakudesu_url: string | null
          anoboy_url: string | null
          download_links: any | null
          streaming_links: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anime_id: string
          episode_number: number
          title?: string | null
          slug: string
          otakudesu_url?: string | null
          anoboy_url?: string | null
          download_links?: any | null
          streaming_links?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anime_id?: string
          episode_number?: number
          title?: string | null
          slug?: string
          otakudesu_url?: string | null
          anoboy_url?: string | null
          download_links?: any | null
          streaming_links?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      scrape_jobs: {
        Row: {
          id: string
          type: 'anime' | 'episode' | 'batch'
          status: 'pending' | 'processing' | 'completed' | 'failed'
          source: 'otakudesu' | 'anoboy'
          target_url: string
          target_slug: string | null
          anime_id: string | null
          progress: number
          error_message: string | null
          result_data: any | null
          created_by: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          type: 'anime' | 'episode' | 'batch'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          source: 'otakudesu' | 'anoboy'
          target_url: string
          target_slug?: string | null
          anime_id?: string | null
          progress?: number
          error_message?: string | null
          result_data?: any | null
          created_by: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          type?: 'anime' | 'episode' | 'batch'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          source?: 'otakudesu' | 'anoboy'
          target_url?: string
          target_slug?: string | null
          anime_id?: string | null
          progress?: number
          error_message?: string | null
          result_data?: any | null
          created_by?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}