import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Folder,
  FolderPlus,
  Heart,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Shuffle,
  Waves
} from 'lucide-react'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'
import { usePlayer } from '@renderer/store/player'
import { toast, useUi } from '@renderer/store/ui'
import type { ContextMenuItem } from '@renderer/store/ui'
import { VISUALIZERS, VISUALIZER_KEYS } from '@renderer/visualizers/VisualizerEngine'

import { SectionRow } from '@renderer/components/SectionRow'
import { AlbumCard, albumCardData } from '@renderer/components/AlbumCard'
import { Artwork } from '@renderer/components/Artwork'
import { EmptyState } from '@renderer/components/EmptyState'
import { Seekbar } from '@renderer/components/Seekbar'
import { VisualizerCanvas } from '@renderer/components/VisualizerCanvas'
import { EqualizerBars } from '@renderer/components/TrackTable'
import { FormatBadge, LosslessBadge } from '@renderer/components/Badges'
import { useTrackContextMenu } from '@renderer/components/trackMenu'
import { formatBytes, formatQuality, formatSampleRate, formatTime } from '@renderer/utils/format'
import type { Track } from '@shared/ipc'

function underPath(filePath: string, folderPath: string): boolean {
  const f = filePath.toLowerCase()
  const p = folderPath.toLowerCase()
  return f === p || f.startsWith(p + '\\') || f.startsWith(p + '/')
}

function shortPath(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 2) return p
  return `…${parts.slice(-2).join('\\')}`
}

/** Compact audio-quality label for the detail card. */
function detailQuality(t: Track): string {
  if (t.lossless) {
    if (t.bitDepth && t.sampleRate) return `${t.bitDepth}-bit / ${formatSampleRate(t.sampleRate)}`
    return 'Lossless'
  }
  if (t.sampleRate) return formatSampleRate(t.sampleRate)
  return '—'
}

/** Effective bitrate in kbps — from tags when present, else from size/duration. */
function detailKbps(t: Track): number | null {
  if (t.bitrate && t.bitrate > 0) return Math.round(t.bitrate)
  if (t.duration && t.duration > 0 && t.fileSize > 0) {
    return Math.round((t.fileSize * 8) / (t.duration * 1000))
  }
  return null
}

function TrackMini({
  id,
  contextIds,
  title,
  artist,
  artworkUrl,
  index
}: {
  id: string
  contextIds: string[]
  title: string
  artist: string
  artworkUrl: string | null
  index: number
}): React.JSX.Element {
  const playContext = usePlayer((s) => s.playContext)
  const currentId = usePlayer((s) => s.currentId)
  return (
    <div
      className={`mini-track ${currentId === id ? 'mini-track-current' : ''}`}
      onClick={() => playContext(contextIds, contextIds.indexOf(id))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && playContext(contextIds, contextIds.indexOf(id))}
    >
      <Artwork src={artworkUrl} alt={title} size={46} radius={8} seed={index} />
      <div className="mini-track-info">
        <div className="mini-track-title">{title}</div>
        <div className="mini-track-artist">{artist}</div>
      </div>
    </div>
  )
}

