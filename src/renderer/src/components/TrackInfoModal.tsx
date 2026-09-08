import { FolderOpen, Trash2 } from 'lucide-react'
import { useUi, toast } from '@renderer/store/ui'
import { useLibrary } from '@renderer/store/library'
import {
  formatBitrate,
  formatBytes,
  formatCodec,
  formatSampleRate,
  formatTime
} from '@renderer/utils/format'
import { Artwork } from './Artwork'
import { Modal } from './Modal'
import { FormatBadge, LosslessBadge } from './Badges'

export function TrackInfoModal(): React.JSX.Element | null {
  const track = useUi((s) => s.trackInfo)
  const setTrackInfo = useUi((s) => s.setTrackInfo)
  const removeTracks = useLibrary((s) => s.removeTracks)

  if (!track) return null

  const rows: Array<[string, string]> = [
    ['Title', track.title],
    ['Artist', track.artist],
    ['Album', track.album],
    ['Album artist', track.albumArtist],
    ['Genre', track.genres.length ? track.genres.join(', ') : 'Unknown'],
    ['Year', track.year != null ? String(track.year) : 'Unknown'],
    ['Track number', track.trackNo != null ? String(track.trackNo) : 'Unknown'],
    ['Disc number', track.discNo != null ? String(track.discNo) : 'Unknown'],
    ['Duration', formatTime(track.duration)],
    ['Format', track.extension.slice(1).toUpperCase()],
    ['Codec', formatCodec(track)],
    ['Container', track.container || 'Unknown'],
    ['Bitrate', track.lossless ? 'Lossless' : formatBitrate(track.bitrate)],
    ['Sample rate', formatSampleRate(track.sampleRate)],
    ['Bit depth', track.bitDepth != null ? `${track.bitDepth}-bit` : 'Unknown'],
    ['Channels', track.channels != null ? String(track.channels) : 'Unknown'],
    ['File size', formatBytes(track.fileSize)],
    ['Location', track.path]
  ]

  return (
    <Modal onClose={() => setTrackInfo(null)} title="Track information" width={620}>
      <div className="track-info">
        <div className="track-info-head">
          <Artwork src={track.artworkUrl} alt={track.title} size={120} radius={14} seed={2} />
          <div className="track-info-id">
            <h3>{track.title}</h3>
            <p>{track.artist}</p>
            <div className="track-info-badges">
              <FormatBadge track={track} />
              <LosslessBadge track={track} />
            </div>
          </div>
        </div>
        <div className="track-info-grid">
          {rows.map(([k, v]) => (
            <div key={k} className="track-info-row">
              <span className="ti-key">{k}</span>
              <span className="ti-val" title={v}>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="track-info-actions">
          <button
            className="btn"
            onClick={() => {
              window.snjy.showInFolder(track.path)
            }}
          >
            <FolderOpen size={14} />
            Show in folder
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              removeTracks([track.id])
              setTrackInfo(null)
              toast('Removed from library', 'info')
            }}
          >
            <Trash2 size={14} />
            Remove from library
          </button>
        </div>
      </div>
    </Modal>
  )
}