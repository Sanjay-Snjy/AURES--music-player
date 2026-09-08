import type { Visualizer, VizContext } from '../VisualizerEngine'
import { clamp, hash01, rgba } from '../helpers'

interface Star {
  x: number
  y: number
  r: number
  phase: number
}

interface Wave {
  r: number
  alpha: number
}

interface Part {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: 0 | 1
}

const state: { stars: Star[]; waves: Wave[]; parts: Part[]; w: number; h: number } = {
  stars: [],
  waves: [],
  parts: [],
  w: 0,
  h: 0
}

function ensureStars(vc: VizContext): void {
  if (state.stars.length && state.w === vc.w && state.h === vc.h) return
  state.w = vc.w
  state.h = vc.h
  state.stars = []
  const n = vc.lowPerf ? 60 : 130
  for (let i = 0; i < n; i++) {
    state.stars.push({
      x: Math.random() * vc.w,
      y: Math.random() * vc.h,
      r: 0.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2
    })
  }
}

export const cosmic: Visualizer = {
  key: 'cosmic',
  name: 'Cosmic',
  render(vc: VizContext): void {
    const { ctx, w, h, t, dt, data, palette, lowPerf } = vc
    ensureStars(vc)
    const cx = w / 2
    const cy = h / 2

    // stars
    for (let i = 0; i < state.stars.length; i++) {
      const s = state.stars[i]
      const tw = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (1 + s.r) + s.phase))
      const drift = Math.sin(t * 0.25 + s.phase) * (4 + data.bass * 26)
      ctx.fillStyle = rgba(palette.a2, tw * (0.35 + data.treble * 0.6))
      ctx.beginPath()
      ctx.arc((s.x + drift + w) % w, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // bass shockwaves
    if (data.beat) {
      state.waves.push({ r: Math.max(w, h) * 0.04, alpha: 0.55 })
      if (state.waves.length > 6) state.waves.shift()
    }
    for (let i = state.waves.length - 1; i >= 0; i--) {
      const wave = state.waves[i]
      wave.r += (160 + data.bass * 520) * dt
      wave.alpha *= 1 - dt * 1.5
      if (wave.alpha <= 0.02) {
        state.waves.splice(i, 1)
        continue
      }
      ctx.strokeStyle = rgba(palette.a1, wave.alpha)
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(cx, cy, wave.r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // nebula core
    const nebR = Math.min(w, h) * 0.24 * (0.45 + data.bass * 0.85)
    const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebR)
    ng.addColorStop(0, rgba(palette.a1, 0.4 + data.bass * 0.3))
    ng.addColorStop(0.6, rgba(palette.a1, 0.12))
    ng.addColorStop(1, rgba(palette.a1, 0))
    ctx.fillStyle = ng
    ctx.beginPath()
    ctx.arc(cx, cy, nebR, 0, Math.PI * 2)
    ctx.fill()

    // energy particles emitted from center
    const spawn = Math.floor((data.treble * 1.2 + data.level * 0.6) * (lowPerf ? 1.2 : 2.4))
    for (let i = 0; i < spawn && state.parts.length < (lowPerf ? 220 : 420); i++) {
      const ang = Math.random() * Math.PI * 2
      const spd = 20 + Math.random() * 60 + data.bass * 160
      state.parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        size: 0.8 + Math.random() * 1.8,
        color: Math.random() < 0.6 ? 0 : 1
      })
    }
    for (let i = state.parts.length - 1; i >= 0; i--) {
      const p = state.parts[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 1 - dt * 1.1
      p.vy *= 1 - dt * 1.1
      p.life -= dt * 0.6
      if (p.life <= 0) {
        state.parts.splice(i, 1)
        continue
      }
      const c = p.color === 0 ? palette.a2 : palette.a1
      ctx.fillStyle = rgba(c, clamp(p.life, 0, 1) * 0.85)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.8), 0, Math.PI * 2)
      ctx.fill()
    }

    // rotating dust ring
    const ringR = Math.min(w, h) * 0.34
    const ringA = t * 0.16 + data.bass * 0.2
    for (let i = 0; i < 24; i++) {
      const a = ringA + (i / 24) * Math.PI * 2
      const rr = ringR + Math.sin(t * 0.9 + i * 0.7) * 14 * (0.4 + data.mid)
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr * 0.42
      const tw2 = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3)
      ctx.fillStyle = rgba(palette.a2, tw2 * (0.2 + data.treble * 0.5))
      ctx.beginPath()
      ctx.arc(x, y, 1 + hash01(i, 3) * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}