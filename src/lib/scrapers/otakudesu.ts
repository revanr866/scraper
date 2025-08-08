import axios from 'axios'
import * as cheerio from 'cheerio'

const OTAKUDESU_BASE_URL = process.env.OTAKUDESU_BASE_URL || 'https://otakudesu.best'

export interface OtakudesuAnime {
  title: string
  japanese_title?: string
  slug: string
  poster?: string
  synopsis?: string
  rating?: string
  type?: string
  status?: string
  episode_count?: string
  duration?: string
  release_date?: string
  studio?: string
  genres?: string[]
  otakudesu_url: string
  episodes?: OtakudesuEpisode[]
  batch?: any
}

export interface OtakudesuEpisode {
  episode_number: number
  title?: string
  slug: string
  otakudesu_url: string
  download_links?: any
  streaming_links?: any
}

class OtakudesuScraper {
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

  async scrapeAnime(slug: string): Promise<OtakudesuAnime | null> {
    try {
      const url = `${OTAKUDESU_BASE_URL}/anime/${slug}`
      const $ = await this.fetchPage(url)

      // Extract anime information
      const title = $('.infozin .infozingle p:first span').text()?.replace('Judul: ', '') || ''
      const japanese_title = $('.infozin .infozingle p:nth-child(2) span').text()?.replace('Japanese: ', '') || undefined
      const rating = $('.infozin .infozingle p:nth-child(3) span').text()?.replace('Skor: ', '') || undefined
      const type = $('.infozin .infozingle p:nth-child(5) span').text()?.replace('Tipe: ', '') || undefined
      const status = $('.infozin .infozingle p:nth-child(6) span').text()?.replace('Status: ', '') || undefined
      const episode_count = $('.infozin .infozingle p:nth-child(7) span').text()?.replace('Total Episode: ', '') || undefined
      const duration = $('.infozin .infozingle p:nth-child(8) span').text()?.replace('Durasi: ', '') || undefined
      const release_date = $('.infozin .infozingle p:nth-child(9) span').text()?.replace('Tanggal Rilis: ', '') || undefined
      const studio = $('.infozin .infozingle p:nth-child(10) span').text()?.replace('Studio: ', '') || undefined
      
      // Extract poster
      const poster = $('.fotoanime img').attr('src') || undefined
      
      // Extract synopsis
      const synopsis = $('.sinopc').text().trim() || undefined
      
      // Extract genres
      const genres: string[] = []
      $('.infozin .infozingle p:last span a').each((_, el) => {
        const genre = $(el).text().trim()
        if (genre) genres.push(genre)
      })

      // Extract episodes
      const episodes = await this.scrapeEpisodes(slug)

      return {
        title,
        japanese_title,
        slug,
        poster,
        synopsis,
        rating,
        type,
        status,
        episode_count,
        duration,
        release_date,
        studio,
        genres: genres.length > 0 ? genres : undefined,
        otakudesu_url: url,
        episodes
      }
    } catch (error) {
      console.error(`Error scraping anime ${slug}:`, error)
      return null
    }
  }

  async scrapeEpisodes(animeSlug: string): Promise<OtakudesuEpisode[]> {
    try {
      const url = `${OTAKUDESU_BASE_URL}/anime/${animeSlug}`
      const $ = await this.fetchPage(url)

      const episodes: OtakudesuEpisode[] = []
      
      // Extract episode list
      $('.episodelist ul li').each((_, el) => {
        const episodeLink = $(el).find('a')
        const episodeUrl = episodeLink.attr('href')
        const episodeTitle = episodeLink.text().trim()
        
        if (episodeUrl) {
          // Extract episode number from URL or title
          const episodeMatch = episodeUrl.match(/episode-(\d+)/)
          const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0
          
          // Extract slug from URL
          const slugMatch = episodeUrl.match(/\/episode\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug) {
            episodes.push({
              episode_number: episodeNumber,
              title: episodeTitle || undefined,
              slug,
              otakudesu_url: episodeUrl
            })
          }
        }
      })

      return episodes.sort((a, b) => a.episode_number - b.episode_number)
    } catch (error) {
      console.error(`Error scraping episodes for ${animeSlug}:`, error)
      return []
    }
  }

