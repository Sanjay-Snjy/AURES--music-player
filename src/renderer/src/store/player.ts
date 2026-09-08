import { create } from 'zustand'
import type { PlayerPrefs } from '@shared/ipc'
import { audioEngine, mediaUrlFor } from './audio'
import { useLibrary } from './library'
import { useUserData } from './userData'
import { persistAppData } from './persist'
import { nextIndex, pickRandomIndex } from '../utils/queue'
import type { RepeatMode } from '../utils/queue'

const RATES = [1, 1.25, 1.5, 2]

export interface PlayContext {
  ids: string[]
  index: number
}

export interface PlayerState extends PlayerPrefs {
  queue: string[]
  queuedIds: string[]
  queueIndex: number
  currentId: string | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  error: string | null
  hydrated: boolean

  hydrate(p: PlayerPrefs): void
  playTrack(trackId: string, opts?: { resume?: boolean; context?: PlayContext }): Promise<void>
  playContext(ids: string[], index: number): void
  togglePlay(): void
  next(auto?: boolean): void
  prev(): void
  seek(t: number): void
  seekBy(delta: number): void
  setVolume(v: number): void
  toggleMute(): void
  cycleRepeat(): void
  toggleShuffle(): void
  cyclePlaybackRate(): void
  setQueue(ids: string[]): void
  reorderQueue(from: number, to: number): void
  addToQueue(ids: string[], opts?: { next?: boolean }): void
  reorderQueued(from: number, to: number): void
  removeQueued(id: string): void
  clearQueued(): void
  removeFromQueue(index: number): void
  clearQueue(): void
  setEQGains(gains: number[]): void
  setEqEnabled(v: boolean): void
  stop(): void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  queuedIds: [],
  queueIndex: -1,
  currentId: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  error: null,
  hydrated: false,

  volume: 0.8,
  muted: false,
  playbackRate: 1,
  shuffle: false,
  repeat: 'off',
  eqEnabled: false,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lastTrackId: null,
  lastPosition: 0,

  hydrate(p) {
    audioEngine.setVolume(p.volume)
    audioEngine.setMuted(p.muted)
    audioEngine.setPlaybackRate(p.playbackRate)
    set({
      volume: p.volume,
      muted: p.muted,
      playbackRate: p.playbackRate,
      shuffle: p.shuffle,
      repeat: p.repeat,
      eqEnabled: p.eqEnabled,
      eqGains: p.eqGains?.length === 10 ? p.eqGains : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      lastTrackId: p.lastTrackId,
      lastPosition: p.lastPosition,
      hydrated: true
    })
    audioEngine.setEQ(get().eqGains, get().eqEnabled)
  },

  async playTrack(trackId, opts) {
    const lib = useLibrary.getState()
    const track = lib.tracksById[trackId]
    if (!track) {
      set({
        error: 'Unable to play this file. It may have been moved or deleted.',
        isPlaying: false,
        isLoading: false
      })
      return
    }

    set({ queuedIds: get().queuedIds.filter((id) => id !== trackId) })

    if (opts?.context) {
      set({ queue: opts.context.ids, queueIndex: opts.context.index })
    } else {
      const idx = get().queue.indexOf(trackId)
      if (idx >= 0) set({ queueIndex: idx })
      else set({ queue: [...get().queue, trackId], queueIndex: get().queue.length })
    }

    let resumeAt = 0
    if (opts?.resume && get().lastTrackId === trackId) {
      resumeAt = get().lastPosition
      set({ lastTrackId: null, lastPosition: 0 })
      persistAppData()
    }

    set({ currentId: trackId, isLoading: true, error: null, currentTime: 0, duration: 0 })
    audioEngine.setPlaybackRate(get().playbackRate)
    audioEngine.setVolume(get().volume)
    audioEngine.setMuted(get().muted)
    audioEngine.setEQ(get().eqGains, get().eqEnabled)
    audioEngine.load(mediaUrlFor(track.path))
    await audioEngine.play()
    if (resumeAt > 2) audioEngine.seek(resumeAt)
  },

  playContext(ids, index) {
    if (ids.length === 0) return
    set({ queue: ids, queuedIds: [], queueIndex: index })
    void get().playTrack(ids[index])
  },

