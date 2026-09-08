import { app } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { LibraryFolder, ScanProgress, ScanResult, Track } from '@shared/ipc'

export const AUDIO_EXTS = new Set([
  '.mp3',
  '.wav',
  '.flac',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.wma'
])

const IMG_EXTS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTS.has(path.extname(filePath).toLowerCase())
}

export function trackIdFor(filePath: string): string {
  return createHash('sha1').update(filePath.toLowerCase()).digest('hex').slice(0, 24)
}

function artworkDir(): string {
  return path.join(app.getPath('userData'), 'artwork')
}

export function resolveArtworkPath(trackId: string): string | null {
  for (const ext of ['.jpg', '.png', '.webp']) {
    const p = path.join(artworkDir(), trackId + ext)
    if (existsSync(p)) return p
  }
  return null
}

let cancelRequested = false

export function requestCancel(): void {
  cancelRequested = true
}

function resetCancel(): void {
  cancelRequested = false
}

/** Recursively collect audio files under a directory (async, non-blocking). */
async function collectAudioFiles(dir: string, out: string[]): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  const dirs: string[] = []
  for (const e of entries) {
    if (e.isDirectory()) {
      dirs.push(path.join(dir, e.name))
    } else if (e.isFile() && isAudioFile(e.name)) {
      out.push(path.join(dir, e.name))
    }
  }
  for (const d of dirs) {
    if (cancelRequested) return
    await collectAudioFiles(d, out)
  }
}

interface MmFormat {
  duration?: number
  bitrate?: number
  sampleRate?: number
  bitsPerSample?: number
  numberOfChannels?: number
  codec?: string
  container?: string
  lossless?: boolean
}

interface MmCommon {
  title?: string
  artist?: string
  album?: string
  albumartist?: string
  genre?: string[]
  year?: number
  track?: { no: number | null }
  disk?: { no: number | null }
  picture?: { format: string; data: Uint8Array }[]
}

async function parseTrack(
  file: string,
  now: number,
  folder: string | null
): Promise<Track | null> {
  const ext = path.extname(file).toLowerCase()
  let common: MmCommon | null = null
  let format: MmFormat | null = null

  try {
    const mm = (await import('music-metadata')) as typeof import('music-metadata')
    const parsed = await Promise.race([
      mm.parseFile(file, { duration: true }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000))
    ])
    if (parsed) {
      common = parsed.common as unknown as MmCommon
      format = parsed.format as unknown as MmFormat
    }
  } catch {
    // Corrupted / unsupported file: index it with minimal info instead of crashing.
  }

  const id = trackIdFor(file)
  let artworkUrl: string | null = null
  const picture = common?.picture?.[0]
  if (picture && picture.data) {
    const extImg = IMG_EXTS[picture.format] ?? '.jpg'
    const dest = path.join(artworkDir(), id + extImg)
    try {
      await fs.access(dest)
      artworkUrl = `media://art/${encodeURIComponent(id + extImg)}`
    } catch {
      try {
        await fs.mkdir(artworkDir(), { recursive: true })
        await fs.writeFile(dest, Buffer.from(picture.data))
        artworkUrl = `media://art/${encodeURIComponent(id + extImg)}`
      } catch {
        /* artwork cache write failed — track still valid */
      }
    }
  }

  let fileSize = 0
  try {
    const st = await fs.stat(file)
    fileSize = st.size
  } catch {
    /* stat failed */
  }

  const lossless = format?.lossless ?? false
  const bitrate = format?.bitrate ? Math.max(0, Math.round(format.bitrate / 1000)) : null

  return {
    id,
    path: file,
    folder,
    title: common?.title?.trim() || path.basename(file, ext),
    artist: common?.artist?.trim() || common?.albumartist?.trim() || 'Unknown Artist',
    album: common?.album?.trim() || 'Unknown Album',
    albumArtist: common?.albumartist?.trim() || common?.artist?.trim() || 'Unknown Artist',
    genres: Array.isArray(common?.genre) ? (common?.genre ?? []) : [],
    year: common?.year ?? null,
    trackNo: common?.track?.no ?? null,
    discNo: common?.disk?.no ?? null,
    duration: typeof format?.duration === 'number' && isFinite(format.duration) ? format.duration : null,
    bitrate,
    sampleRate: format?.sampleRate ?? null,
    bitDepth: format?.bitsPerSample ?? null,
    channels: format?.numberOfChannels ?? null,
    codec: format?.codec ?? null,
    container: format?.container ?? null,
    lossless,
    fileSize,
    extension: ext,
    dateAdded: now,
    artworkUrl
  }
}

async function statPath(p: string): Promise<{ isDir: boolean; isFile: boolean } | null> {
  try {
    const st = await fs.stat(p)
    return { isDir: st.isDirectory(), isFile: st.isFile() }
  } catch {
    return null
  }
}

function folderFor(file: string, folders: string[]): string | null {
  const lower = file.toLowerCase()
  let best: string | null = null
  for (const f of folders) {
    const fl = f.toLowerCase()
    if (lower === fl || lower.startsWith(fl + path.sep)) {
      if (!best || fl.length > best.length) best = f
    }
  }
  return best
}

export interface ScanInputs {
  paths: string[]
  onProgress: (p: ScanProgress) => void
}

/**
 * Scan a set of files/folders. Folders are scanned recursively; loose audio
 * files are imported directly. Emits progress via onProgress. Cancellable.
 */
export async function scanPaths(inputs: ScanInputs): Promise<ScanResult> {
  const { paths, onProgress } = inputs
  resetCancel()

  const folderInputs: string[] = []
  const looseFiles: string[] = []
  for (const p of paths) {
    const st = await statPath(p)
    if (!st) continue
    if (st.isDir) folderInputs.push(p)
    else if (st.isFile && isAudioFile(p)) looseFiles.push(p)
  }

  const files: string[] = [...looseFiles]
  for (const f of folderInputs) {
    if (cancelRequested) break
    await collectAudioFiles(f, files)
  }

  const total = files.length
  const now = Date.now()
  const tracks: Track[] = []
  const seen = new Set<string>()
  let processed = 0
  let errors = 0
  let lastProgressEmit = 0

  const emitProgress = (current: string, force = false): void => {
    const t = Date.now()
    if (!force && t - lastProgressEmit < 150) return
    lastProgressEmit = t
    onProgress({ processed, total, current })
  }

  let idx = 0
  const worker = async (): Promise<void> => {
    while (idx < files.length && !cancelRequested) {
      const i = idx++
      const file = files[i]
      try {
        const tr = await parseTrack(file, now, folderFor(file, folderInputs))
        if (tr && !seen.has(tr.id)) {
          seen.add(tr.id)
          tracks.push(tr)
        }
      } catch {
        errors++
      }
      processed++
      if (processed % 8 === 0 || processed === total) emitProgress(file)
    }
  }

  const CONCURRENCY = 6
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const folders: LibraryFolder[] = folderInputs.map((p) => ({ path: p, addedAt: now }))
  emitProgress('', true)
  onProgress({ processed, total, current: '', done: true })

  return {
    tracks,
    folders,
    stats: { scanned: total, added: tracks.length, errors }
  }
}