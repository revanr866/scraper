import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
)

// Channel names
export const CHANNELS = {
  SCRAPE_JOBS: 'scrape-jobs',
  ADMIN_NOTIFICATIONS: 'admin-notifications',
} as const

// Event types
export const EVENTS = {
  JOB_CREATED: 'job-created',
  JOB_UPDATED: 'job-updated',
  JOB_COMPLETED: 'job-completed',
  JOB_FAILED: 'job-failed',
  PROGRESS_UPDATE: 'progress-update',
} as const

// Helper functions
export const triggerJobUpdate = async (jobId: string, data: any) => {
  await pusher.trigger(CHANNELS.SCRAPE_JOBS, EVENTS.JOB_UPDATED, {
    jobId,
    ...data,
  })
}

export const triggerJobCompleted = async (jobId: string, data: any) => {
  await pusher.trigger(CHANNELS.SCRAPE_JOBS, EVENTS.JOB_COMPLETED, {
    jobId,
    ...data,
  })
}

export const triggerJobFailed = async (jobId: string, error: string) => {
  await pusher.trigger(CHANNELS.SCRAPE_JOBS, EVENTS.JOB_FAILED, {
    jobId,
    error,
  })
}

export const triggerProgressUpdate = async (jobId: string, progress: number) => {
  await pusher.trigger(CHANNELS.SCRAPE_JOBS, EVENTS.PROGRESS_UPDATE, {
    jobId,
    progress,
  })
}