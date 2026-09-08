import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

interface Blob {
  x0: number
  y0: number
  r0: number
  ph1: number
  ph2: number
  band: number
  color: 0 | 1
}

const state: { blobs: Blob[]; w: number; h: number } = { blobs: [], w: 0, h: 0 }

function ensureBlobs(vc: VizContext): void {
  if (state.blobs.length && state.w === vc.w && state.h === vc.h) return
  state.w = vc.w
  state.h = vc.h
  state.blobs = []
  const n = vc.lowPerf ? 6 : 9
  for (let i = 0; i < n; i++) {
    // Spread blobs evenly across the whole card so every region gets colour.
    const fx = (i + 0.5) / n
    state.blobs.push({
      x0: vc.w * (0.06 + fx * 0.88 + (Math.random() - 0.5) * 0.05),
      y0: vc.h * (0.2 + Math.random() * 0.6),
      r0: Math.max(Math.min(vc.w, vc.h) * (0.13 + Math.random() * 0.08), vc.w * 0.05),
      ph1: Math.random() * Math.PI * 2,
      ph2: Math.random() * Math.PI * 2,
      band: Math.floor(Math.random() * 6),
      color: (i % 2) as 0 | 1
    })
  }
}

export const fluid: Visualizer = {
  key: 'fluid',
  name: 'Fluid',
  render(vc: VizContext): void {
    const { ctx, w, h, t, data, palette, lowPerf } = vc
    ensureBlobs(vc)
    ctx.globalCompositeOperation = 'lighter'

    // Ambient wash so no corner of the card ever reads dead-black.
    const wash = (xr: number, yr: number, c: 0 | 1): void => {
      const x = w * xr
      const y = h * yr
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.8)
      g.addColorStop(0, rgba(c === 0 ? palette.a1 : palette.a2, 0.055))
      g.addColorStop(1, rgba(c === 0 ? palette.a1 : palette.a2, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    wash(0.28, 0.2, 0)
    wash(0.78, 0.75, 1)

    const binStride = Math.max(1, Math.floor(data.freq.length / 24))
    for (const b of state.blobs) {
      const start = b.band * binStride * 2
      const end = Math.min(data.freq.length, start + binStride * 4)
      let sum = 0
      for (let i = start; i < end; i++) sum += data.freq[i]
      const e = sum / 255 / Math.max(1, end - start)

      const x = b.x0 + Math.sin(t * 0.42 + b.ph1) * w * 0.05 + Math.sin(t * 0.21 + b.ph2) * data.bass * w * 0.03
      const y = b.y0 + Math.cos(t * 0.33 + b.ph2) * h * 0.045 + Math.sin(t * 0.17 + b.ph1) * data.mid * h * 0.02
      const wob = Math.sin(t * 1.3 + b.ph1) * (0.06 + data.treble * 0.18)
      const r = b.r0 * (0.55 + e * 1.15 + wob)

      const c = b.color === 0 ? palette.a1 : palette.a2
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, rgba(c, 0.2 + e * 0.16))
      g.addColorStop(0.7, rgba(c, 0.08 + e * 0.09))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // soft connecting wisps
    if (!lowPerf) {
      const blobs = state.blobs
      ctx.strokeStyle = rgba(palette.a2, 0.06)
      ctx.lineWidth = 1
      for (let i = 0; i < blobs.length - 1; i++) {
        const a = blobs[i]
        const c = blobs[i + 1]
        ctx.beginPath()
        ctx.moveTo(a.x0, a.y0)
        ctx.quadraticCurveTo(w / 2, h / 2 + Math.sin(t + i) * h * 0.1, c.x0, c.y0)
        ctx.stroke()
      }
    }

    ctx.globalCompositeOperation = 'source-over'
  }
}