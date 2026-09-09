// Generates the SNJY app icon (256x256) and tray icon (32x32) as real PNG files,
// using only Node's zlib. Run with: node scripts/make-icon.mjs
import { deflateSync } from 'node:zlib'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, pixelFn) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      const o = y * stride + 1 + x * 4
      raw[o] = Math.round(r)
      raw[o + 1] = Math.round(g)
      raw[o + 2] = Math.round(b)
      raw[o + 3] = Math.round(a)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- drawing helpers ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t

function roundedRectAlpha(x, y, size, radius) {
  const half = size / 2
  const qx = Math.abs(x - half) - (half - radius)
  const qy = Math.abs(y - half) - (half - radius)
  const dist =
    Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0)
  return clamp(1 - dist, 0, 1)
}

function drawAppIcon(size) {
  const s = size
  const bgTop = [11, 13, 22]
  const bgBottom = [24, 29, 52]
  const violet = [139, 124, 255]
  const violetDeep = [76, 64, 208]
  const cyan = [76, 201, 240]

  // disc + ring centers (relative to size)
  const discCx = 0.42 * s
  const discCy = 0.52 * s
  const discR = 0.2 * s
  const ringCx = 0.7 * s
  const ringCy = 0.38 * s
  const ringR = 0.18 * s
  const ringTh = 0.045 * s
  const arcStart = -Math.PI * 0.72
  const arcSweep = Math.PI * 1.45

  return (x, y) => {
    const rr = roundedRectAlpha(x, y, s, s * 0.22)
    if (rr <= 0) return [0, 0, 0, 0]

    // vertical background gradient
    const bg = [
      lerp(bgTop[0], bgBottom[0], y / s),
      lerp(bgTop[1], bgBottom[1], y / s),
      lerp(bgTop[2], bgBottom[2], y / s)
    ]

    let r = bg[0]
    let g = bg[1]
    let b = bg[2]

    // ambient violet glow behind disc
    const dGlow = Math.hypot(x - discCx, y - discCy) / (discR * 1.55)
    if (dGlow < 1) {
      const a = (1 - dGlow) * 0.5
      r = lerp(r, violet[0], a)
      g = lerp(g, violet[1], a)
      b = lerp(b, violet[2], a)
    }

    // main disc (radial violet gradient)
    const d = Math.hypot(x - discCx, y - discCy)
    if (d < discR) {
      const t = clamp(d / discR, 0, 1)
      const col = [
        lerp(violet[0], violetDeep[0], t),
        lerp(violet[1], violetDeep[1], t),
        lerp(violet[2], violetDeep[2], t)
      ]
      r = col[0]
      g = col[1]
      b = col[2]
    }

    // cyan ring arc
    const dr = Math.hypot(x - ringCx, y - ringCy)
    const ang = Math.atan2(y - ringCy, x - ringCx)
    let aNorm = (ang - arcStart) % (Math.PI * 2)
    if (aNorm < 0) aNorm += Math.PI * 2
    const inArc = aNorm <= arcSweep
    if (Math.abs(dr - ringR) < ringTh && inArc) {
      const edge = clamp(1 - Math.abs(dr - ringR) / ringTh, 0, 1)
      r = lerp(r, cyan[0], edge)
      g = lerp(g, cyan[1], edge)
      b = lerp(b, cyan[2], edge)
    }

    // bright dot at ring start
    const dotX = ringCx + Math.cos(arcStart) * ringR
    const dotY = ringCy + Math.sin(arcStart) * ringR
    const dd = Math.hypot(x - dotX, y - dotY)
    if (dd < ringTh * 0.9) {
      const a = clamp(1 - dd / (ringTh * 0.9), 0, 1) * 0.9
      r = lerp(r, 240, a)
      g = lerp(g, 248, a)
      b = lerp(b, 255, a)
    }

    return [r, g, b, 255 * rr]
  }
}

function drawTrayIcon(size) {
  const s = size
  const violet = [139, 124, 255]
  const cyan = [76, 201, 240]
  return (x, y) => {
    const rr = roundedRectAlpha(x, y, s, s * 0.3)
    if (rr <= 0) return [0, 0, 0, 0]
    let r = 16
    let g = 18
    let b = 30
    const cx = s / 2
    const cy = s / 2
    const d = Math.hypot(x - cx, y - cy)
    if (d < s * 0.3) {
      const t = clamp(d / (s * 0.3), 0, 1)
      r = lerp(violet[0], 58, t)
      g = lerp(violet[1], 52, t)
      b = lerp(violet[2], 150, t)
    }
    // cyan ring
    const dr = Math.abs(Math.hypot(x - cx, y - cy) - s * 0.4)
    if (dr < s * 0.05) {
      r = lerp(r, cyan[0], 1 - dr / (s * 0.05))
      g = lerp(g, cyan[1], 1 - dr / (s * 0.05))
      b = lerp(b, cyan[2], 1 - dr / (s * 0.05))
    }
    return [r, g, b, 255 * rr]
  }
}

mkdirSync(join(root, 'resources'), { recursive: true })
mkdirSync(join(root, 'build'), { recursive: true })

const assets = join(root, 'src', 'renderer', 'src', 'assets')
copyFileSync(join(assets, 'icon.png'), join(root, 'resources', 'icon.png'))
copyFileSync(join(assets, 'icon.png'), join(root, 'build', 'icon.png'))
copyFileSync(join(assets, 'tray.png'), join(root, 'resources', 'tray.png'))
console.log('Icons copied from src/renderer/src/assets to resources/ and build/')