import type { AppData, LibraryData, PlayerPrefs, Settings } from '@shared/ipc'
import { DEFAULT_PLAYER_PREFS, DEFAULT_SETTINGS } from '@shared/ipc'

export type UserDataSlice = Omit<AppData, 'player'>

let playerSlice: () => PlayerPrefs = () => ({
  ...DEFAULT_PLAYER_PREFS,
  eqGains: [...DEFAULT_PLAYER_PREFS.eqGains]
})
let userSlice: () => UserDataSlice = () => ({
  favorites: [],
  playlists: [],
  recentlyPlayed: [],
  playCounts: {},
  history: [],
  settings: { ...DEFAULT_SETTINGS } as Settings
})

/** Called once at bootstrap with getters for the live player + user-data stores. */
export function registerPersistedSlices(
  player: () => PlayerPrefs,
  user: () => UserDataSlice
): void {
  playerSlice = player
  userSlice = user
}

export function buildAppData(): AppData {
  return { ...userSlice(), player: playerSlice() }
}

let appDataTimer: ReturnType<typeof setTimeout> | null = null
let libraryTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced save of the full AppData object. */
export function persistAppData(): void {
  if (appDataTimer) clearTimeout(appDataTimer)
  appDataTimer = setTimeout(() => {
    appDataTimer = null
    void window.snjy.saveAppData(buildAppData())
  }, 500)
}

/** Library store calls this with its own data to avoid importing it here. */
export function queueLibrarySave(data: LibraryData): void {
  if (libraryTimer) clearTimeout(libraryTimer)
  libraryTimer = setTimeout(() => {
    libraryTimer = null
    void window.snjy.saveLibrary(data)
  }, 500)
}

/** Flush pending saves immediately (beforeunload / hide). */
export function flushPersistence(): void {
  if (appDataTimer) {
    clearTimeout(appDataTimer)
    appDataTimer = null
    void window.snjy.saveAppData(buildAppData())
  }
  if (libraryTimer) {
    clearTimeout(libraryTimer)
    libraryTimer = null
  }
}