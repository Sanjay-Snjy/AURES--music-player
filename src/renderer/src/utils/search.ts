import type { Track } from '@shared/ipc'

const normalize = (s: string): string => s.toLowerCase().trim()

export function trackMatches(t: Track, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  if (normalize(t.title).includes(q)) return true
  if (normalize(t.artist).includes(q)) return true
  if (normalize(t.album).includes(q)) return true
  if (normalize(t.albumArtist).includes(q)) return true
  for (const g of t.genres) {
    if (normalize(g).includes(q)) return true
  }
  return false
}

export function searchTracks(tracks: Track[], query: string): Track[] {
  const q = normalize(query)
  if (!q) return tracks
  return tracks.filter((t) => trackMatches(t, q))
}

export interface AlbumHit {
  key: string
  title: string
  artist: string
  year: number | null
  trackCount: number
  artworkUrl: string | null
  sample: Track
}

export function albumHits(tracks: Track[], query: string): AlbumHit[] {
  const q = normalize(query)
  const map = new Map<string, AlbumHit>()
  for (const t of tracks) {
    const key = albumKey(t)
    const existing = map.get(key)
    if (existing) {
      existing.trackCount++
      continue
    }
    const matches =
      !q || normalize(t.album).includes(q) || normalize(t.artist).includes(q)
    if (!matches) continue
    map.set(key, {
      key,
      title: t.album,
      artist: t.albumArtist,
      year: t.year,
      trackCount: 1,
      artworkUrl: t.artworkUrl,
      sample: t
    })
  }
  return [...map.values()]
}

export interface ArtistHit {
  name: string
  albumCount: number
  trackCount: number
  sample: Track
}

export function artistHits(tracks: Track[], query: string): ArtistHit[] {
  const q = normalize(query)
  const map = new Map<string, ArtistHit>()
  for (const t of tracks) {
    const name = t.artist
    const key = normalize(name)
    const existing = map.get(key)
    if (existing) {
      existing.trackCount++
      continue
    }
    if (q && !normalize(name).includes(q)) continue
    map.set(key, { name, albumCount: 1, trackCount: 1, sample: t })
  }
  // count albums
  const albums = new Map<string, Set<string>>()
  for (const t of tracks) {
    const k = normalize(t.artist)
    const a = albums.get(k) ?? new Set<string>()
    a.add(albumKey(t))
    albums.set(k, a)
  }
  for (const [k, v] of map) {
    v.albumCount = albums.get(k)?.size ?? 1
  }
  return [...map.values()]
}

export function genreHits(tracks: Track[], query: string): Array<{ name: string; trackCount: number }> {
  const q = normalize(query)
  const map = new Map<string, { name: string; count: number }>()
  for (const t of tracks) {
    for (const g of t.genres) {
      const key = normalize(g)
      if (!key) continue
      if (q && !key.includes(q)) continue
      const entry = map.get(key)
      if (entry) entry.count++
      else map.set(key, { name: g, count: 1 })
    }
  }
  return [...map.values()]
    .map((e) => ({ name: e.name, trackCount: e.count }))
    .sort((a, b) => b.trackCount - a.trackCount)
}

export function albumKey(t: Track): string {
  return `${t.album}\u0000${t.albumArtist}`
}

export function albumTitle(key: string): string {
  return key.split('\u0000')[0]
}