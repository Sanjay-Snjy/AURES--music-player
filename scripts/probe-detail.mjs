import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9336

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('bad json'))
        }
      })
    })
    req.on('error', reject)
  })
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await getJson('/json')
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('no CDP target')
}

const child = spawn('npx.cmd', ['electron', '.', `--remote-debugging-port=${PORT}`], {
  stdio: 'ignore',
  shell: true
})

let ws
try {
  const page = await waitForTarget()
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  const call = (id, method, params) =>
    new Promise((res) => {
      const onMsg = (ev) => {
        const m = JSON.parse(ev.data)
        if (m.id === id) {
          ws.removeEventListener('message', onMsg)
          res(m)
        }
      }
      ws.addEventListener('message', onMsg)
      ws.send(JSON.stringify({ id, method, params }))
    })
  await call(1, 'Runtime.enable', {})
  const r = await call(2, 'Runtime.evaluate', {
    expression: `(() => {
      const wait = async () => {
        // allow library hydration
        for (let i = 0; i < 40; i++) {
          if (document.querySelector('.home-folder-card')) break
          await new Promise((r) => setTimeout(r, 500))
        }
        const detail = document.querySelector('.home-detail-card')
        const folder = document.querySelector('.home-folder-card')
        const player = document.querySelector('.home-player-card')
        if (!detail || !folder || !player) {
          return JSON.stringify({ error: 'missing', detail: !!detail, folder: !!folder, player: !!player })
        }
        const d = detail.getBoundingClientRect()
        const f = folder.getBoundingClientRect()
        const p = player.getBoundingClientRect()
        const stats = detail.querySelectorAll('.hd-stat').length
        const caption = detail.querySelector('.home-detail-caption')?.textContent?.trim()
        const empty = detail.querySelector('.home-detail-empty')
        return JSON.stringify({
          caption,
          stats,
          detailAboveFolder: Math.round(d.bottom) <= Math.round(f.top),
          sameColumn: Math.abs(d.left - f.left) < 4,
          playerLeftOfDetail: p.right <= d.left + 4,
          detailH: Math.round(d.height),
          emptyState: !!empty,
          emptyText: empty?.textContent?.trim() ?? null,
          folderTracks: folder.querySelectorAll('.home-folder-row').length
        })
      }
      return wait()
    })()`,
    awaitPromise: true,
    returnByValue: true
  })
  console.log('RESULT:', r.result?.result?.value ?? JSON.stringify(r).slice(0, 500))
} finally {
  try {
    ws?.close()
  } catch {
    /* noop */
  }
  child.kill()
  spawn('taskkill', ['//F', '//IM', 'electron.exe'], { stdio: 'ignore' })
  process.exit(0)
}