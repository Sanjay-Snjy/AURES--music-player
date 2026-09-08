import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import path from 'node:path'
import type { MediaKey } from '@shared/ipc'
import { registerMediaKeyHandlers, unregisterMediaKeyHandlers } from './services/media-keys'
import { registerMediaProtocol, registerMediaScheme } from './services/protocol'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

registerMediaScheme()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.snjy.musicplayer')
    Menu.setApplicationMenu(null)
    registerMediaProtocol()
    createWindow()
    registerIpc(() => mainWindow)
    registerMediaKeyHandlers(mainWindow!)
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
  unregisterMediaKeyHandlers()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  unregisterMediaKeyHandlers()
})

function resourcePath(name: string): string {
  // Dev: project root /resources. Packaged: extraResources copied to resources dir.
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(app.getAppPath(), 'resources', name)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    backgroundColor: '#07080c',
    title: 'AURES',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0c0e14', symbolColor: '#c9ccd6', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  if (!app.isPackaged) {
    const icon = nativeImage.createFromPath(resourcePath('icon.png'))
    if (!icon.isEmpty()) mainWindow.setIcon(icon)
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  // Minimize to tray instead of quitting (tray "Quit" exits for real).
  mainWindow.on('close', (e) => {
    if (!isQuitting && tray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Renderer process gone:', details.reason, details.exitCode)
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(resourcePath('tray.png'))
  if (icon.isEmpty()) return
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('AURES — Offline Music Player')

  const send = (key: MediaKey) => (): void => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('media:key', key)
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Play / Pause', click: send('playpause') },
      { label: 'Next', click: send('next') },
      { label: 'Previous', click: send('prev') },
      { type: 'separator' },
      {
        label: 'Show AURES',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
}