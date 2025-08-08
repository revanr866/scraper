export interface ScrapeJob {
  id: string
  type: 'anime' | 'episode' | 'batch'
  source: 'otakudesu' | 'anoboy'
  target_url: string
  target_slug?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface Stats {
  queue: QueueStats
  database: {
    totalAnime: number
    totalEpisodes: number
    totalJobs: number
  }
  jobs: {
    byStatus: {
      pending: number
      processing: number
      completed: number
      failed: number
    }
    recent: ScrapeJob[]
  }
}

export interface ScrapeJobData {
  type: 'anime' | 'episode' | 'batch'
  source: 'otakudesu' | 'anoboy'
  targetUrl: string
  targetSlug?: string
  animeId?: string
  createdBy: string
}