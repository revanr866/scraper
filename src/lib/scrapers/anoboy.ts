import axios from 'axios'
import * as cheerio from 'cheerio'

const ANOBOY_BASE_URL = process.env.ANOBOY_BASE_URL || 'https://ww3.anoboy.app'

export interface AnoboyAnime {
  title: string
  slug: string
  poster?: string
  synopsis?: string
  anoboy_url: string
  episodes?: AnoboyEpisode[]
}

export interface AnoboyEpisode {
  episode_number: number
  title?: string
  slug: string
  anoboy_url: string
  download_links?: any
  streaming_links?: any
}

class AnoboyScraper {
  private async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      })
      return cheerio.load(response.data)
    } catch (error) {
      console.error(`Error fetching ${url}:`, error)
      throw error
    }
  }

  async searchAnime(keyword: string): Promise<AnoboyAnime[]> {
    try {
      const url = `${ANOBOY_BASE_URL}/?s=${encodeURIComponent(keyword)}`
      const $ = await this.fetchPage(url)

      const results: AnoboyAnime[] = []
      
      // Anoboy search results structure may vary, adjust selectors as needed
      $('.post').each((_, el) => {
        const link = $(el).find('.entry-title a')
        const animeUrl = link.attr('href')
        const title = link.text().trim()
        const poster = $(el).find('.entry-image img').attr('src')
        
        if (animeUrl && title) {
          // Extract slug from URL
          const slugMatch = animeUrl.match(/\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug) {
            results.push({
              title,
              slug,
              poster: poster || undefined,
              anoboy_url: animeUrl
            })
          }
        }
      })

      return results
    } catch (error) {
      console.error(`Error searching anime with keyword ${keyword}:`, error)
      return []
    }
  }

  async scrapeAnime(slug: string): Promise<AnoboyAnime | null> {
    try {
      // Try different URL patterns for Anoboy
      let url = `${ANOBOY_BASE_URL}/${slug}`
      let $ = await this.fetchPage(url)

      // If not found, try with different patterns
      if (!$('.entry-title').length) {
        url = `${ANOBOY_BASE_URL}/anime/${slug}`
        try {
          $ = await this.fetchPage(url)
        } catch {
          return null
        }
      }

      const title = $('.entry-title').text().trim() || ''
      const poster = $('.entry-content img').first().attr('src') || undefined
      const synopsis = $('.entry-content p').first().text().trim() || undefined

      // Get episodes list
      const episodes = await this.scrapeEpisodes(slug)

      return {
        title,
        slug,
        poster,
        synopsis,
        anoboy_url: url,
        episodes
      }
    } catch (error) {
      console.error(`Error scraping anime ${slug}:`, error)
      return null
    }
  }

  async scrapeEpisodes(animeSlug: string): Promise<AnoboyEpisode[]> {
    try {
      const url = `${ANOBOY_BASE_URL}/${animeSlug}`
      const $ = await this.fetchPage(url)

      const episodes: AnoboyEpisode[] = []
      
      // Look for episode links in various possible structures
      $('a[href*="episode"]').each((_, el) => {
        const episodeUrl = $(el).attr('href')
        const episodeText = $(el).text().trim()
        
        if (episodeUrl && episodeText) {
          // Extract episode number
          const episodeMatch = episodeText.match(/episode[\s-]*(\d+)/i) || episodeUrl.match(/episode[\s-]*(\d+)/i)
          const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0
          
          // Extract slug from URL
          const slugMatch = episodeUrl.match(/\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug && episodeNumber > 0) {
            episodes.push({
              episode_number: episodeNumber,
              title: episodeText || undefined,
              slug,
              anoboy_url: episodeUrl
            })
          }
        }
      })

      // Remove duplicates and sort
      const uniqueEpisodes = episodes.filter((episode, index, self) => 
        index === self.findIndex(e => e.episode_number === episode.episode_number)
      )

      return uniqueEpisodes.sort((a, b) => a.episode_number - b.episode_number)
    } catch (error) {
      console.error(`Error scraping episodes for ${animeSlug}:`, error)
      return []
    }
  }

  async scrapeEpisode(episodeSlug: string): Promise<AnoboyEpisode | null> {
    try {
      const url = `${ANOBOY_BASE_URL}/${episodeSlug}`
      const $ = await this.fetchPage(url)

      const title = $('.entry-title').text().trim()
      const episodeMatch = title.match(/episode[\s-]*(\d+)/i)
      const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0

      // Extract download links
      const download_links: any = {}
      $('a[href*="download"], a[href*=".mp4"], a[href*=".mkv"]').each((_, el) => {
        const linkUrl = $(el).attr('href')
        const linkText = $(el).text().trim()
        
        if (linkUrl && linkText) {
          // Try to extract quality from text
          const qualityMatch = linkText.match(/(\d+p|HD|SD)/i)
          const quality = qualityMatch ? qualityMatch[1] : 'Unknown'
          
          if (!download_links[quality]) {
            download_links[quality] = {}
          }
          
          // Try to identify provider
          let provider = 'unknown'
          if (linkUrl.includes('drive.google.com')) provider = 'Google Drive'
          else if (linkUrl.includes('mega.nz')) provider = 'Mega'
          else if (linkUrl.includes('mediafire')) provider = 'MediaFire'
          else if (linkUrl.includes('zippyshare')) provider = 'ZippyShare'
          
          download_links[quality][provider] = linkUrl
        }
      })

      // Extract streaming links
      const streaming_links: any = {}
      $('iframe').each((_, el) => {
        const src = $(el).attr('src')
        if (src) {
          let provider = 'unknown'
          if (src.includes('mp4upload')) provider = 'mp4upload'
          else if (src.includes('streamtape')) provider = 'streamtape'
          else if (src.includes('doodstream')) provider = 'doodstream'
          else if (src.includes('fembed')) provider = 'fembed'
          
          streaming_links[provider] = src
        }
      })

      return {
        episode_number: episodeNumber,
        title: title || undefined,
        slug: episodeSlug,
        anoboy_url: url,
        download_links: Object.keys(download_links).length > 0 ? download_links : undefined,
        streaming_links: Object.keys(streaming_links).length > 0 ? streaming_links : undefined
      }
    } catch (error) {
      console.error(`Error scraping episode ${episodeSlug}:`, error)
      return null
    }
  }

  async getLatestEpisodes(): Promise<AnoboyEpisode[]> {
    try {
      const url = ANOBOY_BASE_URL
      const $ = await this.fetchPage(url)

      const episodes: AnoboyEpisode[] = []
      
      // Look for latest episode posts
      $('.post').each((_, el) => {
        const link = $(el).find('.entry-title a')
        const episodeUrl = link.attr('href')
        const title = link.text().trim()
        
        if (episodeUrl && title && title.toLowerCase().includes('episode')) {
          const episodeMatch = title.match(/episode[\s-]*(\d+)/i)
          const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0
          
          const slugMatch = episodeUrl.match(/\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug && episodeNumber > 0) {
            episodes.push({
              episode_number: episodeNumber,
              title,
              slug,
              anoboy_url: episodeUrl
            })
          }
        }
      })

      return episodes
    } catch (error) {
      console.error('Error getting latest episodes:', error)
      return []
    }
  }
}

export const anoboyScraper = new AnoboyScraper()