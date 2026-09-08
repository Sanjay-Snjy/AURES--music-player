import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Track } from '@shared/ipc'
import { albumKey } from '@renderer/utils/search'
import { Artwork } from './Artwork'
import { usePlayer } from '@renderer/store/player'

export interface AlbumCardData {
  key: string
  title: string
  artist: string
  year: number | null
  trackCount: number
  artworkUrl: string | null
  tracks: Track[]
}

export function AlbumCard({ album }: { album: AlbumCardData }): React.JSX.Element {
  const navigate = useNavigate()
  const playContext = usePlayer((s) => s.playContext)

  const open = (): void => {
    navigate(`/albums/${encodeURIComponent(album.key)}`)
  }

  return (
    <div
      className="album-card"
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
      }}
      aria-label={`Open album ${album.title}`}
    >
      <div className="album-card-art">
        <Artwork
          src={album.artworkUrl}
          alt={album.title}
          size={170}
          radius={12}
          seed={album.title.length + (album.year ?? 0)}
        />
        <button
          className="album-play-btn"
          aria-label={`Play album ${album.title}`}
          title="Play album"
          onClick={(e) => {
            e.stopPropagation()
            playContext(album.tracks.map((t) => t.id), 0)
          }}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <div className="album-card-title">{album.title}</div>
      <div className="album-card-sub">
        {album.artist}
        {album.year ? ` • ${album.year}` : ''}
      </div>
      <div className="album-card-meta">
        {album.trackCount} track{album.trackCount === 1 ? '' : 's'}
      </div>
    </div>
  )
}

export function albumCardData(tracks: Track[]): AlbumCardData[] {
  const map = new Map<string, AlbumCardData>()
  for (const t of tracks) {
    const key = albumKey(t)
    const existing = map.get(key)
    if (existing) {
      existing.trackCount++
      existing.tracks.push(t)
      continue
    }
    map.set(key, {
      key,
      title: t.album,
      artist: t.albumArtist,
      year: t.year,
      trackCount: 1,
      artworkUrl: t.artworkUrl,
      tracks: [t]
    })
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
}