  togglePlay() {
    if (get().currentId) {
      audioEngine.toggle()
    } else {
      const lib = useLibrary.getState()
      if (lib.tracks.length > 0) get().playContext(lib.tracks.map((t) => t.id), 0)
    }
  },

  next(auto = false) {
    const { queue, queuedIds, queueIndex, shuffle, repeat } = get()
    if (queue.length === 0) return
    // Manual next follows the queue; shuffle remains available for automatic playback.
    if (shuffle && auto && queue.length > 1) {
      const idx = pickRandomIndex(queue.length, queueIndex)
      set({
        queueIndex: idx,
        queuedIds: queuedIds.filter((id) => id !== queue[idx]),
        currentTime: 0,
        duration: 0
      })
      void get().playTrack(queue[idx])
      return
    }
    const idx = nextIndex({
      queueLength: queue.length,
      current: queueIndex,
      shuffle: false,
      repeat,
      direction: 1
    })
    if (idx === -1) {
      audioEngine.pause()
      set({ isPlaying: false, currentTime: 0, queueIndex: queue.length - 1 })
      return
    }
    set({
      queueIndex: idx,
      queuedIds: queuedIds.filter((id) => id !== queue[idx]),
      currentTime: 0,
      duration: 0
    })
    void get().playTrack(queue[idx])
  },

  prev() {
    const { queue, queueIndex } = get()
    if (queue.length === 0) return
    if (audioEngine.currentTime > 3) {
      audioEngine.seek(0)
      return
    }
    const idx = nextIndex({
      queueLength: queue.length,
      current: queueIndex,
      shuffle: false,
      repeat: get().repeat,
      direction: -1
    })
    if (idx === -1) {
      audioEngine.seek(0)
      return
    }
    set({ queueIndex: idx, currentTime: 0, duration: 0 })
    void get().playTrack(queue[idx])
  },

  seek(t) {
    audioEngine.seek(t)
    set({ currentTime: t })
  },

  seekBy(delta) {
    audioEngine.seek(audioEngine.currentTime + delta)
  },

  setVolume(v) {
    const vol = Math.min(1, Math.max(0, v))
    audioEngine.setVolume(vol)
    set({ volume: vol, muted: vol === 0 ? get().muted : false })
    persistAppData()
  },

  toggleMute() {
    const muted = !get().muted
    audioEngine.setMuted(muted)
    set({ muted })
    persistAppData()
  },

  cycleRepeat() {
    const order: RepeatMode[] = ['off', 'all', 'one']
    const next = order[(order.indexOf(get().repeat) + 1) % order.length]
    set({ repeat: next })
    persistAppData()
  },

  toggleShuffle() {
    set({ shuffle: !get().shuffle })
    persistAppData()
  },

  cyclePlaybackRate() {
    const idx = RATES.indexOf(get().playbackRate)
    const next = RATES[(idx + 1) % RATES.length]
    audioEngine.setPlaybackRate(next)
    set({ playbackRate: next })
    persistAppData()
  },

  setQueue(ids) {
    set({ queue: ids, queuedIds: [], queueIndex: ids.length ? Math.min(get().queueIndex, ids.length - 1) : -1 })
  },

  reorderQueue(from, to) {
    const { queue, queueIndex } = get()
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return
    const next = [...queue]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    let qi = queueIndex
    if (from === qi) qi = to
    else if (from < qi && to >= qi) qi--
    else if (from > qi && to <= qi) qi++
    set({ queue: next, queueIndex: qi })
  },

  addToQueue(ids, opts) {
    const { queue, queuedIds, queueIndex } = get()
    const currentId = queue[queueIndex]
    const fresh = ids.filter((id) => id !== currentId && !queuedIds.includes(id))
    if (fresh.length === 0) return
    const removedBeforeCurrent = fresh.filter((id) => queue.indexOf(id) >= 0 && queue.indexOf(id) < queueIndex).length
    const withoutFresh = queue.filter((id) => !fresh.includes(id))
    const nextIndex = queueIndex - removedBeforeCurrent
    const after = Math.max(0, nextIndex + 1)
    const nextQueue = [...withoutFresh.slice(0, after), ...fresh, ...withoutFresh.slice(after)]
    const nextQueuedIds = opts?.next ? [...fresh, ...queuedIds] : [...queuedIds, ...fresh]
    set({ queue: nextQueue, queuedIds: nextQueuedIds, queueIndex: nextIndex })
  },

