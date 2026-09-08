import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 9365

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
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
})

const consoleLines = []
child.stderr.on('data', (d) => {
  const text = d.toString()
  consoleLines.push(text)
  console.log('STDERR:', text.trim())
})
child.stdout.on('data', (d) => {
  const text = d.toString()
  console.log('STDOUT:', text.trim())
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
      return window.snjy.openPeaceEqualizer()
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
  setTimeout(() => {
    spawn('taskkill', ['//F', '//IM', 'electron.exe'], { stdio: 'ignore' })
    console.log('CONSOLE:', consoleLines.join('\n').slice(0, 800))
    process.exit(0)
  }, 500)
}
