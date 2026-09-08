import type { Visualizer, VizContext } from '../VisualizerEngine'
import { clamp, rgba } from '../helpers'

const state = { prev: new Float32Array(0) }

export const spectrum: Visualizer = {
  key: 'spectrum',
  name: 'Spectrum',
  render(vc: VizContext): void {
    const { ctx, w, h, t, dt, data, palette, lowPerf, sym } = vc
    const bars = lowPerf ? Math.min(120, Math.floor(w / 10)) : Math.min(180, Math.floor(w / 7))
    if (state.prev.length !== bars) state.prev = new Float32Array(bars)

    const usable = Math.floor(data.freq.length * 0.82)
    const gap = Math.max(1, w / bars / 6)
    const bw = w / bars 
    const centerY = h / 2
    const maxH = h * 1
    const falloff = (2.2 + data.level * 7) * dt * 60

    const grad = ctx.createLinearGradient(0, h, 0, 0)
    grad.addColorStop(0, rgba(palette.a1, 0.95))
    grad.addColorStop(0.55, rgba(palette.a2, 0.95))
    grad.addColorStop(1, rgba(palette.a2, 0.62))
    ctx.fillStyle = grad

    if (!lowPerf) {
      ctx.shadowBlur = 14
      ctx.shadowColor = rgba(palette.a1, 0.75)
    }

    for (let i = 0; i < bars; i++) {
      // log-ish bin distribution so bass gets detailed bars
      const frac = i / bars
      const bin = Math.max(1, Math.floor(Math.pow(frac, 1.7) * usable))
      const raw = data.freq[bin] / 255
      const boost = 1 + (1 - frac) * 0.55 // bass emphasis
      const target = clamp(raw * boost * (0.55 + data.bass * 0.9), 0, 1.2)

      const p = state.prev[i]
      state.prev[i] =
        target >= p ? p + (target - p) * 0.55 : Math.max(target, p - falloff)
      const v = Math.min(1, state.prev[i])

      const bh = Math.max(2, v * maxH)
      const x = i * bw + gap / 2
      const wBar = bw - gap
      if (sym) {
        ctx.fillRect(x, centerY - bh / 2, wBar, bh)
      } else {
        ctx.fillRect(x, h - bh, wBar, bh)
      }
    }

    ctx.shadowBlur = 0

    // subtle moving reflection line for depth
    if (!lowPerf) {
      const ly = h * (0.32 + 0.36 * (0.5 + 0.5 * Math.sin(t * 1.4)))
      const lg = ctx.createLinearGradient(0, ly - 40, 0, ly + 40)
      lg.addColorStop(0, rgba(palette.a2, 0))
      lg.addColorStop(0.5, rgba(palette.a2, 0.12))
      lg.addColorStop(1, rgba(palette.a2, 0))
      ctx.fillStyle = lg
      ctx.fillRect(0, ly - 40, w, 80)
    }
  }
}