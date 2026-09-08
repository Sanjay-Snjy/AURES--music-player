const SLEEP = (ms) => new Promise(r => setTimeout(r, ms))

async function sampleDeckVisibility () {
  const script = `
  const deck = document.getElementById('aures-deck');
  if (!deck) { window.parent.postMessage({ok:false, why:'no-deck'}, '*'); return; }
  window.parent.postMessage({ok:true, hidden: deck.hidden}, '*');
`
  return new Promise(resolve => {
    const ifr = document.createElement('iframe')
    ifr.style.display = 'none'
    ifr.src = 'about:blank'
    ifr.onload = () => {
      try {
        ifr.contentWindow.eval(script)
      } catch (e) {
        resolve(false)
      }
    }
    document.body.appendChild(ifr)
    const handler = (e) => {
      if (!e.data || !e.data.ok) { resolve(false); return }
      resolve(!!e.data.hidden)
    }
    window.addEventListener('message', handler)
    setTimeout(() => {
      window.removeEventListener('message', handler)
      resolve(false)
    }, 200)
  })
}

async function pushState (route) {
  window.history.pushState(null, '', route)
}

async function sampleAfterPush (route, delayMs = 220) {
  pushState(route)
  await SLEEP(delayMs)
  return sampleDeckVisibility()
}

async function run () {
  await SLEEP(500)

  console.log('home ->', await sampleAfterPush('/', 250))
  console.log('songs ->', await sampleAfterPush('/songs', 250))
  console.log('home again ->', await sampleAfterPush('/', 250))
  await SLEEP(400)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
