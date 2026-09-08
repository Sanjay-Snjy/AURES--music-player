import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppData,
  LibraryData,
  MediaKey,
  ScanProgress,
  ScanResult,
  SnjyApi
} from '@shared/ipc'
import { IPC } from '@shared/ipc'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: SnjyApi = {
  getInitialState: () => ipcRenderer.invoke(IPC.getInitialState),
  pickFolders: () => ipcRenderer.invoke(IPC.pickFolders),
  scanPaths: (paths: string[]) => ipcRenderer.invoke(IPC.scan, paths),
  rescanLibrary: () => ipcRenderer.invoke(IPC.rescan),
  importPaths: (paths: string[]) => ipcRenderer.invoke(IPC.importPaths, paths),
  cancelScan: () => ipcRenderer.invoke(IPC.cancelScan),
  saveLibrary: (data: LibraryData) => ipcRenderer.invoke(IPC.saveLibrary, data),
  saveAppData: (data: AppData) => ipcRenderer.invoke(IPC.saveAppData, data),
  fileExists: (p: string) => ipcRenderer.invoke(IPC.fileExists, p),
  showInFolder: (p: string) => ipcRenderer.invoke(IPC.showInFolder, p),
  appVersion: () => ipcRenderer.invoke(IPC.appVersion),
  artworkColors: (trackId: string) => ipcRenderer.invoke(IPC.artworkColors, trackId),
  isEqualizerApoInstalled: () => ipcRenderer.invoke(IPC.isEqualizerApoInstalled),
  openEqualizerApo: () => ipcRenderer.invoke(IPC.openEqualizerApo),
  openPeaceEqualizer: () => ipcRenderer.invoke(IPC.openPeaceEqualizer),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  onScanProgress: (cb: (p: ScanProgress) => void) => subscribe(IPC.scanProgress, cb),
  onMediaKey: (cb: (key: MediaKey) => void) => subscribe(IPC.mediaKey, cb)
}

contextBridge.exposeInMainWorld('snjy', api)