export function HomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const tracks = useLibrary((s) => s.tracks)
  const folders = useLibrary((s) => s.folders)
  const hydrated = useLibrary((s) => s.hydrated)
  const tracksById = useLibrary((s) => s.tracksById)
  const addFolders = useLibrary((s) => s.addFolders)
  const favorites = useUserData((s) => s.favorites)
  const toggleFavorite = useUserData((s) => s.toggleFavorite)
  const playCounts = useUserData((s) => s.playCounts)
  const recentlyPlayed = useUserData((s) => s.recentlyPlayed)
  const settings = useUserData((s) => s.settings)
  const setSettings = useUserData((s) => s.setSettings)
  const openContextMenu = useUi((s) => s.openContextMenu)

  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const togglePlay = usePlayer((s) => s.togglePlay)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const toggleShuffle = usePlayer((s) => s.toggleShuffle)
  const cycleRepeat = usePlayer((s) => s.cycleRepeat)
  const lastTrackId = usePlayer((s) => s.lastTrackId)
  const lastPosition = usePlayer((s) => s.lastPosition)
  const playTrack = usePlayer((s) => s.playTrack)
  const playContext = usePlayer((s) => s.playContext)
  const openMenu = useTrackContextMenu()

  const [activeFolder, setActiveFolder] = useState<string>(() => folders[folders.length - 1]?.path ?? '')
  const [equalizerInstalled, setEqualizerInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    void window.snjy.isEqualizerApoInstalled().then(setEqualizerInstalled)
  }, [])

  // Keep the player bar hidden on the Home page. Other pages show it
  // normally; navigation to/from Home hides/shows it via a MutationObserver
  // on AuresDeck (see base.css keep-tokens).
  const deck = useRef<HTMLElement | null>(null)
  useEffect(() => {
    deck.current = document.getElementById('aures-deck')
    const d = deck.current
    if (!d) return

    d.addEventListener('aures-visibility-change', (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail != null) d.hidden = !detail.visible
    })
    return () => d.removeEventListener('aures-visibility-change', () => {})
  }, [])

  // Force hidden whenever Home mounts / the route is /.
  useEffect(() => {
    const d = deck.current
    if (!d) return
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => { d.hidden = true })
    })
    observer.observe(d, { attributes: true, attributeFilter: ['hidden'] })
    d.hidden = true
    return () => observer.disconnect()
  }, [])

  // Keep the selected folder valid when folders change.
  useEffect(() => {
    if (folders.length === 0) {
      setActiveFolder('')
      return
    }
    setActiveFolder((cur) => (folders.some((f) => f.path === cur) ? cur : folders[folders.length - 1].path))
  }, [folders])

  const folderTracks = useMemo(() => {
    if (!activeFolder) return tracks
    return tracks
      .filter((t) => underPath(t.path, activeFolder))
      .sort(
        (a, b) =>
          (a.discNo ?? 1) - (b.discNo ?? 1) ||
          (a.trackNo ?? 9999) - (b.trackNo ?? 9999) ||
          a.title.localeCompare(b.title)
      )
  }, [tracks, activeFolder])

  const folderIds = useMemo(() => folderTracks.map((t) => t.id), [folderTracks])

  const recentlyAdded = useMemo(
    () => [...tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 14),
    [tracks]
  )
  const mostPlayed = useMemo(
    () =>
      [...tracks]
        .sort((a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0))
        .slice(0, 14),
    [tracks, playCounts]
  )
  const favTracks = useMemo(
    () => favorites.map((id) => tracksById[id]).filter((t): t is NonNullable<typeof t> => !!t),
    [favorites, tracksById]
  )
  const recentTracks = useMemo(
    () =>
      recentlyPlayed
        .map((r) => tracksById[r.trackId])
        .filter((t): t is NonNullable<typeof t> => !!t)
        .slice(0, 14),
    [recentlyPlayed, tracksById]
  )
  const albums = useMemo(() => albumCardData(tracks).slice(0, 14), [tracks])

  // Albums row: vertical wheel scrolls the row horizontally (no visible scrollbar).
  const albumsRowRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = albumsRowRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return // nothing to scroll — let the page scroll normally
      // Only remap vertical gestures; horizontal trackpad swipes scroll natively.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0
      const atEnd = el.scrollLeft >= maxScroll - 1 && e.deltaY > 0
      if (atStart || atEnd) return // at a boundary — allow vertical page scroll
      e.preventDefault()
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * el.clientWidth : e.deltaY
      el.scrollLeft += step
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [albums.length])

  const currentTrack = currentId ? tracksById[currentId] : undefined
  const resumeTrack = currentTrack ?? (lastTrackId ? tracksById[lastTrackId] : undefined)
  const resumeMode = !currentId && !!lastTrackId

  // Track whose details are shown in the "now playing" detail card.
  const detailTrack = currentTrack ?? resumeTrack
  const detail = detailTrack
    ? (() => {
        const kbps = detailKbps(detailTrack)
        return {
          title: detailTrack.title,
          artist: detailTrack.albumArtist || detailTrack.artist || 'Unknown artist',
          artwork: detailTrack.artworkUrl,
          duration: formatTime(detailTrack.duration),
          quality: detailQuality(detailTrack),
          kbps: kbps != null ? `${kbps} kbps` : '—',
          codec: detailTrack.extension || '—',
          size: formatBytes(detailTrack.fileSize),
          dataRate: kbps != null ? `${(kbps / 1000).toFixed(2)} Mbps` : '—',
          id: detailTrack.id
        }
      })()
    : null
  const isFavorite = resumeTrack ? favorites.includes(resumeTrack.id) : false

  if (!hydrated) {
    return (
      <div className="page page-center">
        <div className="spin-loader" />
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<Music size={40} strokeWidth={1.1} />}
          title="Your library is waiting."
          subtitle="Add a music folder to begin — AURES scans everything locally and never touches the cloud."
          action={
            <>
              <button className="btn btn-primary btn-lg" onClick={() => void addFolders()}>
                <FolderPlus size={16} />
                Add Music Folder
              </button>
              <span className="empty-hint">…or drag music files and folders anywhere into the app</span>
            </>
          }
        />
      </div>
    )
  }

  const playFromCard = (): void => {
    if (currentTrack) {
      togglePlay()
    } else if (resumeTrack) {
      void playTrack(resumeTrack.id, { resume: resumeMode })
    }
  }

  const openEqualizerApo = async (): Promise<void> => {
    try {
      const res = await window.snjy.openEqualizerApo()
      if (res.ok) {
        toast('Equalizer APO launched', 'success')
      } else {
        toast(res.error ?? 'Unable to launch Equalizer APO', 'error')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to launch Equalizer APO', 'error')
    }
  }

  const openPeaceEqualizer = async (): Promise<void> => {
    try {
      const res = await window.snjy.openPeaceEqualizer()
      if (res.ok) {
        toast('Peace Equalizer launched', 'success')
      } else {
        toast(res.error ?? 'Unable to launch Peace Equalizer', 'error')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to launch Peace Equalizer', 'error')
    }
  }

  const openVizMenu = (e: React.MouseEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const items: ContextMenuItem[] = [
      {
        label: 'AUTO mode',
        icon: settings.visualizerAuto ? <Check size={14} /> : undefined,
        onClick: () => setSettings({ visualizerAuto: !settings.visualizerAuto })
      },
      { separator: true },
      ...VISUALIZER_KEYS.map((key) => ({
        label: VISUALIZERS[key].name,
        icon: settings.visualizerMode === key ? <Check size={14} /> : undefined,
        onClick: () => setSettings({ visualizerMode: key })
      }))
    ]
    openContextMenu(rect.left, rect.bottom + 6, items)
  }

  return (
    <div className="page home-page">
      <div className="home-dash">
        <div className="home-col-main">
          {/* ------- Music player with visualization ------- */}
          <section className="home-card home-player-card" aria-label="Music player with visualization">
          <div className="home-viz">
            <VisualizerCanvas />
            <div className="home-viz-scrim" />
          </div>
          <button
            className="home-viz-btn"
            onClick={openVizMenu}
            title={`Visualizer: ${VISUALIZERS[settings.visualizerMode]?.name ?? settings.visualizerMode}`}
            aria-label="Change visualizer"
            aria-haspopup="menu"
          >
            <Waves size={13} />
            {VISUALIZERS[settings.visualizerMode]?.name ?? 'Visualizer'}
          </button>
          <div className="home-card-label"> </div>
          <div className="home-player-inner">
            <div
              className={`home-disc ${isPlaying && currentTrack ? 'home-disc-spin' : ''}`}
              onClick={() => currentTrack && navigate('/now-playing')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && currentTrack && navigate('/now-playing')}
              title={currentTrack ? 'Open Now Playing' : resumeTrack ? 'Resume last track' : undefined}
              aria-label="Open now playing"
            >
              <Artwork
                src={resumeTrack?.artworkUrl}
                alt={resumeTrack?.title}
                size={188}
                radius={84}
                seed={7}
              />
            </div>
            <div className="home-player-controls">
              <div className="home-track-title" title={resumeTrack?.title}>
                {resumeTrack?.title ?? 'Nothing playing'}
              </div>
              <div className="home-track-artist">
                {resumeTrack?.artist ?? 'Pick a song from your library'}
              </div>
              {resumeMode && resumeTrack && (
                <div className="home-resume" title={`Resume from ${formatTime(lastPosition)}`}>
                  Resume from {formatTime(lastPosition)}
                </div>
              )}
              <div className="home-transport">
                <button
                  className="pill-btn"
                  onClick={() =>
                    currentTrack
                      ? prev()
                      : resumeTrack && void playTrack(resumeTrack.id, { resume: resumeMode })
                  }
                  title="Previous"
                  aria-label="Previous track"
                >
                  <SkipBack size={18} />
                </button>
                <button
                  className="home-play"
                  onClick={playFromCard}
                  disabled={!resumeTrack}
                  title={
                    currentTrack
                      ? isPlaying
                        ? 'Pause'
                        : 'Play'
                      : resumeMode
                        ? 'Resume'
                        : 'Pick a song'
                  }
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {currentTrack && isPlaying ? (
                    <Pause size={22} fill="currentColor" />
                  ) : (
                    <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
                  )}
                </button>
                <button
                  className="pill-btn"
                  onClick={() =>
                    currentTrack
                      ? next()
                      : resumeTrack && void playTrack(resumeTrack.id, { resume: resumeMode })
                  }
                  title="Next"
                  aria-label="Next track"
                >
                  <SkipForward size={18} />
                </button>
              </div>
              <Seekbar className="home-seek" />
              <div className="home-secondary-controls" aria-label="Playback options">
                <button
                  className={`home-option-btn ${isFavorite ? 'home-option-active' : ''}`}
                  onClick={() => resumeTrack && toggleFavorite(resumeTrack.id)}
                  disabled={!resumeTrack}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={isFavorite}
                >
                  <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  className={`home-option-btn ${shuffle ? 'home-option-active' : ''}`}
                  onClick={toggleShuffle}
                  title={`Shuffle: ${shuffle ? 'On' : 'Off'}`}
                  aria-label={`Shuffle: ${shuffle ? 'On' : 'Off'}`}
                  aria-pressed={shuffle}
                >
                  <Shuffle size={16} />
                </button>
                <button
                  className={`home-option-btn ${repeat !== 'off' ? 'home-option-active' : ''}`}
                  onClick={cycleRepeat}
                  title={`Repeat: ${repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}`}
                  aria-label={`Repeat: ${repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One'}`}
                  aria-pressed={repeat !== 'off'}
                >
                  {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </button>
              </div>
            </div>
          </div>
         </section>

          {/* ------- Recently played ------- */}
          <section className="home-recent-sec" aria-labelledby="recently">
            <div className="section-head">
              <h2 id="recently">Recently played</h2>
            </div>
            {recentTracks.length > 0 ? (
              <div className="home-recent-grid">
                {recentTracks.slice(0, 6).map((t, i) => (
                  <TrackMini
                    key={t.id}
                    id={t.id}
                    contextIds={recentTracks.map((x) => x.id)}
                    title={t.title}
                    artist={t.artist}
                    artworkUrl={t.artworkUrl}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <div className="home-recent-empty">Nothing played yet</div>
            )}
          </section>

          {/* ------- Albums ------- */}
          {albums.length > 0 && (
            <section className="home-albums-sec" aria-labelledby="albums">
              <div className="section-head">
                <h2 id="albums">Albums</h2>
              </div>
              <div className="home-albums-row" ref={albumsRowRef}>
                {albums.slice(0, 12).map((a) => (
                  <AlbumCard key={a.key} album={a} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="home-side">
          {/* ------- Now playing details ------- */}
          <section className="home-card home-detail-card" aria-label="Song details">
              <div className="home-detail-head">
              <span className="home-detail-caption">Now playing</span>
           
            </div>
            {detail ? (
              <>
                <div className="home-detail-track">
          
                  <div className="home-detail-id">
                    <div className="home-detail-title" title={detail.title}>
                      {detail.title}
                    </div>
                    <div className="home-detail-artist" title={detail.artist}>
                      {detail.artist}
                    </div>
                  </div>
                  <div className="home-detail-badge">
                    {detailTrack && detailTrack.lossless ? (
                      <LosslessBadge track={detailTrack} />
                    ) : detailTrack ? (
                      <FormatBadge track={detailTrack} />
                    ) : null}
                  </div>
                </div>
                <div className="home-detail-stats">
                  <div className="hd-stat">
                    <span className="hd-label">Duration</span>
                    <span className="hd-value">{detail.duration}</span>
                  </div>
                  <div className="hd-stat">
                    <span className="hd-label">Audio quality</span>
                    <span className="hd-value">{detail.quality}</span>
                  </div>
                  <div className="hd-stat">
                    <span className="hd-label">Bitrate</span>
                    <span className="hd-value">{detail.kbps}</span>
                  </div>
                  <div className="hd-stat">
                    <span className="hd-label">Codec</span>
                    <span className="hd-value">{detail.codec}</span>
                  </div>
                  <div className="hd-stat">
                    <span className="hd-label">File size</span>
                    <span className="hd-value">{detail.size}</span>
                  </div>
                  <div className="hd-stat">
                    <span className="hd-label">Data rate</span>
                    <span className="hd-value">{detail.dataRate}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="home-detail-empty">
                <Music size={20} strokeWidth={1.2} />
                <span>Pick a song to see its details</span>
              </div>
            )}
          </section>

          {/* ------- Imported folder tracks ------- */}
          <section className="home-card home-folder-card" aria-label="Imported folder">
          <div className="home-folder-head">
            <Folder size={15} className="home-folder-icon" />
            {folders.length > 1 ? (
              <select
                className="select home-folder-select"
                value={activeFolder}
                onChange={(e) => setActiveFolder(e.target.value)}
                aria-label="Music folder"
                title={activeFolder}
              >
                {folders.map((f) => (
                  <option key={f.path} value={f.path}>
                    {shortPath(f.path)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="home-folder-path" title={activeFolder}>
                {activeFolder ? shortPath(activeFolder) : 'Music'}
              </span>
            )}
            <span className="home-folder-count">
              {folderTracks.length} track{folderTracks.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="home-folder-list">
            {folderTracks.length === 0 ? (
              <div className="home-folder-empty">
                <Music size={22} strokeWidth={1.2} />
                <span>No tracks in this folder</span>
              </div>
            ) : (
              folderTracks.map((t, i) => {
                const isCurrent = t.id === currentId
                return (
                  <div
                    key={t.id}
                    className={`home-folder-row ${isCurrent ? 'home-folder-current' : ''}`}
                    onClick={() => playContext(folderIds, i)}
                    onContextMenu={(e) => openMenu(e, t)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && playContext(folderIds, i)}
                    aria-label={`Play ${t.title}`}
                  >
                    <span className="hf-index">
                      {isCurrent && isPlaying ? (
                        <EqualizerBars />
                      ) : isCurrent ? (
                        <span className="now-dot" />
                      ) : (
                        String(i + 1).padStart(2, '0')
                      )}
                    </span>
                    <Artwork src={t.artworkUrl} alt={t.title} size={32} radius={6} seed={i} />
                    <span className="hf-info">
                      <span className="hf-title" title={t.title}>
                        {t.title}
                      </span>
                      <span className="hf-sub" title={`${t.artist} • ${t.album}`}>
                        {t.artist} • {t.album}
                      </span>
                    </span>
                   
                    <span className="hf-dur">{formatTime(t.duration)}</span>
                    <button
                      className="icon-btn mini hf-more"
                      title="More actions"
                      aria-label="More actions"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        openMenu({ clientX: rect.left - 180, clientY: rect.bottom + 4 }, t)
                      }}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
          </section>

          {/* ------- Equalizer tools ------- */}
          <section className="home-card home-eq-card" aria-label="Equalizer tools">
            <div className="home-eq-bg" aria-hidden="true" />
              <button
                className="home-eq-btn"
                onClick={() => void openEqualizerApo()}
                title="Launch Equalizer APO (Editor.exe)"
                aria-label="Open Equalizer APO"
              >
                <span className="home-eq-btn-emoji" aria-hidden="true">
                  
                </span>
                <span className="home-eq-btn-name">Equalizer APO</span>
              </button>
              {equalizerInstalled === false && (
                <a
                  className="home-eq-download"
                  href="https://equalizerapo.com/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Equalizer APO
                </a>
              )}
            
            
          </section>
        </div>
      </div>
    </div>
  )
}