  reorderQueued(from, to) {
    const { queuedIds } = get()
    if (from === to || from < 0 || to < 0 || from >= queuedIds.length || to >= queuedIds.length) return
    const next = [...queuedIds]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    set({ queuedIds: next })
  },

  removeQueued(id) {
    const { queuedIds, queue, queueIndex } = get()
    const index = queue.indexOf(id)
    const nextQueue = index >= 0 ? queue.filter((queuedId) => queuedId !== id) : queue
    const nextIndex = index >= 0 && index < queueIndex ? queueIndex - 1 : queueIndex
    set({ queuedIds: queuedIds.filter((queuedId) => queuedId !== id), queue: nextQueue, queueIndex: nextIndex })
  },

  clearQueued() {
    const { queuedIds, queue } = get()
    set({ queuedIds: [], queue: queue.filter((id) => !queuedIds.includes(id)) })
  },

  removeFromQueue(index) {
    const { queue, queueIndex, queuedIds } = get()
    if (index < 0 || index >= queue.length) return
    const newQueue = queue.filter((_, i) => i !== index)
    const removedId = queue[index]
    const nextQueuedIds = queuedIds.filter((id) => id !== removedId)
    if (newQueue.length === 0) {
      set({ queue: [], queuedIds: nextQueuedIds, queueIndex: -1 })
      get().stop()
      return
    }
    if (index < queueIndex) {
      set({ queue: newQueue, queuedIds: nextQueuedIds, queueIndex: queueIndex - 1 })
      return
    }
    if (index === queueIndex) {
      const nextIdx = Math.min(queueIndex, newQueue.length - 1)
      set({ queue: newQueue, queuedIds: nextQueuedIds, queueIndex: nextIdx })
      void get().playTrack(newQueue[nextIdx])
      return
    }
    set({ queue: newQueue, queuedIds: nextQueuedIds })
  },

  clearQueue() {
    set({ queue: [], queuedIds: [], queueIndex: -1 })
    get().stop()
  },

  setEQGains(gains) {
    set({ eqGains: gains })
    audioEngine.setEQ(gains, get().eqEnabled)
    persistAppData()
  },

  setEqEnabled(v) {
    set({ eqEnabled: v })
    audioEngine.setEQ(get().eqGains, v)
    persistAppData()
  },

  stop() {
    audioEngine.pause()
    set({ currentId: null, isPlaying: false, isLoading: false, currentTime: 0, duration: 0 })
  }
}))

// ---------------------------------------------------------------------------
// Audio element event wiring (registered once).
// ---------------------------------------------------------------------------

audioEngine.on('ended', () => {
  const s = usePlayer.getState()
  if (s.repeat === 'one') {
    audioEngine.seek(0)
    void audioEngine.play()
    return
  }
  s.next(true)
})

audioEngine.on('error', () => {
  const s = usePlayer.getState()
  if (s.currentId) {
    setError('Unable to play this file. It may have been moved or deleted.')
    void s.next(true)
  }
})

audioEngine.on('timeupdate', () => {
  usePlayer.setState({ currentTime: audioEngine.currentTime })
})

audioEngine.on('loadedmetadata', () => {
  usePlayer.setState({ duration: audioEngine.duration })
})

audioEngine.on('play', () => {
  const s = usePlayer.getState()
  if (s.currentId) useUserData.getState().recordPlay(s.currentId)
  usePlayer.setState({ isPlaying: true, isLoading: false })
})

audioEngine.on('pause', () => {
  const s = usePlayer.getState()
  rememberPosition()
  usePlayer.setState({ isPlaying: false })
})

function setError(msg: string): void {
  usePlayer.setState({ error: msg, isPlaying: false, isLoading: false })
}

function rememberPosition(): void {
  const s = usePlayer.getState()
  if (s.currentId) {
    usePlayer.setState({ lastTrackId: s.currentId, lastPosition: audioEngine.currentTime })
    persistAppData()
  }
}

