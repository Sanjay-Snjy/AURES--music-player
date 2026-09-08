import { globalShortcut } from 'electron'
import type { BrowserWindow } from 'electron'
import type { MediaKey } from '@shared/ipc'

export function registerMediaKeyHandlers(win: BrowserWindow): void {
  const send = (key: MediaKey) => (): void => {
    if (!win.isDestroyed()) win.webContents.send('media:key', key)
  }
  const binds: Array<[string, MediaKey]> = [
    ['MediaPlayPause', 'playpause'],
    ['MediaNextTrack', 'next'],
    ['MediaPreviousTrack', 'prev'],
    ['MediaStop', 'stop']
  ]
  for (const [accelerator, key] of binds) {
    try {
      globalShortcut.register(accelerator, send(key))
    } catch {
      // Registration can fail when another app owns the key; ignore.
    }
  }
}

export function unregisterMediaKeyHandlers(): void {
  globalShortcut.unregisterAll()
}