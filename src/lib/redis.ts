import { Redis } from 'ioredis'
import { Queue } from 'bullmq'
import type { ScrapeJobData } from '@/types/scraper'

// Redis connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Queue for scraping jobs
export const scrapeQueue = new Queue('scrape queue', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Add job to queue
export const addScrapeJob = async (data: ScrapeJobData) => {
  return await scrapeQueue.add('scrape', data, {
    priority: data.type === 'anime' ? 1 : 2, // Anime has higher priority
  })
}

// Get queue stats
export const getQueueStats = async () => {
  const waiting = await scrapeQueue.getWaiting()
  const active = await scrapeQueue.getActive()
  const completed = await scrapeQueue.getCompleted()
  const failed = await scrapeQueue.getFailed()
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  }
}