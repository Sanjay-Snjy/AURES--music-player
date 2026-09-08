const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const page = list.find((t) => t.type === 'page')
if (!page) {
  console.log('NO-PAGE-TARGET')
  process.exit(1)
}
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

const evaluate = async (expr) => {
  const res = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  })
  return res && res.result && res.result.value
}

const hash = async () =>
  evaluate(`(() => {
    const c = document.querySelector('.home-viz .viz-canvas')
    if (!c) return 'no-canvas'
    try {
      const ctx = c.getContext('2d')
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let h = 0
      for (let i = 0; i < d.length; i += 7919) h = (h * 31 + d[i]) >>> 0
      return 'hash:' + h + ' size:' + c.width + 'x' + c.height
    } catch (e) { return 'err:' + e.message }
  })()`)

console.log('mode before:', await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`))
console.log('canvas before:', await hash())

// switch to Cosmic via the menu
await evaluate(`document.querySelector('.home-viz-btn').click()`)
await sleep(300)
await evaluate(`(() => {
  const it = [...document.querySelectorAll('.ctx-item')].find((e) => e.textContent.includes('Cosmic'))
  if (it) it.click()
})()`)
await sleep(1600) // let the crossfade finish

console.log('mode after:', await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`))
console.log('canvas after:', await hash())
process.exit(0)