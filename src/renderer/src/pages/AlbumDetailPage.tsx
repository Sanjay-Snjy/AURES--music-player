import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ListPlus, Play, Shuffle } from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { usePlayer } from '@renderer/store/player'
import { useUserData } from '@renderer/store/userData'
import { useUi, toast } from '@renderer/store/ui'
import { albumKey } from '@renderer/utils/search'
import { totalDuration } from '@renderer/utils/format'
import { Artwork } from '@renderer/components/Artwork'
import { TrackTable } from '@renderer/components/TrackTable'
import { EmptyState } from '@renderer/components/EmptyState'

export function AlbumDetailPage(): React.JSX.Element {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const tracks = useLibrary((s) => s.tracks)
  const playContext = usePlayer((s) => s.playContext)
  const playlists = useUserData((s) => s.playlists)
  const addToPlaylist = useUserData((s) => s.addToPlaylist)
  const createPlaylist = useUserData((s) => s.createPlaylist)
  const openContextMenu = useUi((s) => s.openContextMenu)

  const albumTracks = useMemo(() => {
    if (!albumId) return []
    const key = decodeURIComponent(albumId)
    return tracks
      .filter((t) => albumKey(t) === key)
      .sort((a, b) => (a.discNo ?? 1) - (b.discNo ?? 1) || (a.trackNo ?? 0) - (b.trackNo ?? 0))
  }, [tracks, albumId])

  if (albumTracks.length === 0) {
    return (
      <div className="page">
        <EmptyState title="Album not found" subtitle="It may have been removed from your library." />
      </div>
    )
  }

  const first = albumTracks[0]
  const ids = albumTracks.map((t) => t.id)
  const totalDur = totalDuration(albumTracks.map((t) => t.duration ?? 0))
  const genres = [...new Set(first.genres)]

  const openPlaylistMenu = (e: React.MouseEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    openContextMenu(rect.left, rect.bottom + 6, [
      ...playlists.map((pl) => ({
        label: pl.name,
        onClick: () => {
          addToPlaylist(pl.id, ids)
          toast(`Added ${ids.length} track${ids.length === 1 ? '' : 's'} to “${pl.name}”`, 'success')
        }
      })),
      ...(playlists.length ? [{ separator: true }] : []),
      {
        label: 'New playlist…',
        icon: <ListPlus size={14} />,
        onClick: () => {
          const name = window.prompt('Playlist name') // eslint-disable-line no-alert
          if (name) {
            const pl = createPlaylist(name)
            if (pl) {
              addToPlaylist(pl.id, ids)
              toast(`Created “${name}”`, 'success')
            }
          }
        }
      }
    ])
  }

  return (
    <div className="page album-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} />
        Back
      </button>
      <div className="album-hero">
        <Artwork src={first.artworkUrl} alt={first.album} size={208} radius={16} seed={4} />
        <div className="album-hero-info">
          <div className="album-hero-type">Album</div>
          <h1>{first.album}</h1>
          <p className="album-hero-artist">{first.albumArtist}</p>
          <div className="album-hero-meta">
            {first.year && <span>{first.year}</span>}
            {genres.length > 0 && <span>{genres.join(', ')}</span>}
            <span>
              {albumTracks.length} track{albumTracks.length === 1 ? '' : 's'}
            </span>
            <span>{totalDur}</span>
          </div>
          <div className="album-hero-actions">
            <button className="btn btn-primary" onClick={() => playContext(ids, 0)}>
              <Play size={15} fill="currentColor" />
              Play
            </button>
            <button className="btn" onClick={() => playContext(ids, Math.floor(Math.random() * ids.length))}>
              <Shuffle size={15} />
              Shuffle
            </button>
            <button className="btn" onClick={openPlaylistMenu}>
              <ListPlus size={15} />
              Add to playlist
            </button>
          </div>
        </div>
      </div>
      <TrackTable
        tracks={albumTracks}
        showAlbum={false}
        showArtist={false}
        showQuality={false}
        showDuration={true}
        showFormat={false}
        sortable={false}
      />
    </div>
  )
}