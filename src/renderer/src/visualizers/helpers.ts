export type RGB = [number, number, number]

export function rgba(c: RGB, a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Deterministic pseudo-random from an index — no allocation in hot loops. */
export function hash01(i: number, seed = 0): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return x - Math.floor(x)
}