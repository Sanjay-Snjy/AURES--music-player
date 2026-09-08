import { Heart, Maximize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayer } from '@renderer/store/player'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'
import { useUi } from '@renderer/store/ui'
import { formatTime } from '@renderer/utils/format'
import { Artwork } from './Artwork'
import { Seekbar } from './Seekbar'

export function MiniPlayer(): React.JSX.Element | null {
  const miniMode = useUi((s) => s.miniMode)
  const setMiniMode = useUi((s) => s.setMiniMode)
  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const togglePlay = usePlayer((s) => s.togglePlay)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const favorites = useUserData((s) => s.favorites)
  const toggleFavorite = useUserData((s) => s.toggleFavorite)
  const track = useLibrary((s) => (currentId ? s.tracksById[currentId] : undefined))

  if (!miniMode) return null

  const isFav = track ? favorites.includes(track.id) : false

  return (
    <div className="mini-player">
      <div className="mini-card">
        <div className={`mini-art ${isPlaying ? 'mini-spin' : ''}`}>
          <Artwork src={track?.artworkUrl} alt={track?.title} size={160} radius={80} seed={3} />
        </div>
        <div className="mini-title" title={track?.title}>
          {track?.title ?? 'Nothing playing'}
        </div>
        <div className="mini-artist">{track?.artist ?? 'Add music to get started'}</div>
        <div className="mini-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Seekbar showTimes={false} className="mini-seek" />
        <div className="mini-controls">
          <button className="icon-btn" onClick={() => prev()} title="Previous" aria-label="Previous track">
            <SkipBack size={19} />
          </button>
          <button
            className="pb-play"
            onClick={togglePlay}
            disabled={!track}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
          <button className="icon-btn" onClick={() => next()} title="Next" aria-label="Next track">
            <SkipForward size={19} />
          </button>
        </div>
        <div className="mini-extras">
          <button
            className={`icon-btn mini ${isFav ? 'fav-on' : ''}`}
            disabled={!track}
            onClick={() => track && toggleFavorite(track.id)}
            title="Favorite"
            aria-label="Favorite"
          >
            <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          <button
            className="icon-btn mini"
            onClick={() => setMiniMode(false)}
            title="Full player"
            aria-label="Return to full player"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}