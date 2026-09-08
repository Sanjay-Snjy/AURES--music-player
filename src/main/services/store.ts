import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { AppData, LibraryData } from '@shared/ipc'
import { defaultAppData } from '@shared/ipc'

/** Tiny JSON persistence layer for the main process. */
class JsonStore<T> {
  private file: string
  private cache: T | null = null

  constructor(name: string) {
    this.file = path.join(app.getPath('userData'), name)
  }

  async load(fallback: T): Promise<T> {
    if (this.cache !== null) return this.cache
    try {
      const raw = await fs.readFile(this.file, 'utf8')
      this.cache = JSON.parse(raw) as T
    } catch {
      this.cache = fallback
    }
    return this.cache
  }

  async save(data: T): Promise<void> {
    this.cache = data
    await fs.mkdir(path.dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data))
    await fs.rename(tmp, this.file)
  }
}

export const libraryStore = new JsonStore<LibraryData>('library.json')
export const appDataStore = new JsonStore<AppData>('app-data.json')

export async function loadLibrary(): Promise<LibraryData> {
  return libraryStore.load({ folders: [], tracks: [] })
}

export async function loadAppData(): Promise<AppData> {
  return appDataStore.load(defaultAppData())
}