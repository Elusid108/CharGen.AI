import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRng, mathRng, hashSeed, clampSeed, randomSeed, SEED_MAX, SEED_MIN } from './rng'

afterEach(() => vi.restoreAllMocks())

describe('rng', () => {
  it('same seed → identical sequence; different seed → different', () => {
    const a = createRng(123)
    const b = createRng(123)
    const c = createRng(124)
    const sa = Array.from({ length: 1000 }, () => a.next())
    const sb = Array.from({ length: 1000 }, () => b.next())
    const sc = Array.from({ length: 1000 }, () => c.next())
    expect(sa).toEqual(sb)
    expect(sa).not.toEqual(sc)
    for (const v of sa) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int is inclusive on both ends and never escapes', () => {
    const r = createRng(7)
    const seen = new Set()
    for (let i = 0; i < 10000; i++) {
      const v = r.int(3, 6)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6])
    expect(r.int(5, 5)).toBe(5)
  })

  it('bell is centered with rare but reachable extremes', () => {
    const r = createRng(99)
    let sum = 0
    let low = 0
    const n = 50000
    for (let i = 0; i < n; i++) {
      const v = r.bell(0, 100)
      sum += v
      if (v <= 10) low += 1
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    expect(Math.abs(sum / n - 50)).toBeLessThan(1)
    expect(low).toBeGreaterThan(0)
    expect(low / n).toBeLessThan(0.01)
  })

  it('weighted honors weights and falls back to uniform when all zero', () => {
    const r = createRng(5)
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 5000; i++) counts[r.weighted([{ id: 'a', weight: 9 }, { id: 'b', weight: 1 }]).id] += 1
    expect(counts.a / 5000).toBeGreaterThan(0.85)
    expect(r.weighted([{ id: 'x', weight: 0 }, { id: 'y', weight: 0 }])).toBeTruthy()
    expect(r.weighted([])).toBeUndefined()
    expect(r.pick([])).toBeUndefined()
  })

  it('hashSeed is stable and distinct per parts', () => {
    expect(hashSeed(1, 'sheet')).toBe(hashSeed(1, 'sheet'))
    expect(hashSeed(1, 'sheet')).not.toBe(hashSeed(1, 'ledger'))
    expect(hashSeed(1, 'section', 'identity', 0)).not.toBe(hashSeed(1, 'section', 'identity', 1))
    expect(hashSeed(2, 'sheet')).not.toBe(hashSeed(1, 'sheet'))
  })

  it('clampSeed / randomSeed stay within bounds', () => {
    expect(clampSeed(-5)).toBe(SEED_MIN)
    expect(clampSeed(1e12)).toBe(SEED_MAX)
    expect(clampSeed('junk')).toBe(SEED_MIN)
    expect(clampSeed('42.6')).toBe(43)
    for (let i = 0; i < 100; i++) {
      const s = randomSeed()
      expect(s).toBeGreaterThanOrEqual(SEED_MIN)
      expect(s).toBeLessThanOrEqual(SEED_MAX)
    }
  })

  it('mathRng delegates to Math.random', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.25)
    expect(mathRng.next()).toBe(0.25)
    expect(mathRng.int(0, 3)).toBe(1)
    expect(spy).toHaveBeenCalled()
  })
})
