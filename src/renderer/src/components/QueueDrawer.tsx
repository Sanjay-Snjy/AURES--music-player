import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, ListPlus, Save, Trash2, X } from 'lucide-react'
import { usePlayer } from '@renderer/store/player'
import { useLibrary } from '@renderer/store/library'
import { useUserData } from '@renderer/store/userData'
import { useUi, toast } from '@renderer/store/ui'
import { Artwork } from './Artwork'
import { useTrackContextMenu } from './trackMenu'

export function QueueDrawer(): React.JSX.Element | null {
  const open = useUi((s) => s.queueOpen)
  const setOpen = useUi((s) => s.setQueueOpen)
  const queuedIds = usePlayer((s) => s.queuedIds)
  const currentId = usePlayer((s) => s.currentId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const reorderQueued = usePlayer((s) => s.reorderQueued)
  const removeQueued = usePlayer((s) => s.removeQueued)
  const clearQueued = usePlayer((s) => s.clearQueued)
  const playTrack = usePlayer((s) => s.playTrack)
  const tracksById = useLibrary((s) => s.tracksById)
  const createPlaylist = useUserData((s) => s.createPlaylist)
  const addToPlaylist = useUserData((s) => s.addToPlaylist)
  const openMenu = useTrackContextMenu()

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent): void => {
      const target = event.target as Element | null
      if (drawerRef.current?.contains(target) || target?.closest('[data-queue-toggle]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open, setOpen])

  if (!open) return null

  const saveAsPlaylist = (): void => {
    if (queuedIds.length === 0) return
    const name = window.prompt('Playlist name', 'New playlist') // eslint-disable-line no-alert
    if (!name) return
    const pl = createPlaylist(name)
    if (pl) {
      addToPlaylist(pl.id, queuedIds)
      toast(`Queue saved as “${name}”`, 'success')
    }
  }

  return createPortal(
    (
    <div ref={drawerRef} className="queue-drawer" role="dialog" aria-label="Playback queue">
      <div className="queue-head">
        <h2>Queue</h2>
        <div className="queue-actions">
          <button className="icon-btn mini" onClick={() => setOpen(false)} title="Close queue" aria-label="Close queue">
            <X size={16} />
          </button>
        </div>
      </div>

      {queuedIds.length === 0 ? (
        <div className="queue-empty">
          <ListPlus size={30} strokeWidth={1.2} />
          <p>Queue is empty</p>
          <span>Add songs to queue</span>
        </div>
      ) : (
        <div className="queue-list">
          {queuedIds.map((id, i) => {
            const track = tracksById[id]
            if (!track) return null
            const isCurrent = id === currentId
            return (
              <div
                key={`${id}-${i}`}
                className={`queue-row ${isCurrent ? 'queue-current' : ''} ${
                  dragIndex === i ? 'queue-dragging' : ''
                } ${overIndex === i && dragIndex !== i ? 'queue-over' : ''}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => {
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) setOverIndex(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) reorderQueued(dragIndex, i)
                  setDragIndex(null)
                  setOverIndex(null)
                }}
                onContextMenu={(e) => openMenu(e, track)}
              >
                <span className="queue-grip" title="Drag to reorder">
                  <GripVertical size={13} />
                </span>
                <span
                  className="queue-art"
                  onClick={() => playTrack(id)}
                  title={isCurrent && isPlaying ? 'Pause' : 'Play'}
                >
                  <Artwork src={track.artworkUrl} alt={track.title} size={36} radius={6} seed={i} />
                </span>
                <span className="queue-info">
                  <span className="queue-title">{track.title}</span>
                  <span className="queue-sub">{track.artist}</span>
                </span>
                <button
                  className="icon-btn mini queue-x"
                  onClick={() => removeQueued(id)}
                  title="Remove from queue"
                  aria-label={`Remove ${track.title} from queue`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {queuedIds.length > 0 && (
        <button className="queue-clear" onClick={clearQueued}>
          Clear queue
        </button>
      )}
    </div>
    ),
    document.body
  )
}