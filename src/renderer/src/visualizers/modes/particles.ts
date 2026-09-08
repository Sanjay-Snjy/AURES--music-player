import type { Visualizer, VizContext } from '../VisualizerEngine'
import { rgba } from '../helpers'

interface Part {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: 0 | 1
}

const state: { parts: Part[]; w: number; h: number } = { parts: [], w: 0, h: 0 }
const TARGET = 820
const TARGET_LOW = 340

/** (Re)spawn the whole field so particles always cover the current canvas size. */
function seed(vc: VizContext): void {
  state.w = vc.w
  state.h = vc.h
  state.parts = []
  const target = vc.lowPerf ? TARGET_LOW : TARGET
  for (let i = 0; i < target; i++) {
    state.parts.push({
      x: Math.random() * vc.w,
      y: Math.random() * vc.h,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: 0.4 + Math.random() * 0.6,
      color: Math.random() < 0.55 ? 0 : 1
    })
  }
}

export const particles: Visualizer = {
  key: 'particles',
  name: 'Particles',
  render(vc: VizContext): void {
    const { ctx, w, h, dt, data, palette, lowPerf } = vc
    const target = lowPerf ? TARGET_LOW : TARGET
    if (state.parts.length !== target || state.w !== w || state.h !== h) {
      seed(vc)
    }

    // trail fade
    ctx.fillStyle = rgba(palette.bg, 0.13)
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    for (let i = 0; i < state.parts.length; i++) {
      const p = state.parts[i]
      // physics driven by audio: bass lifts, treble jitters, mid pulls inward
      p.vy = p.vy * 0.985 - (data.bass * 90 + 6) * dt
      p.vx = p.vx * 0.992 + (Math.random() - 0.5) * data.treble * 150 * dt
      p.vx += (cx - p.x) * 0.0016 * data.mid * dt
      p.x += p.vx * dt
      p.y += p.vy * dt

      if (p.y < -4) {
        p.y = h + 4
        p.vy = Math.abs(p.vy) * 0.5
      }
      if (p.x < -4) p.x = w + 4
      if (p.x > w + 4) p.x = -4
      if (p.y > h + 4) {
        p.y = -4
      }

      p.life += dt * 0.04
      if (p.life > 1) p.life = 0.4

      const c = p.color === 0 ? palette.a1 : palette.a2
      const a = 0.35 + p.life * 0.5 + data.treble * 0.25
      ctx.fillStyle = rgba(c, Math.min(1, a))
      const r = 0.8 + p.life * 1.2 + data.bass * 0.6
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}