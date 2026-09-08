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

// We should already be on Home (#/)
await sleep(400)

const dims = await evaluate(`(() => {
  const c = document.querySelector('.home-viz canvas')
  const r = c.getBoundingClientRect()
  const p = c.parentElement.getBoundingClientRect()
  return { backingW: c.width, backingH: c.height, cssW: r.width, cssH: r.height,
           parentW: p.width, parentH: p.height, dpr: window.devicePixelRatio }
})()`)
console.log('dims:', JSON.stringify(dims))

const MODES = ['Particles', 'Spectrum', 'Fluid']
for (const target of MODES) {
  await evaluate(`document.querySelector('.home-viz-btn').click()`)
  await sleep(150)
  await evaluate(`(() => {
    const it = [...document.querySelectorAll('.ctx-item')].find((e) => e.textContent.includes('${target}'))
    if (it) it.click()
  })()`)
  await sleep(1400) // let transition finish + frames accumulate

  const profile = await evaluate(`(() => {
    const c = document.querySelector('.home-viz canvas')
    const ctx = c.getContext('2d')
    const { width: W, height: H } = c
    const img = ctx.getImageData(0, 0, W, H).data
    const cols = new Array(W).fill(0)
    const rows = new Array(H).fill(0)
    let total = 0
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        const a = img[i + 3]
        const r = img[i], g = img[i + 1], b = img[i + 2]
        // content = opaque or noticeably bright
        const isContent = a > 40 || (r + g + b) > 150
        if (isContent) { cols[x]++; rows[y]++; total++ }
      }
    }
    // summarize: for 10 horizontal bands and 10 vertical bands, fraction of pixels that are content
    const hBands = []
    for (let b = 0; b < 10; b++) {
      let sum = 0
      const y0 = Math.floor((b / 10) * H), y1 = Math.floor(((b + 1) / 10) * H)
      for (let y = y0; y < y1; y++) sum += rows[y]
      hBands.push(+(sum / ((y1 - y0) * W)).toFixed(3))
    }
    const vBands = []
    for (let b = 0; b < 10; b++) {
      let sum = 0
      const x0 = Math.floor((b / 10) * W), x1 = Math.floor(((b + 1) / 10) * W)
      for (let x = x0; x < x1; x++) sum += cols[x]
      vBands.push(+(sum / ((x1 - x0) * H)).toFixed(3))
    }
    return { W, H, total, frac: +(total / (W * H)).toFixed(3), hBands, vBands }
  })()`)
  console.log(`${target}:`, JSON.stringify(profile))
}

process.exit(0)