  async scrapeEpisode(episodeSlug: string): Promise<OtakudesuEpisode | null> {
    try {
      const url = `${OTAKUDESU_BASE_URL}/episode/${episodeSlug}`
      const $ = await this.fetchPage(url)

      // Extract episode info
      const title = $('.venutama h1').text().trim()
      const episodeMatch = title.match(/Episode (\d+)/)
      const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0

      // Extract download links
      const download_links: any = {}
      $('.download ul li').each((_, el) => {
        const quality = $(el).find('strong').text().trim()
        const links: any = {}
        
        $(el).find('a').each((_, linkEl) => {
          const provider = $(linkEl).text().trim()
          const url = $(linkEl).attr('href')
          if (provider && url) {
            links[provider] = url
          }
        })
        
        if (quality && Object.keys(links).length > 0) {
          download_links[quality] = links
        }
      })

      // Extract streaming links
      const streaming_links: any = {}
      $('.responsive-embed-stream iframe').each((_, el) => {
        const src = $(el).attr('src')
        if (src) {
          // Try to identify streaming provider from URL
          let provider = 'unknown'
          if (src.includes('mp4upload')) provider = 'mp4upload'
          else if (src.includes('streamtape')) provider = 'streamtape'
          else if (src.includes('doodstream')) provider = 'doodstream'
          
          streaming_links[provider] = src
        }
      })

      return {
        episode_number: episodeNumber,
        title: title || undefined,
        slug: episodeSlug,
        otakudesu_url: url,
        download_links: Object.keys(download_links).length > 0 ? download_links : undefined,
        streaming_links: Object.keys(streaming_links).length > 0 ? streaming_links : undefined
      }
    } catch (error) {
      console.error(`Error scraping episode ${episodeSlug}:`, error)
      return null
    }
  }

  async searchAnime(keyword: string): Promise<OtakudesuAnime[]> {
    try {
      const url = `${OTAKUDESU_BASE_URL}/?s=${encodeURIComponent(keyword)}&post_type=anime`
      const $ = await this.fetchPage(url)

      const results: OtakudesuAnime[] = []
      
      $('.chivsrc li').each((_, el) => {
        const link = $(el).find('h2 a')
        const animeUrl = link.attr('href')
        const title = link.text().trim()
        
        if (animeUrl && title) {
          // Extract slug from URL
          const slugMatch = animeUrl.match(/\/anime\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug) {
            results.push({
              title,
              slug,
              otakudesu_url: animeUrl
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

  async getOngoingAnime(page: number = 1): Promise<OtakudesuAnime[]> {
    try {
      const url = page === 1 ? `${OTAKUDESU_BASE_URL}/ongoing-anime` : `${OTAKUDESU_BASE_URL}/ongoing-anime/page/${page}`
      const $ = await this.fetchPage(url)

      const results: OtakudesuAnime[] = []
      
      $('.venz ul li').each((_, el) => {
        const link = $(el).find('.thumb a')
        const animeUrl = link.attr('href')
        const poster = $(el).find('.thumb img').attr('src')
        const title = $(el).find('.jdlflm').text().trim()
        
        if (animeUrl && title) {
          // Extract slug from URL
          const slugMatch = animeUrl.match(/\/anime\/([^/]+)\/?$/)
          const slug = slugMatch ? slugMatch[1] : ''
          
          if (slug) {
            results.push({
              title,
              slug,
              poster: poster || undefined,
              otakudesu_url: animeUrl
            })
          }
        }
      })

      return results
    } catch (error) {
      console.error(`Error getting ongoing anime page ${page}:`, error)
      return []
    }
  }
}

export const otakudesuScraper = new OtakudesuScraper()