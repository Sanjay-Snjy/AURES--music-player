// Launches SNJY with CDP, checks that --dyn-* variables are NOT overridden
// inline and that color-mix gradients using them resolve (not 'none').
import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9334

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
      const root = document.documentElement
      const inline1 = root.style.getPropertyValue('--dyn-1')
      const inline2 = root.style.getPropertyValue('--dyn-2')
      const computed = (v) => getComputedStyle(root).getPropertyValue(v).trim()
      const play = document.querySelector('.pb-play') || document.querySelector('.home-play')
      const bg = play ? getComputedStyle(play).backgroundImage : null
      const nav = document.querySelector('.nav-active')
      const navBg = nav ? getComputedStyle(nav).backgroundImage : null
      // Try a hex :root override and see if it flows into a color-mix rule.
      root.style.setProperty('--dyn-1', '#ff2d2d')
      const testEl = document.createElement('div')
      testEl.style.background = 'linear-gradient(135deg, color-mix(in srgb, var(--dyn-1) 95%, transparent), color-mix(in srgb, var(--dyn-2) 90%, transparent))'
      document.body.appendChild(testEl)
      const testBg = getComputedStyle(testEl).backgroundImage
      testEl.remove()
      root.style.removeProperty('--dyn-1')
      return JSON.stringify({
        inline1, inline2,
        dyn1: computed('--dyn-1'),
        dyn2: computed('--dyn-2'),
        playBgValid: !!bg && bg !== 'none',
        navBgValid: !!navBg && navBg !== 'none',
        hexOverrideFlow: testBg && testBg !== 'none'
      })
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