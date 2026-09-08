import type { HistoryEntry, Track } from '@shared/ipc'

export function formatTime(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec) || sec < 0) return '0:00'
  const total = Math.floor(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !isFinite(bytes)) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function formatBitrate(kbps: number | null | undefined): string {
  if (kbps == null || !isFinite(kbps) || kbps <= 0) return 'Unknown'
  return `${Math.round(kbps)} kbps`
}

export function formatSampleRate(hz: number | null | undefined): string {
  if (hz == null || !isFinite(hz) || hz <= 0) return 'Unknown'
  return `${hz / 1000} kHz`
}

/**
 * Quality column text.
 *  - Lossless: "24-bit / 96 kHz" or "Lossless" when bit depth is unknown.
 *  - Lossy: "320 kbps" (or "Unknown").
 */
export function formatQuality(track: Track): string {
  if (track.lossless) {
    if (track.bitDepth && track.sampleRate) {
      return `${track.bitDepth}-bit / ${formatSampleRate(track.sampleRate)}`
    }
    return 'Lossless'
  }
  return formatBitrate(track.bitrate)
}

/** Subtle badge: LOSSLESS / HI-RES LOSSLESS when applicable. */
export function losslessBadge(track: Track): string | null {
  if (!track.lossless) return null
  if (track.sampleRate && track.sampleRate > 48000) return 'HI-RES LOSSLESS'
  return 'LOSSLESS'
}

export function formatCodec(track: Track): string {
  if (track.codec) return track.codec
  const map: Record<string, string> = {
    '.mp3': 'MPEG Audio Layer 3',
    '.wav': 'PCM',
    '.flac': 'FLAC',
    '.m4a': 'AAC',
    '.aac': 'AAC',
    '.ogg': 'Vorbis',
    '.opus': 'Opus',
    '.wma': 'Windows Media Audio'
  }
  return map[track.extension] ?? track.extension.slice(1).toUpperCase()
}

export function totalDuration(seconds: number[]): string {
  const sum = seconds.filter((s): s is number => typeof s === 'number' && isFinite(s)).reduce((a, b) => a + b, 0)
  return formatTime(sum)
}

export interface DayGroup {
  label: string
  entries: Array<{ track: Track; playedAt: number }>
}

function dayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const that = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

/** Group history entries by day, newest first. */
export function groupByDay(
  history: HistoryEntry[],
  trackOf: (id: string) => Track | undefined
): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  const sorted = [...history].sort((a, b) => b.playedAt - a.playedAt)
  for (const h of sorted) {
    const track = trackOf(h.trackId)
    if (!track) continue
    const label = dayLabel(new Date(h.playedAt))
    const g = groups.get(label)
    if (g) g.entries.push({ track, playedAt: h.playedAt })
    else groups.set(label, { label, entries: [{ track, playedAt: h.playedAt }] })
  }
  return [...groups.values()]
}