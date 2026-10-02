/**
 * Seeded PRNG for the character sheet. Every roll-path helper takes an optional trailing
 * `rng` that defaults to `mathRng`, so untouched callers (wardrobe, motion, migrations)
 * keep using Math.random while a seeded character roll is fully reproducible.
 */

export const SEED_MIN = 0
export const SEED_MAX = 2147483647

export function clampSeed(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return SEED_MIN
  return Math.max(SEED_MIN, Math.min(SEED_MAX, Math.round(n)))
}

export function randomSeed() {
  return Math.floor(Math.random() * (SEED_MAX + 1))
}

/** FNV-1a over `${seed}|${parts...}` so sub-streams never collide or shift each other. */
export function hashSeed(seed, ...parts) {
  const s = `${clampSeed(seed)}|${parts.map((p) => String(p)).join('|')}`
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function wrap(seed, next) {
  const rng = {
    seed,
    next,
    int(min, max) {
      const lo = Math.ceil(Math.min(min, max))
      const hi = Math.floor(Math.max(min, max))
      return Math.floor(next() * (hi - lo + 1)) + lo
    },
    chance(p) {
      return next() < p
    },
    pick(array) {
      if (!Array.isArray(array) || !array.length) return undefined
      return array[Math.floor(next() * array.length)]
    },
    /** Irwin–Hall n=3: bell-shaped, bounded, SD ≈ (max−min)·0.167. */
    bell(min, max) {
      const u = (next() + next() + next()) / 3
      return Math.round(min + u * (max - min))
    },
    weighted(options, weightOf) {
      const list = Array.isArray(options) ? options : []
      if (!list.length) return undefined
      const weights = list.map((o) => {
        const w = weightOf ? weightOf(o) : o?.weight ?? 1
        return Number.isFinite(w) && w > 0 ? w : 0
      })
      const total = weights.reduce((a, b) => a + b, 0)
      if (total <= 0) return list[Math.floor(next() * list.length)]
      let r = next() * total
      for (let i = 0; i < list.length; i++) {
        r -= weights[i]
        if (r <= 0) return list[i]
      }
      return list[list.length - 1]
    },
  }
  return rng
}

export function createRng(seed) {
  let a = clampSeed(seed) >>> 0
  return wrap(clampSeed(seed), () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  })
}

export const mathRng = wrap(null, () => Math.random())
