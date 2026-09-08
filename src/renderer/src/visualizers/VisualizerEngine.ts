import type { RGB } from './helpers'
import { spectrum } from './modes/spectrum'
import { aurora } from './modes/aurora'
import { cosmic } from './modes/cosmic'
import { orbit } from './modes/orbit'
import { waveform } from './modes/waveform'
import { fluid } from './modes/fluid'
import { particles } from './modes/particles'
import { minimal } from './modes/minimal'

export interface Palette {
  a1: RGB
  a2: RGB
  bg: RGB
}

export interface VizData {
  freq: Uint8Array
  time: Uint8Array
  level: number
  bass: number
  mid: number
  treble: number
  beat: boolean
}

export interface VizContext {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  t: number
  dt: number
  data: VizData
  palette: Palette
  lowPerf: boolean
  sym: boolean
  waveStyle: 'horizontal' | 'mirror' | 'circular'
}

export interface Visualizer {
  key: string
  name: string
  render(vc: VizContext): void
}

export const VISUALIZERS: Record<string, Visualizer> = {
  spectrum,
  aurora,
  cosmic,
  orbit,
  waveform,
  fluid,
  particles,
  minimal
}

export const VISUALIZER_KEYS = Object.keys(VISUALIZERS)

// Approximate bin boundaries for a 44.1 kHz / 1024-bin analyser.
const BASS_END = 12
const MID_END = 186

interface AutoStats {
  levelSum: number
  bassSum: number
  count: number
}

