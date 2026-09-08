export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export type AudioEvent =
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'loadedmetadata'
  | 'error'
  | 'canplay'
  | 'volumechange'

type Listener = () => void

/**
 * The single audio engine for the whole app.
 *
 *   <audio> → MediaElementAudioSource → 10 Biquad EQ filters → AnalyserNode → destination
 *
 * Visualizers read from the same AnalyserNode. The AudioContext and source
 * node are created exactly once and reused for every track.
 */
class AudioEngine {
  readonly element: HTMLAudioElement
  private ctx: AudioContext | null = null
  private analyserNode: AnalyserNode | null = null
  private filters: BiquadFilterNode[] = []
  private listeners = new Map<AudioEvent, Set<Listener>>()

  constructor() {
    this.element = new Audio()
    this.element.preload = 'auto'
    // Required so the MediaElementAudioSourceNode can read the stream from the
    // custom media:// protocol (the protocol replies with Access-Control-Allow-Origin).
    this.element.crossOrigin = 'anonymous'
    const events: AudioEvent[] = [
      'play',
      'pause',
      'ended',
      'timeupdate',
      'loadedmetadata',
      'error',
      'canplay',
      'volumechange'
    ]
    for (const ev of events) {
      this.element.addEventListener(ev, () => this.emit(ev))
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return this.ctx
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctor()
      this.ctx = ctx

      const source = ctx.createMediaElementSource(this.element)
      let prev: AudioNode = source
      const filters: BiquadFilterNode[] = []
      for (const freq of EQ_FREQS) {
        const f = ctx.createBiquadFilter()
        f.type = 'peaking'
        f.frequency.value = freq
        f.Q.value = 1.0
        f.gain.value = 0
        prev.connect(f)
        prev = f
        filters.push(f)
      }
      this.filters = filters

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.82
      prev.connect(analyser)
      analyser.connect(ctx.destination)
      this.analyserNode = analyser

      void ctx.resume()
      return ctx
    } catch {
      // No usable audio device — playback still works via the element,
      // visualizers simply have no analyser data.
      this.ctx = null
      return null
    }
  }

  load(url: string): void {
    this.element.src = url
  }

  async play(): Promise<void> {
    this.ensureContext()
    try {
      await this.element.play()
    } catch {
      // Autoplay policy / missing file — handled by 'error' event or caller.
    }
  }

  pause(): void {
    this.element.pause()
  }

  toggle(): void {
    if (this.element.paused) void this.play()
    else this.pause()
  }

  seek(t: number): void {
    if (Number.isFinite(t)) {
      this.element.currentTime = Math.max(0, t)
    }
  }

  setVolume(v: number): void {
    this.element.volume = Math.min(1, Math.max(0, v))
  }

  setMuted(m: boolean): void {
    this.element.muted = m
  }

  setPlaybackRate(r: number): void {
    this.element.playbackRate = r
  }

  setEQ(gains: number[], enabled: boolean): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    this.filters.forEach((f, i) => {
      const target = enabled ? gains[i] ?? 0 : 0
      f.gain.setTargetAtTime(target, ctx.currentTime, 0.05)
    })
  }

  getAnalyser(): AnalyserNode | null {
    this.ensureContext()
    return this.analyserNode
  }

  get currentTime(): number {
    return Number.isFinite(this.element.currentTime) ? this.element.currentTime : 0
  }

  get duration(): number {
    return Number.isFinite(this.element.duration) ? this.element.duration : 0
  }

  get paused(): boolean {
    return this.element.paused
  }

  on(ev: AudioEvent, fn: Listener): void {
    const s = this.listeners.get(ev) ?? new Set<Listener>()
    s.add(fn)
    this.listeners.set(ev, s)
  }

  off(ev: AudioEvent, fn: Listener): void {
    this.listeners.get(ev)?.delete(fn)
  }

  private emit(ev: AudioEvent): void {
    this.listeners.get(ev)?.forEach((fn) => fn())
  }
}

export const audioEngine = new AudioEngine()

export function mediaUrlFor(path: string): string {
  return `media://stream/${encodeURIComponent(path)}`
}