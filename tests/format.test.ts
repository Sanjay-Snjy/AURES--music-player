import { describe, expect, it } from 'vitest'
import {
  formatBitrate,
  formatBytes,
  formatQuality,
  formatSampleRate,
  formatTime,
  groupByDay,
  losslessBadge
} from '../src/renderer/src/utils/format'
import type { Track } from '../src/shared/ipc'

function track(partial: Partial<Track>): Track {
  return {
    id: '1',
    path: 'C:\\x.mp3',
    folder: null,
    title: 'T',
    artist: 'A',
    album: 'Al',
    albumArtist: 'A',
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
    lossless: false,
    fileSize: 0,
    extension: '.mp3',
    dateAdded: 0,
    artworkUrl: null,
    ...partial
  }
}

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(200)).toBe('3:20')
    expect(formatTime(59)).toBe('0:59')
  })
  it('formats hours', () => {
    expect(formatTime(3725)).toBe('1:02:05')
  })
  it('handles null/undefined/invalid', () => {
    expect(formatTime(null)).toBe('0:00')
    expect(formatTime(undefined)).toBe('0:00')
    expect(formatTime(Number.NaN)).toBe('0:00')
  })
})

describe('formatBitrate / formatSampleRate / formatBytes', () => {
  it('formats bitrate', () => {
    expect(formatBitrate(320)).toBe('320 kbps')
    expect(formatBitrate(null)).toBe('Unknown')
  })
  it('formats sample rate', () => {
    expect(formatSampleRate(96000)).toBe('96 kHz')
    expect(formatSampleRate(44100)).toBe('44.1 kHz')
  })
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('quality labels', () => {
  it('lossy shows kbps', () => {
    expect(formatQuality(track({ lossless: false, bitrate: 320 }))).toBe('320 kbps')
  })
  it('lossless shows bit depth / sample rate', () => {
    expect(
      formatQuality(track({ lossless: true, bitDepth: 24, sampleRate: 96000 }))
    ).toBe('24-bit / 96 kHz')
  })
  it('lossless with unknown bit depth shows Lossless', () => {
    expect(formatQuality(track({ lossless: true, bitDepth: null }))).toBe('Lossless')
  })
  it('losslessBadge marks hi-res above 48kHz', () => {
    expect(losslessBadge(track({ lossless: true, sampleRate: 96000 }))).toBe('HI-RES LOSSLESS')
    expect(losslessBadge(track({ lossless: true, sampleRate: 44100 }))).toBe('LOSSLESS')
    expect(losslessBadge(track({ lossless: false }))).toBeNull()
  })
})

describe('groupByDay', () => {
  it('groups and orders by day', () => {
    const now = Date.now()
    const yesterday = now - 86400000
    const t = track({ id: 'x' })
    const groups = groupByDay(
      [
        { trackId: 'x', playedAt: now },
        { trackId: 'x', playedAt: yesterday }
      ],
      (id) => (id === 'x' ? t : undefined)
    )
    expect(groups.length).toBe(2)
    expect(groups[0].label).toBe('Today')
    expect(groups[1].label).toBe('Yesterday')
  })
})