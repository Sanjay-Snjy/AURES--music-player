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

await sleep(6000)

console.log('url:', await evaluate('location.href'))
console.log('has button:', await evaluate(`!!document.querySelector('.home-viz-btn')`))
console.log(
  'viz btn label:',
  await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`)
)

await evaluate(`(() => { const b = document.querySelector('.home-viz-btn'); if (!b) return false; b.click(); return true })()`)
await sleep(400)
console.log('menu open:', await evaluate(`!!document.querySelector('.ctx-menu')`))
console.log('menu text:', await evaluate(`document.querySelector('.ctx-menu')?.textContent?.replace(/\\s+/g,' ').trim()`))

const clicked = await evaluate(`(() => {
  const items = [...document.querySelectorAll('.ctx-item')]
  const it = items.find((e) => e.textContent.includes('Aurora'))
  if (!it) return 'no-item'
  it.click()
  return 'clicked'
})()`)
await sleep(500)
console.log('aurora item:', clicked)
console.log('menu still open:', await evaluate(`!!document.querySelector('.ctx-menu')`))
console.log(
  'viz btn label after:',
  await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`)
)

process.exit(0)