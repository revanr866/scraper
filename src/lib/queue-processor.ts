import { Worker } from 'bullmq'
import { redis } from './redis'
import type { ScrapeJobData } from '@/types/scraper'
import { supabaseAdmin } from './supabase'
import { otakudesuScraper } from './scrapers/otakudesu'
import { anoboyScraper } from './scrapers/anoboy'
import { malScraper } from './scrapers/myanimelist'
import { triggerJobUpdate, triggerJobCompleted, triggerJobFailed, triggerProgressUpdate } from './pusher'

class QueueProcessor {
  private worker: Worker

  constructor() {
    this.setupProcessors()
  }

  private setupProcessors() {
    // Process scrape jobs
    this.worker = new Worker('scrape queue', async (job) => {
      const data: ScrapeJobData = job.data
      
      try {
        await this.updateJobStatus(data.id, 'processing', 0)
        await triggerJobUpdate(data.id, { status: 'processing', progress: 0 })
        
        let result: any = null
        
        switch (data.type) {
          case 'anime':
            result = await this.processAnimeJob(data)
            break
          case 'episode':
            result = await this.processEpisodeJob(data)
            break
          case 'batch':
            result = await this.processBatchJob(data)
            break
          default:
            throw new Error(`Unknown job type: ${data.type}`)
        }
        
        await this.updateJobStatus(data.id, 'completed', 100, null, result)
        await triggerJobCompleted(data.id, { result })
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await this.updateJobStatus(data.id, 'failed', 0, errorMessage)
        await triggerJobFailed(data.id, errorMessage)
        throw error
      }
    }, {
      connection: redis,
      concurrency: 3
    })

    // Handle job events
    scrapeQueue.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`)
    })

    scrapeQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err)
    })

    scrapeQueue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`)
    })
  }

  private async updateJobStatus(
    jobId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    progress: number,
    errorMessage?: string | null,
    resultData?: any
  ) {
    const updateData: any = {
      status,
      progress,
      updated_at: new Date().toISOString()
    }

    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage
    }

    if (resultData !== undefined) {
      updateData.result_data = resultData
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin
      .from('scrape_jobs')
      .update(updateData)
      .eq('id', jobId)

    if (error) {
      console.error('Error updating job status:', error)
    }
  }

  private async processAnimeJob(data: ScrapeJobData): Promise<any> {
    const { targetSlug, source } = data
    
    if (!targetSlug) {
      throw new Error('Target slug is required for anime jobs')
    }

    await triggerProgressUpdate(data.id, 10)

    // Step 1: Scrape from primary source (Otakudesu)
    let animeData: any = null
    
    if (source === 'otakudesu' || !source) {
      animeData = await otakudesuScraper.scrapeAnime(targetSlug)
      await triggerProgressUpdate(data.id, 30)
    }

    // Step 2: If no data from Otakudesu, try Anoboy
    if (!animeData && source !== 'otakudesu') {
      animeData = await anoboyScraper.scrapeAnime(targetSlug)
      await triggerProgressUpdate(data.id, 40)
    }

    if (!animeData) {
      throw new Error('Failed to scrape anime data from any source')
    }

    await triggerProgressUpdate(data.id, 50)

    // Step 3: Enhance with MyAnimeList data
    const malData = await malScraper.getAnimeByTitle(animeData.title)
    if (malData) {
      animeData = malScraper.mergeWithScrapedData(animeData, malData)
    }

    await triggerProgressUpdate(data.id, 70)

    // Step 4: Save to database
    const { data: savedAnime, error } = await supabaseAdmin
      .from('anime')
      .upsert({
        title: animeData.title,
        japanese_title: animeData.japanese_title,
        slug: animeData.slug,
        poster: animeData.poster,
        synopsis: animeData.synopsis,
        rating: animeData.rating,
        type: animeData.type,
        status: animeData.status,
        episode_count: animeData.episode_count,
        duration: animeData.duration,
        release_date: animeData.release_date,
        studio: animeData.studio,
        genres: animeData.genres,
        mal_id: animeData.mal_id,
        mal_data: animeData.mal_data,
        otakudesu_url: animeData.otakudesu_url,
        anoboy_url: animeData.anoboy_url,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'slug'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save anime: ${error.message}`)
    }

    await triggerProgressUpdate(data.id, 90)

    // Step 5: Save episodes if available
    if (animeData.episodes && animeData.episodes.length > 0) {
      const episodeInserts = animeData.episodes.map((episode: any) => ({
        anime_id: savedAnime.id,
        episode_number: episode.episode_number,
        title: episode.title,
        slug: episode.slug,
        otakudesu_url: episode.otakudesu_url,
        anoboy_url: episode.anoboy_url,
        download_links: episode.download_links,
        streaming_links: episode.streaming_links
      }))

      const { error: episodeError } = await supabaseAdmin
        .from('episodes')
        .upsert(episodeInserts, {
          onConflict: 'anime_id,episode_number'
        })

      if (episodeError) {
        console.error('Error saving episodes:', episodeError)
      }
    }

    await triggerProgressUpdate(data.id, 100)

    return {
      anime: savedAnime,
      episodes_count: animeData.episodes?.length || 0,
      mal_enhanced: !!malData
    }
  }

  private async processEpisodeJob(data: ScrapeJobData): Promise<any> {
    const { targetSlug, source, animeId } = data
    
    if (!targetSlug) {
      throw new Error('Target slug is required for episode jobs')
    }

    await triggerProgressUpdate(data.id, 20)

    // Step 1: Scrape episode from primary source
    let episodeData: any = null
    
    if (source === 'otakudesu' || !source) {
      episodeData = await otakudesuScraper.scrapeEpisode(targetSlug)
      await triggerProgressUpdate(data.id, 50)
    }

    // Step 2: If no data from Otakudesu, try Anoboy
    if (!episodeData && source !== 'otakudesu') {
      episodeData = await anoboyScraper.scrapeEpisode(targetSlug)
      await triggerProgressUpdate(data.id, 60)
    }

    if (!episodeData) {
      throw new Error('Failed to scrape episode data from any source')
    }

    await triggerProgressUpdate(data.id, 80)

    // Step 3: Save to database
    const { data: savedEpisode, error } = await supabaseAdmin
      .from('episodes')
      .upsert({
        anime_id: animeId,
        episode_number: episodeData.episode_number,
        title: episodeData.title,
        slug: episodeData.slug,
        otakudesu_url: episodeData.otakudesu_url,
        anoboy_url: episodeData.anoboy_url,
        download_links: episodeData.download_links,
        streaming_links: episodeData.streaming_links,
        updated_at: new Date().toISOString()
      }, {
        onConflict: animeId ? 'anime_id,episode_number' : 'slug'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save episode: ${error.message}`)
    }

    await triggerProgressUpdate(data.id, 100)

    return {
      episode: savedEpisode
    }
  }

  private async processBatchJob(data: ScrapeJobData): Promise<any> {
    // For batch jobs, we might scrape multiple episodes or anime
    // This is a placeholder for batch processing logic
    await triggerProgressUpdate(data.id, 50)
    
    // Implement batch processing logic here
    // This could involve scraping multiple pages, episodes, etc.
    
    await triggerProgressUpdate(data.id, 100)
    
    return {
      message: 'Batch job completed',
      processed_items: 0
    }
  }
}

// Initialize the queue processor
export const queueProcessor = new QueueProcessor()

// Export for manual processing if needed
export { QueueProcessor }