export class VisualizationEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private raf = 0
  private running = false
  private w = 0
  private h = 0
  private dpr = 1
  private t = 0
  private lastT = 0
  private dt = 0.016

  private mode: string = 'spectrum'
  private auto = false
  private lowPerf = false
  private sym = false
  private waveStyle: VizContext['waveStyle'] = 'mirror'
  private palette: Palette = { a1: [139, 124, 255], a2: [76, 201, 240], bg: [7, 8, 12] }

  private freq = new Uint8Array(1024)
  private time = new Uint8Array(2048)

  private sLevel = 0
  private sBass = 0
  private sMid = 0
  private sTreble = 0
  private prevBass = 0
  private beatCooldown = 0
  private lastBeatAt = 0

  private stats: AutoStats = { levelSum: 0, bassSum: 0, count: 0 }
  private lastAutoSwitch = 0

  private transitionUntil = 0
  private snapshot: HTMLCanvasElement | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx
  }

  setAnalyser(a: AnalyserNode | null): void {
    this.analyser = a
  }

  setMode(key: string): void {
    if (!VISUALIZERS[key] || key === this.mode) return
    // Snapshot current frame for a smooth crossfade.
    const snap = document.createElement('canvas')
    snap.width = this.canvas.width
    snap.height = this.canvas.height
    snap.getContext('2d')?.drawImage(this.canvas, 0, 0)
    this.snapshot = snap
    this.transitionUntil = performance.now() + 900
    this.mode = key
    this.lastAutoSwitch = performance.now()
  }

  setAuto(b: boolean): void {
    this.auto = b
    this.stats = { levelSum: 0, bassSum: 0, count: 0 }
  }

  setLowPerf(b: boolean): void {
    this.lowPerf = b
  }

  setSym(b: boolean): void {
    this.sym = b
  }

  setWaveStyle(s: VizContext['waveStyle']): void {
    this.waveStyle = s
  }

  setPalette(p: Palette): void {
    this.palette = p
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastT = performance.now() / 1000
    this.raf = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  resize(w: number, h: number, dpr: number): void {
    this.w = w
    this.h = h
    this.dpr = Math.min(dpr, this.lowPerf ? 1 : 2)
    this.canvas.width = Math.max(1, Math.round(w * this.dpr))
    this.canvas.height = Math.max(1, Math.round(h * this.dpr))
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private computeData(): VizData {
    const a = this.analyser
    if (a) {
      if (this.freq.length !== a.frequencyBinCount) {
        this.freq = new Uint8Array(a.frequencyBinCount)
        this.time = new Uint8Array(a.fftSize)
      }
      a.getByteFrequencyData(this.freq)
      a.getByteTimeDomainData(this.time)
    } else {
      this.freq.fill(0)
      this.time.fill(128)
    }

    const f = this.freq
    const bins = f.length
    const bassEnd = Math.min(BASS_END, Math.floor(bins * 0.5))
    const midEnd = Math.min(MID_END, bins)

    let bassSum = 0
    let midSum = 0
    let trebleSum = 0
    for (let i = 1; i < bassEnd; i++) bassSum += f[i]
    for (let i = bassEnd; i < midEnd; i++) midSum += f[i]
    for (let i = midEnd; i < bins; i++) trebleSum += f[i]

    const bass = bassSum / 255 / Math.max(1, bassEnd - 1)
    const mid = midSum / 255 / Math.max(1, midEnd - bassEnd)
    const treble = trebleSum / 255 / Math.max(1, bins - midEnd)
    const level = bass * 0.45 + mid * 0.4 + treble * 0.15

    const k = Math.min(1, this.dt * 9)
    this.sLevel = this.sLevel + (level - this.sLevel) * k
    this.sBass = this.sBass + (bass - this.sBass) * k
    this.sMid = this.sMid + (mid - this.sMid) * k
    this.sTreble = this.sTreble + (treble - this.sTreble) * k

    // beat detection
    const now = performance.now()
    let beat = false
    if (now > this.lastBeatAt + 320 && this.sBass > 0.24 && this.sBass > this.prevBass * 1.3) {
      beat = true
      this.lastBeatAt = now
      this.prevBass = this.sBass * 0.6
    } else {
      this.prevBass = this.prevBass + (this.sBass - this.prevBass) * 0.15
    }

    return {
      freq: this.freq,
      time: this.time,
      level: this.sLevel,
      bass: this.sBass,
      mid: this.sMid,
      treble: this.sTreble,
      beat
    }
  }

  private maybeAutoSwitch(data: VizData): void {
    this.stats.levelSum += data.level
    this.stats.bassSum += data.bass
    this.stats.count++
    if (this.stats.count < 400) return
    const avgLevel = this.stats.levelSum / this.stats.count
    const bassFrac = this.stats.bassSum / Math.max(this.stats.count * avgLevel, 0.3)
    const now = performance.now()
    if (now - this.lastAutoSwitch > 40000) {
      let next: string
      if (avgLevel > 0.42) next = Math.random() < 0.5 ? 'cosmic' : 'particles'
      else if (bassFrac > 0.62) next = Math.random() < 0.5 ? 'orbit' : 'spectrum'
      else if (avgLevel < 0.2) next = Math.random() < 0.5 ? 'aurora' : 'fluid'
      else next = Math.random() < 0.5 ? 'spectrum' : 'waveform'
      if (next !== this.mode) this.setMode(next)
    }
    this.stats = { levelSum: 0, bassSum: 0, count: 0 }
  }

  private loop = (ts: number): void => {
    if (!this.running) return
    const now = ts / 1000
    this.dt = Math.min(0.1, Math.max(0.004, now - (this.lastT || now)))
    this.lastT = now
    this.t += this.dt

    const data = this.computeData()
    if (this.auto) this.maybeAutoSwitch(data)

    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, this.w, this.h)

    const nowMs = performance.now()
    if (this.snapshot && nowMs < this.transitionUntil) {
      const f = 1 - (this.transitionUntil - nowMs) / 900
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1 - f
      ctx.drawImage(this.snapshot, 0, 0)
      ctx.restore()
      ctx.globalAlpha = f
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    } else if (this.snapshot) {
      this.snapshot = null
    }

    const vc: VizContext = {
      ctx,
      w: this.w,
      h: this.h,
      t: this.t,
      dt: this.dt,
      data,
      palette: this.palette,
      lowPerf: this.lowPerf,
      sym: this.sym,
      waveStyle: this.waveStyle
    }
    try {
      VISUALIZERS[this.mode].render(vc)
    } catch {
      // Never let a visualizer bug kill the animation loop.
    }

    this.raf = requestAnimationFrame(this.loop)
  }
}