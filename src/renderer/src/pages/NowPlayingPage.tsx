import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { usePlayer } from '@renderer/store/player'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'
import { useUi } from '@renderer/store/ui'
import { VISUALIZERS, VISUALIZER_KEYS } from '@renderer/visualizers/VisualizerEngine'
import { formatTime } from '@renderer/utils/format'
import { Artwork } from '@renderer/components/Artwork'
import { Seekbar } from '@renderer/components/Seekbar'
import { VisualizerCanvas } from '@renderer/components/VisualizerCanvas'
import { EQPanel } from '@renderer/components/EQPanel'
import { EmptyState } from '@renderer/components/EmptyState'

export function NowPlayingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const togglePlay = usePlayer((s) => s.togglePlay)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const toggleShuffle = usePlayer((s) => s.toggleShuffle)
  const cycleRepeat = usePlayer((s) => s.cycleRepeat)
  const queue = usePlayer((s) => s.queue)
  const queueIndex = usePlayer((s) => s.queueIndex)
  const tracksById = useLibrary((s) => s.tracksById)
  const favorites = useUserData((s) => s.favorites)
  const toggleFavorite = useUserData((s) => s.toggleFavorite)
  const settings = useUserData((s) => s.settings)
  const setSettings = useUserData((s) => s.setSettings)
  const setQueueOpen = useUi((s) => s.setQueueOpen)

  const track = currentId ? tracksById[currentId] : undefined
  const [showEq, setShowEq] = useState(false)
  const isFav = track ? favorites.includes(track.id) : false

  const upNext = useMemo(() => {
    if (!track || queue.length === 0) return null
    const nextIdx = queueIndex + 1
    if (nextIdx >= queue.length) return repeat === 'all' ? queue[0] : null
    return queue[nextIdx]
  }, [queue, queueIndex, repeat, track])

  if (!track) {
    return (
      <div className="np-page">
        <button className="np-back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <EmptyState
          icon={<Sparkles size={40} strokeWidth={1.1} />}
          title="Nothing playing"
          subtitle="Pick a song from your library and the visuals come alive."
        />
      </div>
    )
  }

  const upNextTrack = upNext ? tracksById[upNext] : null

  return (
    <div className="np-page">
      <div className="np-viz">
        <VisualizerCanvas />
        <div className="np-viz-scrim" />
      </div>

      <button className="np-back" onClick={() => navigate(-1)} aria-label="Back">
        <ArrowLeft size={18} />
      </button>

      <div className="np-main">
        <div className="np-left">
          <div className={`np-art ${isPlaying ? 'np-art-spin' : ''}`}>
            <Artwork src={track.artworkUrl} alt={track.title} size={264} radius={150} seed={7} />
          </div>
        </div>

        <div className="np-right">
          <div className="np-title" title={track.title}>
            {track.title}
          </div>
          <div className="np-artist">{track.artist}</div>
          <div className="np-album">
            {track.album}
            {track.year ? ` • ${track.year}` : ''}
          </div>

          <div className="np-heart-row">
            <button
              className={`icon-btn ${isFav ? 'fav-on' : ''}`}
              onClick={() => toggleFavorite(track.id)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Favorite"
            >
              <Heart size={17} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="np-seek">
            <Seekbar className="np-seekbar" />
            <div className="np-times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="np-controls">
            <button
              className={`icon-btn ${shuffle ? 'icon-active' : ''}`}
              onClick={toggleShuffle}
              title="Shuffle"
              aria-label="Shuffle"
            >
              <Shuffle size={17} />
            </button>
            <button className="icon-btn" onClick={() => prev()} title="Previous" aria-label="Previous">
              <SkipBack size={22} />
            </button>
            <button className="pb-play np-play" onClick={togglePlay} title="Play/Pause" aria-label="Play or pause">
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>
            <button className="icon-btn" onClick={() => next()} title="Next" aria-label="Next">
              <SkipForward size={22} />
            </button>
            <button
              className={`icon-btn ${repeat !== 'off' ? 'icon-active' : ''}`}
              onClick={cycleRepeat}
              title={`Repeat: ${repeat}`}
              aria-label="Repeat"
            >
              {repeat === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            </button>
          </div>

          <div className="np-modes">
            <div className="np-modes-head">
              <span className="np-modes-title">Visualizer</span>
              <label className="np-auto">
                <input
                  type="checkbox"
                  checked={settings.visualizerAuto}
                  onChange={(e) => setSettings({ visualizerAuto: e.target.checked })}
                />
                <Sparkles size={12} />
                AUTO
              </label>
            </div>
            <div className="np-mode-chips">
              {VISUALIZER_KEYS.map((key) => (
                <button
                  key={key}
                  className={`chip ${settings.visualizerMode === key ? 'chip-active' : ''}`}
                  onClick={() => setSettings({ visualizerMode: key })}
                >
                  {VISUALIZERS[key].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="np-footer">
        {upNextTrack && (
          <div className="np-upnext">
            <span>Up next</span>
            <b>{upNextTrack.title}</b>
            <span>— {upNextTrack.artist}</span>
          </div>
        )}
        <div className="np-footer-actions">
          <button
            className="icon-btn"
            onClick={() => setQueueOpen(true)}
            title="Queue"
            aria-label="Queue"
          >
            <ListMusic size={17} />
          </button>
          <button
            className={`icon-btn ${showEq ? 'icon-active' : ''}`}
            onClick={() => setShowEq(!showEq)}
            title="Equalizer"
            aria-label="Equalizer"
          >
            <SlidersHorizontal size={17} />
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings?tab=visualization')} title="Visualization settings" aria-label="Visualization settings">
            <Sparkles size={17} />
          </button>
        </div>
      </div>

      {showEq && (
        <div className="np-eq">
          <div className="np-eq-head">
            <span>Equalizer</span>
            <button className="link-btn" onClick={() => navigate('/settings?tab=audio')}>
              Open in settings
            </button>
          </div>
          <EQPanel />
        </div>
      )}
    </div>
  )
}