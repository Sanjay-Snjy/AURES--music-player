import { create } from 'zustand'
import type { LibraryData, LibraryFolder, ScanProgress, ScanResult, Track } from '@shared/ipc'
import { queueLibrarySave } from './persist'

export interface LibraryState extends LibraryData {
  hydrated: boolean
  tracksById: Record<string, Track>
  scanning: boolean
  scanProgress: ScanProgress | null
  lastScanAt: number | null

  hydrate(data: LibraryData): void
  addFolders(): Promise<void>
  scan(paths: string[]): Promise<void>
  rescanAll(): Promise<void>
  importPaths(paths: string[]): Promise<void>
  removeFolder(folderPath: string): void
  removeTracks(ids: string[]): void
  cancelScan(): void
}

function underPath(filePath: string, folderPath: string): boolean {
  const f = filePath.toLowerCase()
  const p = folderPath.toLowerCase()
  return f === p || f.startsWith(p + '\\') || f.startsWith(p + '/')
}

function indexById(tracks: Track[]): Record<string, Track> {
  const map: Record<string, Track> = {}
  for (const t of tracks) map[t.id] = t
  return map
}

function mergeResult(state: LibraryState, result: ScanResult): Partial<LibraryState> {
  const incoming = new Map(result.tracks.map((t) => [t.id, t]))
  const scannedFolders = new Set(result.folders.map((f) => f.path.toLowerCase()))

  const keep = state.tracks.filter((t) => {
    if (incoming.has(t.id)) return false
    if (t.folder && scannedFolders.has(t.folder.toLowerCase())) return false
    for (const f of result.folders) {
      if (underPath(t.path, f.path)) return false
    }
    return true
  })

  const byId = new Map(keep.map((t) => [t.id, t]))
  for (const t of result.tracks) {
    const existing = byId.get(t.id)
    if (existing) {
      byId.set(t.id, { ...t, dateAdded: existing.dateAdded })
    } else {
      byId.set(t.id, t)
    }
  }

  const folderMap = new Map(state.folders.map((f) => [f.path.toLowerCase(), f]))
  for (const f of result.folders) {
    if (!folderMap.has(f.path.toLowerCase())) folderMap.set(f.path.toLowerCase(), f)
  }

  const tracks = [...byId.values()]
  const folders: LibraryFolder[] = [...folderMap.values()]
  return { tracks, folders, tracksById: indexById(tracks) }
}

export const useLibrary = create<LibraryState>((set, get) => ({
  folders: [],
  tracks: [],
  tracksById: {},
  hydrated: false,
  scanning: false,
  scanProgress: null,
  lastScanAt: null,

  hydrate(data) {
    set({
      folders: data.folders,
      tracks: data.tracks,
      tracksById: indexById(data.tracks),
      hydrated: true,
      lastScanAt: data.tracks.length
        ? Math.max(...data.tracks.map((t) => t.dateAdded))
        : null
    })
  },

  async addFolders() {
    const paths = await window.snjy.pickFolders()
    if (paths.length === 0) return
    await get().scan(paths)
  },

  async scan(paths) {
    if (paths.length === 0 || get().scanning) return
    set({ scanning: true, scanProgress: { processed: 0, total: 0, current: '' } })
    const unsub = window.snjy.onScanProgress((p) => set({ scanProgress: p }))
    try {
      const result = await window.snjy.scanPaths(paths)
      const patch = mergeResult(get(), result)
      set(patch)
      queueLibrarySave({ folders: get().folders, tracks: get().tracks })
    } finally {
      unsub()
      set({ scanning: false, scanProgress: null, lastScanAt: Date.now() })
    }
  },

  async rescanAll() {
    const folders = get().folders.map((f) => f.path)
    if (folders.length === 0 || get().scanning) return
    set({ scanning: true, scanProgress: { processed: 0, total: 0, current: '' } })
    const unsub = window.snjy.onScanProgress((p) => set({ scanProgress: p }))
    try {
      const result = await window.snjy.rescanLibrary()
      const patch = mergeResult(get(), result)
      set(patch)
      queueLibrarySave({ folders: get().folders, tracks: get().tracks })
    } finally {
      unsub()
      set({ scanning: false, scanProgress: null, lastScanAt: Date.now() })
    }
  },

  async importPaths(paths) {
    const valid = paths.filter(Boolean)
    if (valid.length === 0 || get().scanning) return
    set({ scanning: true, scanProgress: { processed: 0, total: 0, current: '' } })
    const unsub = window.snjy.onScanProgress((p) => set({ scanProgress: p }))
    try {
      const result = await window.snjy.importPaths(valid)
      const patch = mergeResult(get(), result)
      set(patch)
      queueLibrarySave({ folders: get().folders, tracks: get().tracks })
    } finally {
      unsub()
      set({ scanning: false, scanProgress: null, lastScanAt: Date.now() })
    }
  },

  cancelScan() {
    void window.snjy.cancelScan()
    set({ scanning: false, scanProgress: null })
  },

  removeFolder(folderPath) {
    set({
      folders: get().folders.filter((f) => f.path !== folderPath),
      tracks: get().tracks.filter((t) => !underPath(t.path, folderPath))
    })
    queueLibrarySave({ folders: get().folders, tracks: get().tracks })
  },

  removeTracks(ids) {
    const del = new Set(ids)
    set({ tracks: get().tracks.filter((t) => !del.has(t.id)) })
    queueLibrarySave({ folders: get().folders, tracks: get().tracks })
  }
}))