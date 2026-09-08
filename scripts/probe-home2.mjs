import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9338

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
    expression: `(async () => {
      for (let i = 0; i < 40; i++) {
        if (document.querySelector('.home-dash')) break
        await new Promise((r) => setTimeout(r, 500))
      }
      const q = (s) => document.querySelector(s)
      const h = (el) => Math.round(el.getBoundingClientRect().height)
      const main = q('.home-col-main')
      const side = q('.home-side')
      const player = q('.home-player-card')
      const recentSec = q('.home-recent-sec')
      const recent = q('.home-recent-grid')
      const detail = q('.home-detail-card')
      const folder = q('.home-folder-card')
      const eq = q('.home-eq-card')
      const eqBtns = Array.from(document.querySelectorAll('.home-eq-btn')).map((b) => b.textContent?.trim())
      const colCounts = {
        main: main ? main.children.length : -1,
        side: side ? side.children.length : -1
      }
      return JSON.stringify({
        colCounts,
        playerH: player ? h(player) : -1,
        recentItems: recent ? recent.children.length : -1,
        recentRows: recent ? Math.round(recent.children.length / 3) : -1,
        hasRecentlyBelowPlayer: !!(main && player && recentSec && player.compareDocumentPosition(recentSec) & 4),
        detailH: detail ? h(detail) : -1,
        folderH: folder ? h(folder) : -1,
        eq: eq ? h(eq) : -1,
        eqBtns,
        eqBelowFolder: !!(eq && folder && folder.compareDocumentPosition(eq) & 4),
        eqInsideSide: !!(side && eq && side.contains(eq)),
        duplicatedRecently: document.querySelectorAll('.home-recent-sec').length
      })
    })()`,
    awaitPromise: true,
    returnByValue: true
  })
  console.log('RESULT:', r.result?.result?.value ?? JSON.stringify(r).slice(0, 600))
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