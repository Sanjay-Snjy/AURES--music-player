import {
  Gauge,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Waves
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '@renderer/store/player'
import { useLibrary } from '@renderer/store/library'
import { useUi, toast } from '@renderer/store/ui'
import { formatTime } from '@renderer/utils/format'
import { EQPanel } from './EQPanel'
import { Seekbar } from './Seekbar'
import { QueueDrawer } from './QueueDrawer'

export function AuresDeck(): React.JSX.Element {
  const navigate = useNavigate()
  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const isLoading = usePlayer((s) => s.isLoading)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const volume = usePlayer((s) => s.volume)
  const muted = usePlayer((s) => s.muted)
  const playbackRate = usePlayer((s) => s.playbackRate)
  const togglePlay = usePlayer((s) => s.togglePlay)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const setVolume = usePlayer((s) => s.setVolume)
  const toggleMute = usePlayer((s) => s.toggleMute)
  const cycleRepeat = usePlayer((s) => s.cycleRepeat)
  const toggleShuffle = usePlayer((s) => s.toggleShuffle)
  const cyclePlaybackRate = usePlayer((s) => s.cyclePlaybackRate)
  const setQueueOpen = useUi((s) => s.setQueueOpen)
  const queueOpen = useUi((s) => s.queueOpen)
  const setMiniMode = useUi((s) => s.setMiniMode)
  const queuedIds = usePlayer((s) => s.queuedIds)
  const tracksById = useLibrary((s) => s.tracksById)
  const nextTrack = tracksById[queuedIds[0]]
  const queueLabel = nextTrack ? `Queue: ${nextTrack.title}` : 'Queue: Add songs'

  return (
    <footer className="aures-deck">
      <div className="pb-left pb-eq-left">
        <button
          className={`chip-btn pb-queue-btn ${queueOpen ? 'icon-active' : ''}`}
          onClick={() => setQueueOpen(!queueOpen)}
          data-queue-toggle
          title={queueLabel}
          aria-label="Toggle queue"
        >
          {queueLabel}
        </button>
         <EQPanel compact />
      </div>

    {/* <div className="pb-center">
        <div className="pb-controls">
          <button
            className={`icon-btn ${shuffle ? 'icon-active' : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
            aria-label="Toggle shuffle"
            aria-pressed={shuffle}
          >
            <Shuffle size={15} />
          </button>
          <button className="icon-btn" onClick={() => prev()} title="Previous (Ctrl+Left)" aria-label="Previous track">
            <SkipBack size={18} />
          </button>
          <button
            className="pb-play"
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!currentId || isLoading}
          >
            {isLoading ? (
              <span className="spin-loader" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
          <button className="icon-btn" onClick={() => next()} title="Next (Ctrl+Right)" aria-label="Next track">
            <SkipForward size={18} />
          </button>
          <button
            className={`icon-btn ${repeat !== 'off' ? 'icon-active' : ''}`}
            onClick={cycleRepeat}
            title={`Repeat: ${repeat === 'off' ? 'off' : repeat === 'all' ? 'all' : 'one'}`}
            aria-label="Cycle repeat mode"
          >
            {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>
        <div className="pb-seek">
          <span className="pb-time">{formatTime(currentTime)}</span>
          <Seekbar showTimes={false} className="pb-seekbar" />
          <span className="pb-time">{formatTime(duration)}</span>
        </div>
      </div>   */}  

      <div className="pb-right">
        <button
          className="chip-btn"
          onClick={() => navigate('/now-playing')}
          title="Visualizer"
          aria-label="Open visualizer"
        >
          <Waves size={14} />
          <span>  <Maximize2 size={10} /> &nbsp; Visualizer</span>
        </button>
        <button
          className="chip-btn"
          onClick={cyclePlaybackRate}
          title="Playback speed"
          aria-label="Playback speed"
        >
          <Gauge size={14} />
          <span>{playbackRate.toFixed(playbackRate % 1 === 0 ? 0 : 2)}x</span>
        </button>
        <div className="pb-volume">
          <button className="icon-btn mini" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} aria-label="Mute">
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            className="vol-input"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            style={{ ['--fill' as string]: `${(muted ? 0 : volume) * 100}%` }}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            title="Volume"
          />
        </div>
        <button
          className="icon-btn"
          onClick={() => setMiniMode(true)}
          title="Mini player"
          aria-label="Switch to mini player"
        >
          <Minimize2 size={16} />
        </button>
      </div>

      <QueueDrawer />
    </footer>
  )
}