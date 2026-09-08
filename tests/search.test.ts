import { describe, expect, it } from 'vitest'
import { albumHits, artistHits, genreHits, searchTracks, trackMatches } from '../src/renderer/src/utils/search'
import type { Track } from '../src/shared/ipc'

function track(id: string, partial: Partial<Track>): Track {
  return {
    id,
    path: `C:\\${id}.flac`,
    folder: null,
    title: '',
    artist: '',
    album: '',
    albumArtist: '',
    genres: [],
    year: null,
    trackNo: null,
    discNo: null,
    duration: null,
    bitrate: null,
    sampleRate: null,
    bitDepth: null,
    channels: null,
    codec: null,
    container: null,
    lossless: true,
    fileSize: 0,
    extension: '.flac',
    dateAdded: 0,
    artworkUrl: null,
    ...partial
  }
}

const lib: Track[] = [
  track('1', { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', genres: ['Synth-pop'] }),
  track('2', { title: 'Something', artist: 'Someone', album: 'After Hours', genres: ['Rock'] }),
  track('3', { title: 'Save Your Tears', artist: 'The Weeknd', album: 'After Hours', genres: ['Synth-pop'] })
]

describe('trackMatches', () => {
  it('matches title, artist, album and genre (case-insensitive)', () => {
    expect(trackMatches(lib[0], 'blinding')).toBe(true)
    expect(trackMatches(lib[0], 'WEEKND')).toBe(true)
    expect(trackMatches(lib[1], 'after hours')).toBe(true)
    expect(trackMatches(lib[0], 'synth')).toBe(true)
    expect(trackMatches(lib[0], 'zzz')).toBe(false)
  })
  it('empty query matches everything', () => {
    expect(trackMatches(lib[0], '')).toBe(true)
  })
})

describe('searchTracks', () => {
  it('filters by artist', () => {
    expect(searchTracks(lib, 'weeknd').map((t) => t.id)).toEqual(['1', '3'])
  })
  it('empty query returns all', () => {
    expect(searchTracks(lib, '')).toHaveLength(3)
  })
})

describe('albumHits', () => {
  it('groups tracks into albums with counts', () => {
    const hits = albumHits(lib, '')
    expect(hits).toHaveLength(1)
    expect(hits[0].title).toBe('After Hours')
    expect(hits[0].trackCount).toBe(3)
  })
})

describe('artistHits', () => {
  it('aggregates artists with counts', () => {
    const hits = artistHits(lib, '')
    expect(hits.length).toBe(2)
    const weeknd = hits.find((a) => a.name === 'The Weeknd')
    expect(weeknd?.trackCount).toBe(2)
    expect(weeknd?.albumCount).toBe(1)
  })
})

describe('genreHits', () => {
  it('counts per genre', () => {
    const hits = genreHits(lib, '')
    expect(hits.find((g) => g.name === 'Synth-pop')?.trackCount).toBe(2)
    expect(hits.find((g) => g.name === 'Rock')?.trackCount).toBe(1)
  })
})