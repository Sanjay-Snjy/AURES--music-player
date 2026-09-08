import type { Track } from '@shared/ipc'
import { formatQuality, losslessBadge } from '@renderer/utils/format'

export function FormatBadge({ track }: { track: Track }): React.JSX.Element {
  return <span className="badge badge-format">{track.extension.slice(1).toUpperCase()}</span>
}

export function LosslessBadge({ track }: { track: Track }): React.JSX.Element | null {
  const label = losslessBadge(track)
  if (!label) return null
  return (
    <span className={`badge ${label.includes('HI-RES') ? 'badge-hires' : 'badge-lossless'}`}>
      {label}
    </span>
  )
}

export function QualityBadge({ track }: { track: Track }): React.JSX.Element {
  return <span className="quality-text">{formatQuality(track)}</span>
}