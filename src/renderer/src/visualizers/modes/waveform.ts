import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

const PTS = 220

export const waveform: Visualizer = {
  key: 'waveform',
  name: 'Waveform',
  render(vc: VizContext): void {
    const { ctx, w, h, data, palette, lowPerf, waveStyle } = vc
    const td = data.time
    const step = Math.max(1, Math.floor(td.length / PTS))
    const amp = h * 0.4 * (0.55 + data.bass * 0.95)
    const mid = h / 2

    const grad = ctx.createLinearGradient(0, mid - amp, 0, mid + amp)
    grad.addColorStop(0, rgba(palette.a1, 0.95))
    grad.addColorStop(0.5, rgba(palette.a2, 0.85))
    grad.addColorStop(1, rgba(palette.a1, 0.95))

    if (!lowPerf) {
      ctx.shadowBlur = 12
      ctx.shadowColor = rgba(palette.a1, 0.7)
    }
    ctx.strokeStyle = grad
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const stroke = (fromTop: boolean): void => {
      ctx.beginPath()
      const n = Math.floor(td.length / step)
      for (let i = 0; i <= n; i++) {
        const v = (td[i * step] - 128) / 128
        const x = (i / n) * w
        const y = fromTop ? mid - v * amp : mid + v * amp
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    if (waveStyle === 'circular') {
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.3
      ctx.beginPath()
      const n = Math.floor(td.length / step)
      for (let i = 0; i <= n; i++) {
        const v = (td[i * step] - 128) / 128
        const a = (i / n) * Math.PI * 2
        const rr = r * (1 + v * 0.22 * (0.5 + data.mid))
        const x = cx + Math.cos(a) * rr
        const y = cy + Math.sin(a) * rr
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.fillStyle = rgba(palette.a2, 0.8)
      ctx.beginPath()
      ctx.arc(cx, cy, 2 + data.bass * 5, 0, Math.PI * 2)
      ctx.fill()
    } else if (waveStyle === 'mirror') {
      stroke(true)
      stroke(false)
    } else {
      stroke(true)
    }

    ctx.shadowBlur = 0

    // faint baseline
    ctx.strokeStyle = rgba(palette.a2, 0.12)
    ctx.lineWidth = 1
    ctx.beginPath()
    if (waveStyle === 'mirror' || waveStyle === 'horizontal') {
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
    }
    ctx.stroke()
  }
}