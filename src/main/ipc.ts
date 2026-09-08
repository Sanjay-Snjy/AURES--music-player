import { app, dialog, ipcMain, nativeImage, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import type { AppData, ArtworkColors, LaunchResult, LibraryData } from '@shared/ipc'
import { IPC } from '@shared/ipc'
import { appDataStore, libraryStore, loadAppData, loadLibrary } from './services/store'
import { requestCancel, resolveArtworkPath, scanPaths } from './services/scanner'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawn, execSync } from 'node:child_process'
import path from 'node:path'

const APO_NAMES = ['Editor.exe', 'Configurator.exe']
const PEACE_NAMES = ['Peace.exe']

/** Resolve a Windows .lnk shortcut target. Returns the real exe path or null. */
function resolveLnk(target: string): string | null {
  if (!target.toLowerCase().endsWith('.lnk')) return target
  try {
    // Quote the .lnk path so WScript.Shell parses it correctly (handles spaces/special chars).
    // Use PS's single-quote-safe form by replacing any single quotes with double-single-quotes.
    const psSafe = target.replace(/'/g, "''")
    // Use Write-Output to guarantee the resolved path is piped as stdout (not echoed as a command).
    const cmd = `powershell -NoProfile -Command $s=(New-Object -ComObject WScript.Shell).CreateShortcut('${psSafe}').TargetPath; Write-Output $s`
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1024 * 64, shell: 'powershell.exe' })
    const resolved = out.toString().trim()
    console.log('[Peace] resolveLnk target=', target, 'resolved=', resolved)
    return resolved || null
  } catch (err) {
    console.error('[Peace] resolveLnk failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Candidate install directories for Equalizer APO / Peace. */
function apoDirs(): string[] {
  const roots = [
    process.env['PROGRAMFILES'],
    process.env['PROGRAMFILES(X86)'],
    process.env['ProgramW6432'],
    'C:\\EqualizerAPO'
  ].filter((p): p is string => !!p)
  const dirs: string[] = []
  for (const root of roots) {
    dirs.push(path.join(root, 'EqualizerAPO'))
    dirs.push(path.join(root, 'Equalizer APO'))
    dirs.push(path.join(root, 'Peace'))
    // Also pick up any top-level folder whose name mentions "equalizer".
    try {
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory() && /equalizer/i.test(entry.name)) {
          dirs.push(path.join(root, entry.name))
        }
      }
    } catch {
      // root unreadable — skip
    }
  }
  return dirs
}

/** Direct file-system candidates for a given executable name. */
function findApoExeInDirs(names: string[], dirs: string[]): string | null {
  for (const dir of dirs) {
    for (const name of names) {
      const p = path.join(dir, name)
      if (existsSync(p)) return p
    }
  }
  return null
}

/** Direct file-system candidates for a given executable name. */
function findApoExe(names: string[]): string | null {
  return findApoExeInDirs(names, apoDirs())
}

/** Resolve the real executable backing a potential shortcut file. */
function resolveExecutable(target: string): string | null {
  return resolveLnk(target)
}

/** Candidate shortcut files (e.g. Start Menu) that may point at Peace. */
function peaceShortcutPaths(): string[] {
  const parts = ['C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Peace']
  const sdp = process.env['PROGRAMDATA']
  if (sdp) {
    try {
      const entries = readdirSync(sdp, { withFileTypes: true })
      for (const e of entries) {
        if (!e.isDirectory()) continue
        if (/peace/i.test(e.name)) {
          parts.push(path.join(sdp, e.name))
        }
      }
    } catch {
      /* unreadable — skip */
    }
  }
  return parts
}

