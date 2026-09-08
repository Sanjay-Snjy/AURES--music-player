// ---------------------------------------------------------------------------
// Shared types + IPC contract between the Electron main process, the preload
// bridge and the renderer. Nothing in here touches Node or DOM APIs.
// ---------------------------------------------------------------------------

export interface Track {
  id: string
  path: string
  /** Managed library folder this track belongs to (null for loose imports). */
  folder: string | null
  title: string
  artist: string
  album: string
  albumArtist: string
  genres: string[]
  year: number | null
  trackNo: number | null
  discNo: number | null
  /** seconds */
  duration: number | null
  /** kbps, lossy formats */
  bitrate: number | null
  /** Hz */
  sampleRate: number | null
  bitDepth: number | null
  channels: number | null
  codec: string | null
  container: string | null
  lossless: boolean
  /** bytes */
  fileSize: number
  /** '.mp3' */
  extension: string
  dateAdded: number
  /** media://art/... url or null */
  artworkUrl: string | null
}

export interface LibraryFolder {
  path: string
  addedAt: number
  trackCount?: number
}

export interface LibraryData {
  folders: LibraryFolder[]
  tracks: Track[]
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

export interface HistoryEntry {
  trackId: string
  playedAt: number
}

export interface Settings {
  scanOnLaunch: boolean
  dynamicArtworkColors: boolean
  visualizerMode: string
  visualizerAuto: boolean
  lowPerformanceMode: boolean
  spectrumSymmetry: boolean
  waveformStyle: 'horizontal' | 'mirror' | 'circular'
}

export const DEFAULT_SETTINGS: Settings = {
  scanOnLaunch: false,
  dynamicArtworkColors: true,
  visualizerMode: 'spectrum',
  visualizerAuto: false,
  lowPerformanceMode: false,
  spectrumSymmetry: false,
  waveformStyle: 'mirror'
}

export interface PlayerPrefs {
  volume: number
  muted: boolean
  playbackRate: number
  shuffle: boolean
  repeat: 'off' | 'all' | 'one'
  eqEnabled: boolean
  eqGains: number[]
  lastTrackId: string | null
  lastPosition: number
}

export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
  volume: 0.8,
  muted: false,
  playbackRate: 1,
  shuffle: false,
  repeat: 'off',
  eqEnabled: false,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lastTrackId: null,
  lastPosition: 0
}

export interface AppData {
  favorites: string[]
  playlists: Playlist[]
  recentlyPlayed: HistoryEntry[]
  playCounts: Record<string, number>
  history: HistoryEntry[]
  settings: Settings
  player: PlayerPrefs
}

export function defaultAppData(): AppData {
  return {
    favorites: [],
    playlists: [],
    recentlyPlayed: [],
    playCounts: {},
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    player: { ...DEFAULT_PLAYER_PREFS, eqGains: [...DEFAULT_PLAYER_PREFS.eqGains] }
  }
}

export interface ScanProgress {
  processed: number
  total: number
  current: string
  done?: boolean
}

export interface ScanResult {
  tracks: Track[]
  folders: LibraryFolder[]
  stats: { scanned: number; added: number; errors: number }
}

export interface InitialState {
  library: LibraryData
  appData: AppData
}

export interface ArtworkColors {
  primary: string
  secondary: string
}

export const IPC = {
  getInitialState: 'app:get-initial-state',
  pickFolders: 'library:pick-folders',
  scan: 'library:scan',
  rescan: 'library:rescan',
  importPaths: 'library:import-paths',
  cancelScan: 'library:cancel',
  saveLibrary: 'library:save',
  saveAppData: 'app-data:save',
  fileExists: 'fs:exists',
  showInFolder: 'shell:show-in-folder',
  appVersion: 'app:version',
  artworkColors: 'artwork:colors',
  isEqualizerApoInstalled: 'shell:is-equalizer-apo-installed',
  openEqualizerApo: 'shell:open-equalizer-apo',
  openPeaceEqualizer: 'shell:open-peace-equalizer',
  scanProgress: 'library:progress',
  mediaKey: 'media:key'
} as const

export type MediaKey = 'playpause' | 'next' | 'prev' | 'stop'

// ---------------------------------------------------------------------------
// The API surface exposed on window.snjy by the preload bridge.
// ---------------------------------------------------------------------------

export interface SnjyApi {
  getInitialState(): Promise<InitialState>
  pickFolders(): Promise<string[]>
  scanPaths(paths: string[]): Promise<ScanResult>
  rescanLibrary(): Promise<ScanResult>
  importPaths(paths: string[]): Promise<ScanResult>
  cancelScan(): Promise<void>
  saveLibrary(data: LibraryData): Promise<void>
  saveAppData(data: AppData): Promise<void>
  fileExists(p: string): Promise<boolean>
  showInFolder(p: string): void
  appVersion(): Promise<string>
  artworkColors(trackId: string): Promise<ArtworkColors | null>
  isEqualizerApoInstalled(): Promise<boolean>
  openEqualizerApo(): Promise<LaunchResult>
  openPeaceEqualizer(): Promise<LaunchResult>
  getPathForFile(file: File): string
  onScanProgress(cb: (p: ScanProgress) => void): () => void
  onMediaKey(cb: (key: MediaKey) => void): () => void
}

export interface LaunchResult {
  ok: boolean
  path?: string
  error?: string
}