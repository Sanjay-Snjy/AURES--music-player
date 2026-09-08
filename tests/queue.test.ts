import { describe, expect, it } from 'vitest'
import { nextIndex, pickRandomIndex, shuffleArray } from '../src/renderer/src/utils/queue'

describe('nextIndex', () => {
  it('advances linearly', () => {
    expect(nextIndex({ queueLength: 5, current: 0, shuffle: false, repeat: 'off', direction: 1 })).toBe(1)
  })
  it('stops at the end without repeat', () => {
    expect(nextIndex({ queueLength: 5, current: 4, shuffle: false, repeat: 'off', direction: 1 })).toBe(-1)
  })
  it('wraps with repeat all', () => {
    expect(nextIndex({ queueLength: 5, current: 4, shuffle: false, repeat: 'all', direction: 1 })).toBe(0)
    expect(nextIndex({ queueLength: 5, current: 0, shuffle: false, repeat: 'all', direction: -1 })).toBe(4)
  })
  it('previous works', () => {
    expect(nextIndex({ queueLength: 5, current: 2, shuffle: false, repeat: 'off', direction: -1 })).toBe(1)
    expect(nextIndex({ queueLength: 5, current: 0, shuffle: false, repeat: 'off', direction: -1 })).toBe(-1)
  })

  it('manual navigation stays sequential when shuffle is enabled', () => {
    expect(nextIndex({ queueLength: 5, current: 0, shuffle: false, repeat: 'off', direction: 1 })).toBe(1)
    expect(nextIndex({ queueLength: 5, current: 1, shuffle: false, repeat: 'off', direction: -1 })).toBe(0)
  })
  it('shuffle picks a different valid index', () => {
    for (let i = 0; i < 50; i++) {
      const idx = nextIndex({ queueLength: 4, current: 1, shuffle: true, repeat: 'off', direction: 1 })
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(4)
      expect(idx).not.toBe(1)
    }
  })
  it('empty queue stops', () => {
    expect(nextIndex({ queueLength: 0, current: -1, shuffle: false, repeat: 'off', direction: 1 })).toBe(-1)
  })
})

describe('pickRandomIndex', () => {
  it('never returns the excluded index', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickRandomIndex(6, 3)).not.toBe(3)
    }
  })
  it('single item returns the excluded index', () => {
    expect(pickRandomIndex(1, 0)).toBe(0)
  })
})

describe('shuffleArray', () => {
  it('preserves elements and length', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffleArray(input)
    expect(out.length).toBe(5)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5]) // does not mutate
  })
})