import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, Heart, MoreHorizontal, Play } from 'lucide-react'
import type { Track } from '@shared/ipc'
import { formatTime, formatQuality } from '@renderer/utils/format'
import { usePlayer } from '@renderer/store/player'
import { useUserData } from '@renderer/store/userData'
import { useUi } from '@renderer/store/ui'
import { buildTrackMenu, useTrackContextMenu } from './trackMenu'
import { Artwork } from './Artwork'
import { FormatBadge, LosslessBadge } from './Badges'

export type SortKey =
  | 'title'
  | 'artist'
  | 'album'
  | 'duration'
  | 'dateAdded'
  | 'bitrate'
  | 'format'
  | 'year'

export interface TrackTableProps {
  tracks: Track[]
  showAlbum?: boolean
  showArtist?: boolean
  showFormat?: boolean
  showQuality?: boolean
  showDuration?: boolean
  defaultSortKey?: SortKey
  showHeader?: boolean
  sortable?: boolean
  className?: string
}

const COLUMN_TITLES: Record<SortKey, string> = {
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  duration: 'Duration',
  dateAdded: 'Date added',
  bitrate: 'Bitrate',
  format: 'Format',
  year: 'Year'
}

function sortTracks(tracks: Track[], key: SortKey, dir: 1 | -1): Track[] {
  const arr = [...tracks]
  arr.sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
      case 'artist':
        cmp = a.artist.localeCompare(b.artist)
        break
      case 'album':
        cmp = a.album.localeCompare(b.album)
        break
      case 'duration':
        cmp = (a.duration ?? -1) - (b.duration ?? -1)
        break
      case 'dateAdded':
        cmp = a.dateAdded - b.dateAdded
        break
      case 'bitrate':
        cmp = (a.bitrate ?? -1) - (b.bitrate ?? -1)
        break
      case 'format':
        cmp = a.extension.localeCompare(b.extension)
        break
      case 'year':
        cmp = (a.year ?? -1) - (b.year ?? -1)
        break
    }
    return cmp * dir
  })
  return arr
}

export function EqualizerBars(): React.JSX.Element {
  return (
    <span className="eq-bars" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export function TrackTable({
  tracks,
  showAlbum = true,
  showArtist = true,
  showFormat = true,
  showQuality = true,
  showDuration = true,
  defaultSortKey = 'title',
  showHeader = true,
  sortable = true,
  className = ''
}: TrackTableProps): React.JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey)
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const sorted = useMemo(
    () => (sortable ? sortTracks(tracks, sortKey, sortDir) : tracks),
    [tracks, sortKey, sortDir, sortable]
  )

  const ids = useMemo(() => sorted.map((t) => t.id), [sorted])
  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playContext = usePlayer((s) => s.playContext)
  const favorites = useUserData((s) => s.favorites)
  const toggleFavorite = useUserData((s) => s.toggleFavorite)
  const openMenu = useTrackContextMenu()
  const setTrackInfo = useUi((s) => s.setTrackInfo)
  const navigate = useNavigate()

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12
  })

  const cycleSort = (key: SortKey): void => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const favSet = useMemo(() => new Set(favorites), [favorites])

  const col = (key: SortKey, label: string, className: string): React.JSX.Element => {
    if (!sortable) {
      return <span className={`th-static ${className}`}>{label}</span>
    }
    return (
      <button
        className={`th-btn ${className} ${sortKey === key ? 'th-active' : ''}`}
        onClick={() => cycleSort(key)}
        title={`Sort by ${label}`}
      >
        {label}
        {sortKey === key &&
          (sortDir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    )
  }

  return (
    <div className={`track-table ${className}`}>
      {showHeader && (
        <div className="tt-header">
          <span className="tt-col tt-col-index">#</span>
          <span className="tt-col tt-col-title">{col('title', 'Title', '')}</span>
          {showAlbum && <span className="tt-col tt-col-album">{col('album', 'Album', '')}</span>}
          {showArtist && <span className="tt-col tt-col-artist">{col('artist', 'Artist', '')}</span>}
          {showFormat && <span className="tt-col tt-col-format">{col('format', 'Format', '')}</span>}
          {showQuality && <span className="tt-col tt-col-quality">{col('bitrate', 'Quality', '')}</span>}
          {showDuration && (
            <span className="tt-col tt-col-duration">{col('duration', 'Duration', '')}</span>
          )}
          <span className="tt-col tt-col-heart" />
        </div>
      )}
      <div ref={parentRef} className="tt-scroll">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const track = sorted[vi.index]
            const isCurrent = track.id === currentId
            return (
              <div
                key={track.id}
                className={`tt-row ${isCurrent ? 'tt-row-current' : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`
                }}
                onClick={() => playContext(ids, vi.index)}
                onContextMenu={(e) => openMenu(e, track)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    playContext(ids, vi.index)
                  }
                }}
                role="row"
                aria-label={`Play ${track.title}`}
              >
                <span className="tt-col tt-col-index">
                  {isCurrent && isPlaying ? (
                    <EqualizerBars />
                  ) : isCurrent ? (
                    <span className="now-dot" />
                  ) : (
                    <span className="tt-num">
                      {String(vi.index + 1).padStart(2, '0')}
                      <Play size={13} className="tt-play-hover" />
                    </span>
                  )}
                </span>
                <span className="tt-col tt-col-title">
                  <Artwork src={track.artworkUrl} alt={track.title} size={38} radius={7} seed={vi.index} />
                  <span className="tt-title-wrap">
                    <span className="tt-title">{track.title}</span>
                    {!showArtist && <span className="tt-subtitle">{track.artist}</span>}
                  </span>
                </span>
                {showAlbum && (
                  <span className="tt-col tt-col-album tt-secondary">{track.album}</span>
                )}
                {showArtist && (
                  <span className="tt-col tt-col-artist tt-secondary">{track.artist}</span>
                )}
                {showFormat && (
                  <span className="tt-col tt-col-format">
                    <FormatBadge track={track} />
                  </span>
                )}
                {showQuality && (
                  <span className="tt-col tt-col-quality">
                    <span className="quality-text">{formatQuality(track)}</span>
                    <LosslessBadge track={track} />
                  </span>
                )}
                {showDuration && (
                  <span className="tt-col tt-col-duration tt-secondary">
                    {formatTime(track.duration)}
                  </span>
                )}
                <span className="tt-col tt-col-heart">
                  <button
                    className={`icon-btn mini ${favSet.has(track.id) ? 'fav-on' : ''}`}
                    aria-label={favSet.has(track.id) ? 'Remove from favorites' : 'Add to favorites'}
                    title={favSet.has(track.id) ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(track.id)
                    }}
                  >
                    <Heart size={15} fill={favSet.has(track.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="icon-btn mini"
                    aria-label="More actions"
                    title="More actions"
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      useUi
                        .getState()
                        .openContextMenu(rect.left, rect.bottom + 4, buildTrackMenu(track, navigate))
                    }}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}