function launchApoTool(exe: string): LaunchResult {
  try {
    // Editor.exe / Peace.exe are Qt apps: they resolve their platform plugin
    // relative to their own directory, so launch with cwd set to the install
    // folder (and hint QT_QPA_PLATFORM_PLUGIN_PATH) — otherwise Qt fails with
    // "no Qt platform plugin could be initialized".
    const dir = path.dirname(exe)
    const child = spawn(
      exe,
      [],
      {
        cwd: dir,
        env: {
          ...process.env,
          QT_QPA_PLATFORM_PLUGIN_PATH: path.join(dir, 'platforms')
        },
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    )
    child.unref()
    return { ok: true, path: exe }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function openEqualizerApo(): LaunchResult {
  const exe = findApoExe(APO_NAMES)
  if (!exe) {
    return {
      ok: false,
      error: 'Equalizer APO was not found. Install it from equalizerapo.com and try again.'
    }
  }
  return launchApoTool(exe)
}

function openPeaceEqualizer(): LaunchResult {
  // 1. Direct executable (e.g. C:\Program Files\...\Peace\Peace.exe)
  const exe = findApoExe(PEACE_NAMES)
  if (exe) return launchApoTool(exe)

  // 2. Start Menu shortcut (.lnk) → resolve to real target.
  for (const lnkRoot of peaceShortcutPaths()) {
    const name = 'Peace.lnk'
    const lnk = path.join(lnkRoot, name)
    if (!existsSync(lnk)) continue
    const target = resolveExecutable(lnk)
    if (!target || !existsSync(target)) continue
    return launchApoTool(target)
  }

  return {
    ok: false,
    error: 'Peace Equalizer was not found. Install it (the GUI for Equalizer APO) and try again.'
  }
}

function artworkColors(trackId: string): ArtworkColors | null {
  const file = resolveArtworkPath(trackId)
  if (!file) return null
  try {
    const img = nativeImage.createFromPath(file)
    if (img.isEmpty()) return null
    const small = img.resize({ width: 48, height: 48, quality: 'best' })
    const buf = small.toBitmap() // BGRA on Windows
    if (buf.length < 4) return null

    interface Bucket {
      r: number
      g: number
      b: number
      n: number
    }
    const buckets = new Map<number, Bucket>()
    const total = Math.floor(buf.length / 4)
    for (let i = 0; i < total; i++) {
      const o = i * 4
      const b = buf[o]
      const g = buf[o + 1]
      const r = buf[o + 2]
      const a = buf[o + 3]
      if (a < 128) continue
      // 4x4x4 quantized buckets, skip near-black / near-white
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (lum < 24 || lum > 235) continue
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const bk = buckets.get(key)
      if (bk) {
        bk.r += r
        bk.g += g
        bk.b += b
        bk.n++
      } else {
        buckets.set(key, { r, g, b, n: 1 })
      }
    }
    if (buckets.size === 0) return null
    const sorted = [...buckets.values()].sort((a, z) => z.n - a.n)
    const pick = (bk: Bucket): string => {
      const r = Math.round(bk.r / bk.n)
      const g = Math.round(bk.g / bk.n)
      const b = Math.round(bk.b / bk.n)
      return `rgb(${r},${g},${b})`
    }
    const primary = pick(sorted[0])
    // secondary: most distinct from primary
    let secondary = primary
    let bestDist = -1
    const top = sorted[0]
    for (let i = 1; i < Math.min(sorted.length, 6); i++) {
      const bk = sorted[i]
      const r = bk.r / bk.n
      const g = bk.g / bk.n
      const b = bk.b / bk.n
      const d =
        Math.abs(r - top.r / top.n) +
        Math.abs(g - top.g / top.n) +
        Math.abs(b - top.b / top.n)
      if (d > bestDist) {
        bestDist = d
        secondary = pick(bk)
      }
    }
    return { primary, secondary }
  } catch {
    return null
  }
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.getInitialState, async () => {
    const library = await loadLibrary()
    const appData = await loadAppData()
    return { library, appData }
  })

  ipcMain.handle(IPC.pickFolders, async () => {
    const win = getWindow()
    if (!win) return []
    const res = await dialog.showOpenDialog(win, {
      title: 'Add music folder',
      buttonLabel: 'Add folder',
      properties: ['openDirectory', 'multiSelections']
    })
    return res.canceled ? [] : res.filePaths
  })

  const runScan = async (paths: string[]): Promise<ReturnType<typeof scanPaths>> => {
    const win = getWindow()
    return scanPaths({
      paths,
      onProgress: (p) => {
        if (win && !win.isDestroyed()) win.webContents.send(IPC.scanProgress, p)
      }
    })
  }

  ipcMain.handle(IPC.scan, (_e, paths: string[]) => runScan(paths))
  ipcMain.handle(IPC.rescan, async () => {
    const lib = await loadLibrary()
    return runScan(lib.folders.map((f) => f.path))
  })
  ipcMain.handle(IPC.importPaths, (_e, paths: string[]) => runScan(paths))
  ipcMain.handle(IPC.cancelScan, () => {
    requestCancel()
  })

  ipcMain.handle(IPC.saveLibrary, (_e, data: LibraryData) => libraryStore.save(data))
  ipcMain.handle(IPC.saveAppData, (_e, data: AppData) => appDataStore.save(data))

  ipcMain.handle(IPC.fileExists, async (_e, p: string) => {
    try {
      await import('node:fs/promises').then((fs) => fs.access(p))
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.showInFolder, (_e, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle(IPC.appVersion, () => app.getVersion())

  ipcMain.handle(IPC.artworkColors, (_e, trackId: string) => artworkColors(trackId))

  ipcMain.handle(IPC.isEqualizerApoInstalled, () => !!findApoExe(APO_NAMES))
  ipcMain.handle(IPC.openEqualizerApo, () => openEqualizerApo())
  ipcMain.handle(IPC.openPeaceEqualizer, () => openPeaceEqualizer())
}