'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ExternalLink, Play, Calendar, Clock, Star, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Anime, Episode } from '@/types/anime'

export default function AnimeDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      fetchAnime()
    }
  }, [slug])

  const fetchAnime = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/anime/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setAnime(data)
      } else if (response.status === 404) {
        toast.error('Anime not found')
      } else {
        toast.error('Failed to fetch anime details')
      }
    } catch (error) {
      console.error('Failed to fetch anime:', error)
      toast.error('Failed to fetch anime details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      ongoing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      upcoming: 'bg-yellow-100 text-yellow-800'
    } as const

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      tv: 'bg-purple-100 text-purple-800',
      movie: 'bg-red-100 text-red-800',
      ova: 'bg-orange-100 text-orange-800',
      ona: 'bg-teal-100 text-teal-800',
      special: 'bg-pink-100 text-pink-800'
    } as const

    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/anime">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Anime List
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Anime Not Found</h3>
              <p className="text-muted-foreground">The anime you&apos;re looking for doesn&apos;t exist.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/anime">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Anime List
          </Button>
        </Link>
      </div>

      {/* Anime Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Poster and Basic Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {anime.poster_url && (
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
                    <Image
                      src={anime.poster_url}
                      alt={anime.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">{anime.title}</h1>
                  {anime.japanese_title && (
                    <p className="text-lg text-muted-foreground">{anime.japanese_title}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(anime.status)}
                    {getTypeBadge(anime.type)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details and Synopsis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Synopsis */}
          {anime.synopsis && (
            <Card>
              <CardHeader>
                <CardTitle>Synopsis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{anime.synopsis}</p>
              </CardContent>
            </Card>
          )}

          {/* Information */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anime.rating && (
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Rating:</span>
                    <span>{anime.rating}/10</span>
                  </div>
                )}
                {anime.studio && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Studio:</span>
                    <span>{anime.studio}</span>
                  </div>
                )}
                {anime.episode_count && (
                  <div className="flex items-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span className="font-medium">Episodes:</span>
                    <span>{anime.episode_count}</span>
                  </div>
                )}
                {anime.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Duration:</span>
                    <span>{anime.duration}</span>
                  </div>
                )}
                {anime.release_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Release Date:</span>
                    <span>{new Date(anime.release_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {anime.genres.length > 0 && (
                <div className="mt-4">
                  <span className="font-medium">Genres:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {anime.genres.map((genre, index) => (
                      <Badge key={index} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              <div className="flex flex-wrap gap-2 mt-4">
                {anime.mal_id && (
                  <a
                    href={`https://myanimelist.net/anime/${anime.mal_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      MyAnimeList
                    </Button>
                  </a>
                )}
                {anime.otakudesu_url && (
                  <a
                    href={anime.otakudesu_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Otakudesu
                    </Button>
                  </a>
                )}
                {anime.anoboy_url && (
                  <a
                    href={anime.anoboy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Anoboy
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Episodes */}
      <Card>
        <CardHeader>
          <CardTitle>Episodes ({anime.episodes.length})</CardTitle>
          <CardDescription>
            List of all available episodes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anime.episodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No episodes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Episode</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Air Date</TableHead>
                  <TableHead>Download Links</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anime.episodes.map((episode) => (
                  <TableRow key={episode.id}>
                    <TableCell>
                      <Badge variant="outline">
                        Episode {episode.episode_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
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
                      <Badge variant="secondary">
                        {episode.download_links.length} links
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}