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

const MODES = ['Spectrum', 'Aurora', 'Cosmic', 'Orbit', 'Waveform', 'Fluid', 'Particles', 'Minimal']
let ok = 0
let fail = 0
const failures = []

for (let i = 0; i < 15; i++) {
  const target = MODES[i % MODES.length]
  await evaluate(`document.querySelector('.home-viz-btn').click()`)
  await sleep(120)
  const clicked = await evaluate(`(() => {
    const it = [...document.querySelectorAll('.ctx-item')].find((e) => e.textContent.includes('${target}'))
    if (!it) return 'no-item'
    it.click()
    return 'yes'
  })()`)
  await sleep(250)
  const label = await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`)
  if (clicked === 'yes' && label === target) ok++
  else {
    fail++
    failures.push(`#${i} target=${target} clicked=${clicked} label=${label}`)
  }
}
console.log(`ok=${ok} fail=${fail}`)
if (failures.length) console.log(failures.join('\n'))
process.exit(fail ? 1 : 0)