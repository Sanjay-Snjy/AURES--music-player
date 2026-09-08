// Launches SNJY with a CDP port, calls window.snjy.openEqualizerApo() via
// the real preload bridge and prints the result.
import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9333
const started = Date.now()

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('bad json: ' + data.slice(0, 200)))
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
  throw new Error('no CDP target after 60s')
}

const child = spawn(
  'npx.cmd',
  ['electron', '.', `--remote-debugging-port=${PORT}`],
  { stdio: 'ignore', shell: true }
)

let ws
try {
  const page = await waitForTarget()
  const wsUrl = page.webSocketDebuggerUrl
  ws = new WebSocket(wsUrl)
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
    expression: `(async () => { const r = await window.snjy.openEqualizerApo(); return JSON.stringify(r) })()`,
    awaitPromise: true,
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
  console.log('elapsed', Math.round((Date.now() - started) / 1000), 's')
  process.exit(0)
}