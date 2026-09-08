import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

const PTS = 160

export const minimal: Visualizer = {
  key: 'minimal',
  name: 'Minimal',
  render(vc: VizContext): void {
    const { ctx, w, h, data, palette } = vc
    const td = data.time
    const step = Math.max(1, Math.floor(td.length / PTS))
    const mid = h / 2
    const amp = h * 0.3 * (0.5 + data.bass * 0.7)

    ctx.strokeStyle = rgba(palette.a1, 0.9)
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const n = Math.floor(td.length / step)
    for (let i = 0; i <= n; i++) {
      const v = (td[i * step] - 128) / 128
      const x = (i / n) * w
      const y = mid + v * amp * -1
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // soft mirror
    ctx.strokeStyle = rgba(palette.a2, 0.18)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const v = (td[i * step] - 128) / 128
      const x = (i / n) * w
      const y = mid + v * amp * 0.35
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}