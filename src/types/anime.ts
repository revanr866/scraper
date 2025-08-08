export interface Anime {
  id: string
  title: string
  japanese_title?: string
  slug: string
  synopsis?: string
  poster_url?: string
  rating?: number
  status: 'ongoing' | 'completed' | 'upcoming'
  type: 'tv' | 'movie' | 'ova' | 'ona' | 'special'
  episode_count?: number
  duration?: string
  release_date?: string
  studio?: string
  genres: string[]
  mal_id?: number
  otakudesu_url?: string
  anoboy_url?: string
  created_at: string
  updated_at: string
  _count?: {
    episodes: number
  }
  episodes?: Episode[]
}

export interface Episode {
  id: string
  episode_number: number
  title?: string
  duration?: string
  air_date?: string
  otakudesu_url?: string
  anoboy_url?: string
  download_links: any[]
  created_at: string
  anime?: {
    id: string
    title: string
    slug: string
    poster_url?: string
  }
}

export interface AnimeFilters {
  search: string
  status: string
  type: string
  genre: string
  year: string
  sort: string
  order: string
}

export interface EpisodeFilters {
  animeId: string
  animeSlug: string
  episodeNumber: string
  sort: string
}