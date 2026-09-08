import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

export const aurora: Visualizer = {
  key: 'aurora',
  name: 'Aurora',
  render(vc: VizContext): void {
    const { ctx, w, h, t, data, palette, lowPerf } = vc
    ctx.globalCompositeOperation = 'lighter'

    const layers = 3
    for (let l = 0; l < layers; l++) {
      const amp = h * (0.1 + data.bass * 0.42) * (0.55 + l * 0.22)
      const yBase = h * (0.35 + l * 0.17 + data.mid * 0.04)
      const speed = 0.28 + l * 0.14

      ctx.beginPath()
      ctx.moveTo(0, h)
      const step = lowPerf ? 8 : 4
      for (let x = 0; x <= w; x += step) {
        const nx = x / w
        const wave =
          Math.sin(nx * 5.2 + t * speed + l * 2.1) * amp * (0.55 + data.mid * 0.9) +
          Math.sin(nx * 12 - t * speed * 0.6 + l * 1.3) * amp * 0.38 * (0.5 + data.treble * 1.4) +
          Math.sin(nx * 2.1 + t * 0.16 + l) * h * 0.035 * (1 + data.bass * 1.6)
        ctx.lineTo(x, yBase + wave)
      }
      ctx.lineTo(w, h)
      ctx.closePath()

      const c = l % 2 === 0 ? palette.a1 : palette.a2
      const grad = ctx.createLinearGradient(0, Math.max(0, yBase - amp), 0, h)
      grad.addColorStop(0, rgba(c, 0.42))
      grad.addColorStop(0.5, rgba(c, 0.14))
      grad.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = grad
      ctx.fill()
    }

    // treble sparks
    const n = Math.floor(data.treble * (lowPerf ? 26 : 52))
    for (let i = 0; i < n; i++) {
      const x = (i * 137.508 + t * 36) % w
      const y = h * (0.2 + (((i * 61.803 + t * 26) % 1) * 0.65))
      const r = 0.6 + data.treble * 1.6
      ctx.fillStyle = rgba(palette.a2, 0.4)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
  }
}