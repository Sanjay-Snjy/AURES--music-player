export type RepeatMode = 'off' | 'all' | 'one'

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface NextIndexOpts {
  queueLength: number
  current: number
  shuffle: boolean
  repeat: RepeatMode
  direction: 1 | -1
}

/**
 * Compute the next queue index given playback mode. Returns -1 when playback
 * should stop (end of queue with repeat off).
 */
export function nextIndex(opts: NextIndexOpts): number {
  const { queueLength, current, shuffle, repeat, direction } = opts
  if (queueLength <= 0) return -1

  if (shuffle && queueLength > 1) {
    if (direction === 1) {
      let next = Math.floor(Math.random() * (queueLength - 1))
      if (next >= current) next++
      return next
    }
    let next = Math.floor(Math.random() * (queueLength - 1))
    if (next >= current) next++
    return next
  }

  const next = current + direction
  if (next >= 0 && next < queueLength) return next
  if (repeat === 'all') {
    return direction === 1 ? 0 : queueLength - 1
  }
  return -1
}

export function pickRandomIndex(queueLength: number, exclude: number): number {
  if (queueLength <= 1) return exclude
  let i = Math.floor(Math.random() * (queueLength - 1))
  if (i >= exclude) i++
  return i
}