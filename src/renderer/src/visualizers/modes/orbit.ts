import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

const RINGS = 5

export const orbit: Visualizer = {
  key: 'orbit',
  name: 'Orbit',
  render(vc: VizContext): void {
    const { ctx, w, h, t, dt, data, palette, lowPerf } = vc
    const cx = w / 2
    const cy = h / 2
    const base = Math.min(w, h) * 0.09

    // central orb
    const orbR = base * (0.9 + data.bass * 1.7)
    const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.2)
    og.addColorStop(0, rgba(palette.a1, 0.95))
    og.addColorStop(0.35, rgba(palette.a1, 0.35))
    og.addColorStop(1, rgba(palette.a1, 0))
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.arc(cx, cy, orbR * 2.2, 0, Math.PI * 2)
    ctx.fill()

    if (!lowPerf) {
      ctx.shadowBlur = 18
      ctx.shadowColor = rgba(palette.a1, 0.8)
    }
    ctx.fillStyle = rgba([255, 255, 255], 0.9)
    ctx.beginPath()
    ctx.arc(cx, cy, orbR, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    const binStep = Math.max(1, Math.floor(data.freq.length / (RINGS * 3)))
    for (let i = 0; i < RINGS; i++) {
      // band energy for this ring
      let sum = 0
      const start = i * binStep * 2
      const end = Math.min(data.freq.length, start + binStep * 3)
      for (let b = start; b < end; b++) sum += data.freq[b]
      const e = sum / 255 / Math.max(1, end - start)

      const r = base * (i + 1) * (0.82 + e * 0.55)
      const rot = t * (0.22 + i * 0.13) + data.treble * t * 0.5 + i * 0.9
      const squash = 0.55 + e * 0.28 + data.bass * 0.12

      const c = i % 2 === 0 ? palette.a1 : palette.a2
      ctx.strokeStyle = rgba(c, 0.3 + e * 0.6)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, r * squash, 0, 0, Math.PI * 2)
      ctx.stroke()

      // counter-rotating faint twin ring
      if (!lowPerf) {
        ctx.strokeStyle = rgba(palette.a2, 0.12 + e * 0.2)
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.ellipse(cx, cy, r * 1.06, r * 1.06 * squash, 0.6, 0, Math.PI * 2)
        ctx.stroke()
      }

      // satellites
      const satR = r
      for (let s = 0; s < (lowPerf ? 1 : 2); s++) {
        const a = rot + s * Math.PI
        const x = cx + Math.cos(a) * satR
        const y = cy + Math.sin(a) * satR * squash
        const sr = 1.6 + e * 2.4 + (s === 1 ? 0.8 : 0)
        ctx.fillStyle = rgba(s === 0 ? palette.a2 : palette.a1, 0.55 + e * 0.45)
        ctx.beginPath()
        ctx.arc(x, y, sr, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // orbit speed shimmer
    const shim = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * (RINGS + 1) * 0.95)
    shim.addColorStop(0, rgba(palette.a1, 0.12 * (0.4 + data.bass)))
    shim.addColorStop(1, rgba(palette.a2, 0))
    ctx.fillStyle = shim
    ctx.beginPath()
    ctx.arc(cx, cy, base * (RINGS + 1) * 0.95, 0, Math.PI * 2)
    ctx.fill()
  }
}