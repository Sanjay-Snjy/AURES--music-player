import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9366

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
  for (let i = 0; i < 90; i++) {
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
  const pending = {}
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending[m.id]) {
      pending[m.id](m)
      delete pending[m.id]
    }
  })
  const call = (id, method, params) =>
    new Promise((res) => {
      pending[id] = res
      ws.send(JSON.stringify({ id, method, params }))
    })
  await call(1, 'Runtime.enable', {})
  await call(2, 'Runtime.evaluate', {
    expression: `(() => {
      if (!document.querySelector('.home-dash')) location.hash = '#/'
      return 'ok'
    })()`,
    returnByValue: true
  })
  const r = await call(3, 'Runtime.evaluate', {
    expression: `(async () => {
      const btn = Array.from(document.querySelectorAll('.home-eq-btn')).find(
        (b) => /Peace Equalizer/i.test(b.textContent.trim())
      )
      if (!btn) return JSON.stringify({ error: 'peace btn not found' })
      btn.click()
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const el = document.querySelector('.toast-content') || document.querySelector('[class*=\"toast\"]')
        if (el) {
          const text = el.innerText || ''
          if (/peace equalizer launched/i.test(text)) return { ok: true, text }
          if (/was not found/i.test(text)) return { ok: false, text }
        }
      }
      return { error: 'timed out waiting for launch toast' }
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
