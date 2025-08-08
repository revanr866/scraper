'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Search, ExternalLink, Download, Eye } from 'lucide-react'
import Link from 'next/link'
import type { Episode, EpisodeFilters } from '@/types/anime'

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EpisodeFilters>({
    animeId: '',
    animeSlug: '',
    episodeNumber: '',
    sort: 'created_at_desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchEpisodes()
  }, [filters, pagination.page])

  const fetchEpisodes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.animeId && { animeId: filters.animeId }),
        ...(filters.animeSlug && { animeSlug: filters.animeSlug }),
        ...(filters.episodeNumber && { episodeNumber: filters.episodeNumber }),
        sort: filters.sort
      })

      const response = await fetch(`/api/episodes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEpisodes(data.episodes || [])
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }))
      } else {
        toast.error('Failed to fetch episodes')
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error)
      toast.error('Failed to fetch episodes')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof EpisodeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getDownloadLinksCount = (downloadLinks: any[]) => {
    if (!Array.isArray(downloadLinks)) return 0
    return downloadLinks.length
  }

  const getQualityBadges = (downloadLinks: any[]) => {
    if (!Array.isArray(downloadLinks)) return []
    
    const qualities = new Set<string>()
    downloadLinks.forEach(link => {
      if (link.quality) {
        qualities.add(link.quality)
      }
    })
    
    return Array.from(qualities).slice(0, 3) // Show max 3 qualities
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Episodes Database</h2>
        <div className="text-sm text-muted-foreground">
          {pagination.total} episodes found
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search episodes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Anime Slug</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by anime slug..."
                  value={filters.animeSlug}
                  onChange={(e) => handleFilterChange('animeSlug', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Anime ID</label>
              <Input
                placeholder="Anime ID..."
                value={filters.animeId}
                onChange={(e) => handleFilterChange('animeId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Episode Number</label>
              <Input
                placeholder="Episode number..."
                value={filters.episodeNumber}
                onChange={(e) => handleFilterChange('episodeNumber', e.target.value)}
                type="number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort</label>
              <Select value={filters.sort} onValueChange={(value) => handleFilterChange('sort', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Newest First</SelectItem>
                  <SelectItem value="created_at_asc">Oldest First</SelectItem>
                  <SelectItem value="episode_number_asc">Episode Number (Low to High)</SelectItem>
                  <SelectItem value="episode_number_desc">Episode Number (High to Low)</SelectItem>
                  <SelectItem value="air_date_desc">Latest Air Date</SelectItem>
                  <SelectItem value="air_date_asc">Earliest Air Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Episodes List */}
      <Card>
        <CardHeader>
          <CardTitle>Episodes List</CardTitle>
          <CardDescription>
            Browse all scraped episode data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anime</TableHead>
                    <TableHead>Episode</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Air Date</TableHead>
                    <TableHead>Download Links</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {episodes.map((episode) => (
                    <TableRow key={episode.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <Link 
                            href={`/dashboard/anime/${episode.anime.slug}`}
                            className="font-medium hover:underline"
                          >
                            {episode.anime.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {episode.anime.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Episode {episode.episode_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {episode.title || `Episode ${episode.episode_number}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{episode.duration || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {episode.air_date 
                            ? new Date(episode.air_date).toLocaleDateString()
                            : '-'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            <Download className="h-3 w-3 mr-1" />
                            {getDownloadLinksCount(episode.download_links)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getQualityBadges(episode.download_links).map((quality, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {quality}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/dashboard/anime/${episode.anime.slug}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {episode.otakudesu_url && (
                            <a
                              href={episode.otakudesu_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {episode.anoboy_url && (
                            <a
                              href={episode.anoboy_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = pagination.page <= 3 
                          ? i + 1 
                          : pagination.page >= pagination.totalPages - 2
                          ? pagination.totalPages - 4 + i
                          : pagination.page - 2 + i
                        
                        if (pageNum < 1 || pageNum > pagination.totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}