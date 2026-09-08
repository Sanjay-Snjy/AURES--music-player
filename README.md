# AURES — Offline Music Player

A premium, futuristic, **fully offline** desktop music player for Windows. It plays your
local music collection at native quality, reads real metadata and embedded artwork, and
drives eight real-time audio visualizers from the actual playing audio.

No accounts. No cloud. No tracking. Your files are never copied or uploaded — AURES only
indexes them.

## Features

- **Local library** — add multiple folders, recursive scanning, rescan/refresh, drag-and-drop
  files or folders from Explorer. Supports MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, WMA.
- **Real metadata** — title, artist, album, album artist, genre, year, track/disc number,
  duration, bitrate, sample rate, bit depth, channels, codec, container, file size and
  embedded album artwork, extracted with `music-metadata`. Lossless files are labelled
  `LOSSLESS` / `HI-RES LOSSLESS` (never fake data).
- **Library UI** — Songs (virtualized, sortable, searchable table), Albums, Artists, Genres,
  Folders, Favorites, Recently Played, History (grouped by day), Playlists (create, rename,
  delete, reorder, add/remove songs).
- **Full player** — play/pause, previous/next, seek ±5s, clickable/draggable seekbar, volume,
  mute, playback speed, shuffle, repeat off/all/one, persistent queue with drag-to-reorder,
  save queue as playlist, Windows media keys, tray controls.
- **Audio engine** — one persistent `AudioContext`, one media element, a secure
  `media://` streaming protocol (with HTTP Range support) so files play in their native
  format at full quality. Optional 10-band EQ (Web Audio `BiquadFilterNode`) with presets,
  bypassable.
- **8 visualizers** — Spectrum (glow, symmetry option), Aurora, Cosmic, Orbit, Waveform
  (horizontal/mirrored/circular), Fluid, Particle Field, Minimal — plus AUTO mode that
  switches based on song energy with smooth crossfades. 60 FPS via `requestAnimationFrame`
  + typed arrays, low-performance mode in Settings, paused when not visible.
- **Now Playing** — large artwork, ambient background glow driven by colors extracted from
  the album artwork (toggle in Settings), full transport.
- **Home dashboard** — greeting, continue listening, recently played, recently added,
  favorites, albums, most played; beautiful empty state with "Add Music Folder".
- **Search** — global `Ctrl+K` overlay across songs, albums, artists and genres; local and fast.
- **Persistence** — folders, tracks, favorites, playlists, history, play counts, volume, EQ,
  visualizer and theme settings are stored as JSON in the app's userData directory.
- **Security** — `contextIsolation: true`, `nodeIntegration: false`, sandboxed preload bridge;
  the renderer never touches Node/fs directly. Only whitelisted IPC + the `media://` protocol.

## Development

```bash
npm install          # install dependencies
npm run dev          # launch the app with hot reload (electron-vite)
npm run typecheck    # tsc --noEmit
npm test             # unit tests (vitest)
npm run build        # typecheck + production bundle (out/)
npm run dist         # typecheck + bundle + Windows NSIS installer (release/)
npm run make:icon    # regenerate resources/icon.png, resources/tray.png, build/icon.png
```

The installer is written to `release/AURES-Setup-<version>.exe`.

> Note: if `npm install` skips the Electron binary download (some npm versions block
> postinstall scripts), run `node node_modules/electron/install.js` once.

## Architecture

```
src/
  main/          Electron main process
    index.ts       window, tray, single-instance, media keys
    ipc.ts         whitelisted IPC handlers (folders, scan, save, artwork colors…)
    services/
      scanner.ts   recursive scan + music-metadata extraction + artwork cache
      protocol.ts  media:// scheme (Range-aware streaming, CORS-enabled)
      store.ts     JSON persistence (library.json, app-data.json)
  preload/
    index.ts       contextBridge → window.snjy (only the minimal API)
  renderer/      React app
    pages/         Home, Songs, Albums, Artists, Genres, Folders, Favorites,
                   Recently Played, History, Playlists, Now Playing, Settings
    components/    PlayerBar, TrackTable (virtualized), QueueDrawer, SearchOverlay,
                   TrackInfoModal, EQPanel, ContextMenu, MiniPlayer …
    store/         zustand stores (library, userData, player) + AudioEngine
    visualizers/   VisualizationEngine + 8 modes
    hooks/         shortcuts, media keys, artwork colors
    styles/        design system (base / ui / pages)
  shared/        IPC contract + types shared across processes
```

## Notes

- Files play in their native format — FLAC is never re-encoded to MP3 and quality is never
  downsampled.
- The library is stored in `%APPDATA%/snjy/` (library.json, app-data.json, cached artwork).
- Scanning is asynchronous and cancellable; corrupted files are skipped gracefully.