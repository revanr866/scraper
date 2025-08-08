'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw, Trash2, Eye, Play, Pause } from 'lucide-react'
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher'
// Admin check will be handled via API or user metadata
import type { ScrapeJob, QueueStats, Stats } from '@/types/scraper'

export default function ScraperPage() {
  const { user, isLoaded } = useUser()
  const [jobs, setJobs] = useState<ScrapeJob[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [newJob, setNewJob] = useState({
    type: 'anime' as const,
    source: 'otakudesu' as const,
    targetUrl: ''
  })

  // Check if user is admin
  useEffect(() => {
    if (isLoaded && user) {
      // Check if user is admin using environment variable or user metadata
      const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',').map(id => id.trim()) || []
      setUserIsAdmin(adminIds.includes(user.id))
    }
  }, [user, isLoaded])

  // Fetch initial data
  useEffect(() => {
    if (isLoaded && user && userIsAdmin) {
      fetchJobs()
      fetchStats()
    }
  }, [user, isLoaded, userIsAdmin])

  // Setup Pusher for real-time updates
  useEffect(() => {
    if (!user || !userIsAdmin) return

    const channel = pusherClient.subscribe(CHANNELS.SCRAPE_JOBS)
    
    channel.bind(EVENTS.JOB_CREATED, (data: ScrapeJob) => {
      setJobs(prev => [data, ...prev])
      toast.success('New scrape job created')
    })
    
    channel.bind(EVENTS.JOB_UPDATED, (data: ScrapeJob) => {
      setJobs(prev => prev.map(job => job.id === data.id ? data : job))
    })
    
    channel.bind(EVENTS.JOB_COMPLETED, (data: ScrapeJob) => {
      setJobs(prev => prev.map(job => job.id === data.id ? data : job))
      toast.success(`Job ${data.id} completed successfully`)
    })
    
    channel.bind(EVENTS.JOB_FAILED, (data: ScrapeJob) => {
      setJobs(prev => prev.map(job => job.id === data.id ? data : job))
      toast.error(`Job ${data.id} failed: ${data.error_message}`)
    })
    
    channel.bind(EVENTS.PROGRESS_UPDATE, (data: ScrapeJob) => {
      setJobs(prev => prev.map(job => job.id === data.id ? data : job))
    })

    return () => {
      pusherClient.unsubscribe(CHANNELS.SCRAPE_JOBS)
    }
  }, [user, userIsAdmin])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/scrape')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      toast.error('Failed to fetch jobs')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/queue/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newJob.targetUrl.trim()) {
      toast.error('Please enter a target URL')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newJob.type,
          source: newJob.source,
          targetUrl: newJob.targetUrl,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Scrape job created successfully')
        setNewJob({ type: 'anime', source: 'otakudesu', targetUrl: '' })
        fetchJobs()
        fetchStats()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create job')
      }
    } catch (error) {
      console.error('Failed to create job:', error)
      toast.error('Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/scrape/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Job deleted successfully')
        fetchJobs()
        fetchStats()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete job')
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
      toast.error('Failed to delete job')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    } as const

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status}
      </Badge>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!userIsAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Anime Scraper Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => { fetchJobs(); fetchStats(); }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Anime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.database.totalAnime}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.database.totalEpisodes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queue.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.queue.completed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Scrape Jobs</TabsTrigger>
          <TabsTrigger value="create">Create Job</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scrape Jobs</CardTitle>
              <CardDescription>
                Monitor and manage your scraping jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.type}</TableCell>
                        <TableCell>{job.source}</TableCell>
                        <TableCell className="max-w-xs truncate">{job.target_url}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>{job.progress}%</TableCell>
                        <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Scrape Job</CardTitle>
              <CardDescription>
                Add a new URL to scrape anime or episode data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Job Type</Label>
                    <Select
                      value={newJob.type}
                      onValueChange={(value: 'anime' | 'episode' | 'batch') => 
                        setNewJob(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="episode">Episode</SelectItem>
                        <SelectItem value="batch">Batch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select
                      value={newJob.source}
                      onValueChange={(value: 'otakudesu' | 'anoboy') => 
                        setNewJob(prev => ({ ...prev, source: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="otakudesu">Otakudesu</SelectItem>
                        <SelectItem value="anoboy">Anoboy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetUrl">Target URL</Label>
                  <Input
                    id="targetUrl"
                    placeholder="https://otakudesu.lol/anime/..."
                    value={newJob.targetUrl}
                    onChange={(e) => setNewJob(prev => ({ ...prev, targetUrl: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Job
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}