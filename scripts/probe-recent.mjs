import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9335

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
      const grid = document.querySelector('.home-recent-grid')
      const btn = document.querySelector('.home-eqapo-btn')
      if (!grid || !btn) return JSON.stringify({ error: 'missing', grid: !!grid, btn: !!btn })
      const g = grid.getBoundingClientRect()
      const b = btn.getBoundingClientRect()
      const items = grid.children.length
      // Count distinct left offsets of grid children -> number of columns
      const lefts = new Set(Array.from(grid.children).map((c) => Math.round(c.getBoundingClientRect().left)))
      return JSON.stringify({
        gridW: Math.round(g.width),
        btnX: Math.round(b.left),
        btnY: Math.round(b.top),
        gridRight: Math.round(g.right),
        items,
        columns: lefts.size
      })
    })()`,
    returnByValue: true
  })
  console.log('RESULT:', r.result?.result?.value ?? JSON.stringify(r).slice(0, 400))
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