import { create } from 'zustand'
import type { AppData, HistoryEntry, Playlist, Settings } from '@shared/ipc'
import { DEFAULT_SETTINGS } from '@shared/ipc'
import { persistAppData } from './persist'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export interface UserDataState {
  favorites: string[]
  playlists: Playlist[]
  recentlyPlayed: HistoryEntry[]
  playCounts: Record<string, number>
  history: HistoryEntry[]
  settings: Settings
  hydrated: boolean

  hydrate(data: AppData): void
  toggleFavorite(trackId: string): boolean
  createPlaylist(name: string): Playlist | null
  renamePlaylist(id: string, name: string): void
  deletePlaylist(id: string): void
  addToPlaylist(playlistId: string, trackIds: string[]): void
  removeFromPlaylist(playlistId: string, trackId: string): void
  setPlaylistTracks(playlistId: string, trackIds: string[]): void
  recordPlay(trackId: string): void
  clearHistory(): void
  setSettings(patch: Partial<Settings>): void
}

export const useUserData = create<UserDataState>((set, get) => ({
  favorites: [],
  playlists: [],
  recentlyPlayed: [],
  playCounts: {},
  history: [],
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,

  hydrate(data) {
    set({
      favorites: data.favorites ?? [],
      playlists: data.playlists ?? [],
      recentlyPlayed: data.recentlyPlayed ?? [],
      playCounts: data.playCounts ?? {},
      history: data.history ?? [],
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      hydrated: true
    })
  },

  toggleFavorite(trackId) {
    const cur = get().favorites
    const has = cur.includes(trackId)
    const next = has ? cur.filter((id) => id !== trackId) : [...cur, trackId]
    set({ favorites: next })
    persistAppData()
    return !has
  },

  createPlaylist(name) {
    const trimmed = name.trim()
    if (!trimmed) return null
    const pl: Playlist = {
      id: uid(),
      name: trimmed,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set({ playlists: [...get().playlists, pl] })
    persistAppData()
    return pl
  },

  renamePlaylist(id, name) {
    set({
      playlists: get().playlists.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p
      )
    })
    persistAppData()
  },

  deletePlaylist(id) {
    set({ playlists: get().playlists.filter((p) => p.id !== id) })
    persistAppData()
  },

  addToPlaylist(playlistId, trackIds) {
    set({
      playlists: get().playlists.map((p) => {
        if (p.id !== playlistId) return p
        const existing = new Set(p.trackIds)
        const add = trackIds.filter((t) => !existing.has(t))
        return { ...p, trackIds: [...p.trackIds, ...add], updatedAt: Date.now() }
      })
    })
    persistAppData()
  },

  removeFromPlaylist(playlistId, trackId) {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId), updatedAt: Date.now() }
          : p
      )
    })
    persistAppData()
  },

  setPlaylistTracks(playlistId, trackIds) {
    set({
      playlists: get().playlists.map((p) =>
        p.id === playlistId ? { ...p, trackIds, updatedAt: Date.now() } : p
      )
    })
    persistAppData()
  },

  recordPlay(trackId) {
    const now = Date.now()
    const history = [{ trackId, playedAt: now }, ...get().history].slice(0, 3000)
    const recentlyPlayed = [
      { trackId, playedAt: now },
      ...get().recentlyPlayed.filter((r) => r.trackId !== trackId)
    ].slice(0, 200)
    const playCounts = { ...get().playCounts, [trackId]: (get().playCounts[trackId] ?? 0) + 1 }
    set({ history, recentlyPlayed, playCounts })
    persistAppData()
  },

  clearHistory() {
    set({ history: [] })
    persistAppData()
  },

  setSettings(patch) {
    set({ settings: { ...get().settings, ...patch } })
    persistAppData()
  }
}))