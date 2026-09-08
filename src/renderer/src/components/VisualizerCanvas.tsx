import { useEffect, useMemo, useRef } from 'react'
import { VisualizationEngine } from '@renderer/visualizers/VisualizerEngine'
import type { Palette } from '@renderer/visualizers/VisualizerEngine'
import type { RGB } from '@renderer/visualizers/helpers'
import { audioEngine } from '@renderer/store/audio'
import { useUserData } from '@renderer/store/userData'

const VIZ_DEFAULT: Record<string, RGB> = {
  '--viz-a1': [139, 124, 255],
  '--viz-a2': [76, 201, 240],
  '--viz-bg': [7, 8, 12]
}

function readVizVar(name: string): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(v)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return VIZ_DEFAULT[name] ?? VIZ_DEFAULT['--viz-a1']
}

export function VisualizerCanvas({ className = '' }: { className?: string }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<VisualizationEngine | null>(null)

  const settings = useUserData((s) => s.settings)

  // Visualizer colors come from their own --viz-* CSS variables, completely
  // separate from the UI accent (--dyn-*) and from artwork colors.
  const palette: Palette = useMemo(
    () => ({
      a1: readVizVar('--viz-a1'),
      a2: readVizVar('--viz-a2'),
      bg: readVizVar('--viz-bg')
    }),
    []
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new VisualizationEngine(canvas)
    engineRef.current = engine
    engine.setAnalyser(audioEngine.getAnalyser())

    const parent = canvas.parentElement
    const measure = (): void => {
      if (parent) engine.resize(parent.clientWidth, parent.clientHeight, window.devicePixelRatio || 1)
    }
    measure()
    engine.start()

    const ro = new ResizeObserver(measure)
    if (parent) ro.observe(parent)

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) engine.start()
          else engine.stop()
        }
      },
      { rootMargin: '120px' }
    )
    io.observe(canvas)

    return () => {
      engine.stop()
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    engineRef.current?.setMode(settings.visualizerMode)
  }, [settings.visualizerMode])
  useEffect(() => {
    engineRef.current?.setAuto(settings.visualizerAuto)
  }, [settings.visualizerAuto])
  useEffect(() => {
    engineRef.current?.setLowPerf(settings.lowPerformanceMode)
  }, [settings.lowPerformanceMode])
  useEffect(() => {
    engineRef.current?.setSym(settings.spectrumSymmetry)
  }, [settings.spectrumSymmetry])
  useEffect(() => {
    engineRef.current?.setWaveStyle(settings.waveformStyle)
  }, [settings.waveformStyle])
  useEffect(() => {
    engineRef.current?.setPalette(palette)
  }, [palette])

  return <canvas ref={canvasRef} className={`viz-canvas ${className}`} aria-hidden />
}