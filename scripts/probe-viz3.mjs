const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const consoleMsgs = []
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push(msg.params.type + ': ' + (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
  }
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg.result)
    pending.delete(msg.id)
  }
}
await new Promise((r) => (ws.onopen = r))
await send('Runtime.enable')

const evaluate = async (expr) => {
  const res = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  })
  if (res && res.exceptionDetails) {
    return 'EXC: ' + JSON.stringify(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
  }
  return res && res.result && res.result.value
}

const clickMode = async (name) => {
  const menuOpen = await evaluate(`!!document.querySelector('.ctx-menu')`)
  const found = await evaluate(`(() => {
    const it = [...document.querySelectorAll('.ctx-item')].find((e) => e.textContent.includes('${name}'))
    if (!it) return 'not-found'
    it.click()
    return 'clicked'
  })()`)
  await sleep(600)
  const label = await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`)
  return { menuOpen, found, label }
}

console.log('start label:', await evaluate(`document.querySelector('.home-viz-btn')?.textContent?.trim()`))
for (const mode of ['Waveform', 'Fluid', 'Minimal']) {
  await evaluate(`document.querySelector('.home-viz-btn').click()`)
  await sleep(350)
  const r = await clickMode(mode)
  console.log(`switch to ${mode}: menuWasOpen=${r.menuOpen} clickResult=${r.found} labelNow=${r.label}`)
}
console.log('console msgs:', consoleMsgs.length ? consoleMsgs.slice(-15) : '(none)')
process.exit(0)