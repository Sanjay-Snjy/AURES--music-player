import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9360

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
  // make sure we're on home
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
        (b) => b.textContent.trim().toLowerCase().startsWith('peace')
      )
      if (!btn) return JSON.stringify({ error: 'peace btn not found' })
      btn.click()
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const toast = document.querySelector('.toast-content') || document.querySelector('[class*="toast"]')
        if (toast) {
          const text = toast.innerText || ''
          if (text.toLowerCase().includes('peace equalizer launched')) return { ok: true, toast: text }
          if (text.toLowerCase().includes('was not found')) return { ok: false, toast: text }
        }
      }
      return { error: 'timed out waiting for launch toast' }
    })()`,
    awaitPromise: true,
    returnByValue: true
  })
  console.log('RESULT:', r.result?.result?.value ?? JSON.stringify(r).slice(0, 400))
  // check that Peace was spawned
  await call(4, 'Runtime.evaluate', {
    expression: `(() => {
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 500))
        try {
          const ps = require('child_process').execSync('tasklist /FI "IMAGENAME eq Peace.exe" /NH', { encoding: 'utf8' })
          if (ps.toLowerCase().includes('peace.exe')) return { peaceRunning: true }
        } catch { }
      }
      return { peaceRunning: false }
    })()`,
    returnByValue: true
  })
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
