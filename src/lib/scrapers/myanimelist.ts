import axios from 'axios'

const MAL_API_BASE_URL = process.env.MYANIMELIST_API_URL || 'https://api.jikan.moe/v4'

export interface MALAnime {
  mal_id: number
  title: string
  title_english?: string
  title_japanese?: string
  title_synonyms?: string[]
  type?: string
  source?: string
  episodes?: number
  status?: string
  airing?: boolean
  aired?: {
    from?: string
    to?: string
    string?: string
  }
  duration?: string
  rating?: string
  score?: number
  scored_by?: number
  rank?: number
  popularity?: number
  members?: number
  favorites?: number
  synopsis?: string
  background?: string
  season?: string
  year?: number
  broadcast?: {
    day?: string
    time?: string
    timezone?: string
    string?: string
  }
  producers?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  licensors?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  studios?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  genres?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  themes?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  demographics?: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
  images?: {
    jpg?: {
      image_url?: string
      small_image_url?: string
      large_image_url?: string
    }
    webp?: {
      image_url?: string
      small_image_url?: string
      large_image_url?: string
    }
  }
  trailer?: {
    youtube_id?: string
    url?: string
    embed_url?: string
  }
  approved?: boolean
  titles?: Array<{
    type: string
    title: string
  }>
}

class MyAnimeListScraper {
  private async makeRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
    try {
      // Add delay to respect rate limits (Jikan API has rate limits)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await axios.get(`${MAL_API_BASE_URL}${endpoint}`, {
        params,
        timeout: 30000,
        headers: {
          'User-Agent': 'AnimeScraperBot/1.0'
        }
      })
      
      return response.data
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error)
      throw error
    }
  }

  async searchAnime(query: string, limit: number = 10): Promise<MALAnime[]> {
    try {
      const data = await this.makeRequest('/anime', {
        q: query,
        limit,
        order_by: 'score',
        sort: 'desc'
      })
      
      return data.data || []
    } catch (error) {
      console.error(`Error searching anime with query ${query}:`, error)
      return []
    }
  }

  async getAnimeById(malId: number): Promise<MALAnime | null> {
    try {
      const data = await this.makeRequest(`/anime/${malId}`)
      return data.data || null
    } catch (error) {
      console.error(`Error getting anime by ID ${malId}:`, error)
      return null
    }
  }

  async getAnimeByTitle(title: string): Promise<MALAnime | null> {
    try {
      const searchResults = await this.searchAnime(title, 5)
      
      if (searchResults.length === 0) {
        return null
      }
      
      // Try to find exact match first
      const exactMatch = searchResults.find(anime => 
        anime.title.toLowerCase() === title.toLowerCase() ||
        anime.title_english?.toLowerCase() === title.toLowerCase() ||
        anime.title_japanese?.toLowerCase() === title.toLowerCase()
      )
      
      if (exactMatch) {
        return exactMatch
      }
      
      // If no exact match, try to find best match using similarity
      const bestMatch = this.findBestMatch(title, searchResults)
      return bestMatch
    } catch (error) {
      console.error(`Error getting anime by title ${title}:`, error)
      return null
    }
  }

  private findBestMatch(searchTitle: string, results: MALAnime[]): MALAnime | null {
    if (results.length === 0) return null
    
    const normalizedSearchTitle = this.normalizeTitle(searchTitle)
    
    let bestMatch = results[0]
    let bestScore = 0
    
    for (const anime of results) {
      const titles = [
        anime.title,
        anime.title_english,
        anime.title_japanese,
        ...(anime.title_synonyms || []),
        ...(anime.titles?.map(t => t.title) || [])
      ].filter(Boolean)
      
      for (const title of titles) {
        const normalizedTitle = this.normalizeTitle(title!)
        const similarity = this.calculateSimilarity(normalizedSearchTitle, normalizedTitle)
        
        if (similarity > bestScore) {
          bestScore = similarity
          bestMatch = anime
        }
      }
    }
    
    // Only return if similarity is above threshold
    return bestScore > 0.6 ? bestMatch : results[0]
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  async getTopAnime(type?: string, filter?: string, limit: number = 25): Promise<MALAnime[]> {
    try {
      const params: any = { limit }
      if (type) params.type = type
      if (filter) params.filter = filter
      
      const data = await this.makeRequest('/top/anime', params)
      return data.data || []
    } catch (error) {
      console.error('Error getting top anime:', error)
      return []
    }
  }

  async getSeasonalAnime(year: number, season: string): Promise<MALAnime[]> {
    try {
      const data = await this.makeRequest(`/seasons/${year}/${season}`)
      return data.data || []
    } catch (error) {
      console.error(`Error getting seasonal anime for ${year} ${season}:`, error)
      return []
    }
  }

  async getCurrentSeason(): Promise<MALAnime[]> {
    try {
      const data = await this.makeRequest('/seasons/now')
      return data.data || []
    } catch (error) {
      console.error('Error getting current season anime:', error)
      return []
    }
  }

  // Helper method to merge MAL data with scraped data
  mergeWithScrapedData(scrapedAnime: any, malAnime: MALAnime): any {
    return {
      ...scrapedAnime,
      mal_id: malAnime.mal_id,
      mal_data: malAnime,
      // Enhance with MAL data where scraped data is missing
      title: scrapedAnime.title || malAnime.title,
      japanese_title: scrapedAnime.japanese_title || malAnime.title_japanese,
      synopsis: scrapedAnime.synopsis || malAnime.synopsis,
      rating: scrapedAnime.rating || malAnime.rating,
      type: scrapedAnime.type || malAnime.type,
      status: scrapedAnime.status || malAnime.status,
      episode_count: scrapedAnime.episode_count || malAnime.episodes?.toString(),
      duration: scrapedAnime.duration || malAnime.duration,
      studio: scrapedAnime.studio || malAnime.studios?.[0]?.name,
      genres: scrapedAnime.genres || malAnime.genres?.map(g => g.name),
      poster: scrapedAnime.poster || malAnime.images?.jpg?.large_image_url || malAnime.images?.jpg?.image_url
    }
  }
}

export const malScraper = new MyAnimeListScraper()