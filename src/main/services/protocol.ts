import { app, protocol } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wma': 'audio/x-ms-wma'
}

const IMG_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

/**
 * Custom `media://` scheme.
 *  - media://stream/<encodeURIComponent(absolute path)>  → local audio file (Range supported)
 *  - media://art/<encodeURIComponent(file name)>         → cached artwork, restricted to artwork dir
 */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export function registerMediaProtocol(): void {
  const artDir = path.join(app.getPath('userData'), 'artwork')

  protocol.handle('media', async (request) => {
    try {
      const url = new URL(request.url)
      const host = url.host // 'stream' | 'art'
      const filePath = decodeURIComponent(url.pathname.slice(1))
      const ext = path.extname(filePath).toLowerCase()

      let targetPath: string
      if (host === 'stream') {
        if (!AUDIO_MIME[ext]) return new Response('Forbidden', { status: 403 })
        targetPath = filePath
      } else if (host === 'art') {
        if (!IMG_MIME[ext]) return new Response('Forbidden', { status: 403 })
        // The URL carries only the cached file name; resolve it inside the
        // artwork directory and never allow anything outside of it.
        const base = path.resolve(artDir)
        targetPath = path.resolve(artDir, path.basename(filePath))
        if (targetPath !== base && !targetPath.startsWith(base + path.sep)) {
          return new Response('Forbidden', { status: 403 })
        }
      } else {
        return new Response('Forbidden', { status: 403 })
      }

      const stat = await fs.promises.stat(targetPath).catch(() => null)
      if (!stat || !stat.isFile()) {
        return new Response('Not Found', { status: 404 })
      }

      const mime = AUDIO_MIME[ext] ?? IMG_MIME[ext] ?? 'application/octet-stream'
      const cors = { 'Access-Control-Allow-Origin': '*' }
      const rangeHeader = request.headers.get('Range')

      if (rangeHeader) {
        const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0
          const end = m[2] ? parseInt(m[2], 10) : stat.size - 1
          if (start >= stat.size) {
            return new Response(null, {
              status: 416,
              headers: { ...cors, 'Content-Range': `bytes */${stat.size}` }
            })
          }
          const body = Readable.toWeb(
            fs.createReadStream(targetPath, { start, end })
          ) as ReadableStream
          return new Response(body, {
            status: 206,
            headers: {
              ...cors,
              'Content-Type': mime,
              'Content-Length': String(end - start + 1),
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes'
            }
          })
        }
      }

      const body = Readable.toWeb(fs.createReadStream(targetPath)) as ReadableStream
      return new Response(body, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': mime,
          'Content-Length': String(stat.size),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch {
      return new Response('Error', { status: 500 })
    }
  })
}