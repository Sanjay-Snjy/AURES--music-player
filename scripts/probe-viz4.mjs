const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg.result)
    pending.delete(msg.id)
  }
}
await new Promise((r) => (ws.onopen = r))
await send('Runtime.enable')

const evaluate = async (expr) => {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return res && res.result && res.result.value
}

const pixelProfile = async () =>
  evaluate(`(() => {
    const c = document.querySelector('.home-viz .viz-canvas')
    if (!c) return 'no-canvas'
    try {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 10) continue
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
      }
      if (!n) return 'blank'
      return 'avg=' + (r / n | 0) + ',' + (g / n | 0) + ',' + (b / n | 0) + ' n=' + n
    } catch (e) { return 'err:' + e.message }
  })()`)

async function switchMode(name) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await evaluate(`document.querySelector('.home-viz-btn').click()`)
    await sleep(250)
    const ok = await evaluate(`(() => {
      const it = [...document.querySelectorAll('.ctx-item')].find((e) => e.textContent.includes('${name}'))
      if (!it) return false
      it.click()
      return true
    })()`)
    await sleep(500)
    const label = await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`)
    if (label === name) return 'ok'
    await sleep(300)
  }
  return 'FAILED'
}

console.log('pixel before:', await pixelProfile())
for (const mode of ['Spectrum', 'Aurora', 'Orbit', 'Cosmic', 'Spectrum']) {
  const r = await switchMode(mode)
  await sleep(1200)
  console.log(`mode=${mode} applied=${r} pixel=${await pixelProfile()}`)
}
process.exit(0)