import { useEffect, useMemo, useState } from 'react'
import type { ArtworkColors } from '@shared/ipc'
import type { RGB } from '@renderer/visualizers/helpers'

const cache = new Map<string, ArtworkColors | null>()

export interface ArtworkColorState {
  primary: string | null
  secondary: string | null
  rgb1: RGB
  rgb2: RGB
}

const FALLBACK: RGB = [139, 124, 255]

function parseRgb(s: string): RGB | null {
  const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(s)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Read the effective value of a --dyn-* variable (stylesheet :root value
 * unless overridden inline) so non-CSS consumers match the theme. */
function readDynVar(name: string): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(v)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  return FALLBACK
}

/**
 * Fetches dominant colors for a track's artwork (cached) and, when `enabled`,
 * writes them to --dyn-1 / --dyn-2 CSS variables for ambient lighting.
 */
export function useArtworkColors(
  trackId: string | null | undefined,
  enabled: boolean
): ArtworkColorState {
  const cached = trackId ? cache.get(trackId) ?? null : null
  const [colors, setColors] = useState<ArtworkColors | null>(cached)

  useEffect(() => {
    if (!trackId) {
      setColors(null)
      return
    }
    if (cache.has(trackId)) {
      setColors(cache.get(trackId) ?? null)
      return
    }
    let on = true
    window.snjy
      .artworkColors(trackId)
      .then((c) => {
        cache.set(trackId, c)
        if (on) setColors(c)
      })
      .catch(() => {
        cache.set(trackId, null)
      })
    return () => {
      on = false
    }
  }, [trackId])

  const [dyn, setDyn] = useState<{ rgb1: RGB; rgb2: RGB }>({
    rgb1: readDynVar('--dyn-1'),
    rgb2: readDynVar('--dyn-2')
  })

  useEffect(() => {
    const root = document.documentElement
    if (enabled && colors) {
      const rgb1 = parseRgb(colors.primary)
      const rgb2 = parseRgb(colors.secondary)
      if (rgb1) root.style.setProperty('--dyn-1', `rgb(${rgb1[0]},${rgb1[1]},${rgb1[2]})`)
      if (rgb2) root.style.setProperty('--dyn-2', `rgb(${rgb2[0]},${rgb2[1]},${rgb2[2]})`)
    } else {
      // No inline override → the stylesheet :root values apply (user theme).
      root.style.removeProperty('--dyn-1')
      root.style.removeProperty('--dyn-2')
    }
    // Read the effective values so visualizer palettes match what CSS uses.
    setDyn({ rgb1: readDynVar('--dyn-1'), rgb2: readDynVar('--dyn-2') })
  }, [colors, enabled])

  return useMemo(() => {
    if (colors && enabled) {
      const r1 = parseRgb(colors.primary)
      const r2 = parseRgb(colors.secondary)
      return {
        primary: colors.primary,
        secondary: colors.secondary,
        rgb1: r1 ?? dyn.rgb1,
        rgb2: r2 ?? dyn.rgb2
      }
    }
    return { primary: null, secondary: null, rgb1: dyn.rgb1, rgb2: dyn.rgb2 }
  }, [colors, enabled, dyn])
}