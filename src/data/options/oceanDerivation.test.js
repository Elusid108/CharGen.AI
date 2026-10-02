import { describe, it, expect } from 'vitest'
import { createRng } from '../../utils/rng'
import { findOption, getFieldOptions } from './index'
import {
  deriveMbti, deriveEnneagram, deriveAlignment, deriveFromOcean, oceanWeightMultiplier,
  describeDerivation, OCEAN_OPTION_AFFINITY, ALIGNMENT_NUDGES, ENNEAGRAM_PROFILES,
} from './oceanDerivation'

const P = (o, c, e, a, n) => ({ ocean_o: o, ocean_c: c, ocean_e: e, ocean_a: a, ocean_n: n })

function tally(fn, character, n, seed = 1) {
  const rng = createRng(seed)
  const counts = {}
  for (let i = 0; i < n; i++) {
    const v = fn(character, rng)
    counts[v] = (counts[v] || 0) + 1
  }
  return counts
}

describe('OCEAN derivation', () => {
  it('always yields real option ids', () => {
    const rng = createRng(3)
    for (let i = 0; i < 2000; i++) {
      const c = P(rng.int(0, 100), rng.int(0, 100), rng.int(0, 100), rng.int(0, 100), rng.int(0, 100))
      expect(findOption('mbti', deriveMbti(c, rng))).not.toBeNull()
      expect(findOption('enneagram', deriveEnneagram(c, rng))).not.toBeNull()
      expect(findOption('alignment', deriveAlignment(c, rng))).not.toBeNull()
    }
  })

  it('extreme profiles are near-deterministic', () => {
    expect(tally(deriveMbti, P(95, 95, 95, 95, 5), 200)).toEqual({ ENFJ: 200 })
    expect(Object.keys(tally(deriveMbti, P(50, 50, 5, 50, 50), 200)).every((k) => k.startsWith('I'))).toBe(true)
    const t8 = tally(deriveEnneagram, P(50, 65, 80, 20, 30), 1000)
    expect(t8['Type 8 (Challenger)'] / 1000).toBeGreaterThanOrEqual(0.85)
    const t5 = tally(deriveEnneagram, P(80, 55, 20, 35, 50), 1000)
    expect(t5['Type 5 (Investigator)'] / 1000).toBeGreaterThanOrEqual(0.85)
    const lg = tally(deriveAlignment, P(50, 90, 50, 90, 50), 1000)
    expect(lg['Lawful Good'] / 1000).toBeGreaterThanOrEqual(0.95)
  })

  it('letters track their slider', () => {
    const rng = createRng(11)
    let eHigh = 0, eHighTotal = 0, eLow = 0, eLowTotal = 0
    for (let i = 0; i < 5000; i++) {
      const c = P(rng.bell(0, 100), rng.bell(0, 100), rng.bell(0, 100), rng.bell(0, 100), rng.bell(0, 100))
      const m = deriveMbti(c, rng)
      if (c.ocean_e >= 60) { eHighTotal += 1; if (m[0] === 'E') eHigh += 1 }
      if (c.ocean_e <= 40) { eLowTotal += 1; if (m[0] === 'E') eLow += 1 }
    }
    expect(eHigh / eHighTotal).toBeGreaterThanOrEqual(0.85)
    expect(eLow / eLowTotal).toBeLessThanOrEqual(0.2)
  })

  it('every type, letter combo and alignment is reachable', () => {
    const rng = createRng(21)
    const seen = { mbti: new Set(), enneagram: new Set(), alignment: new Set() }
    for (let i = 0; i < 20000; i++) {
      const c = P(rng.int(0, 100), rng.int(0, 100), rng.int(0, 100), rng.int(0, 100), rng.int(0, 100))
      seen.mbti.add(deriveMbti(c, rng))
      seen.enneagram.add(deriveEnneagram(c, rng))
      seen.alignment.add(deriveAlignment(c, rng))
    }
    expect(seen.mbti.size).toBe(16)
    expect(seen.enneagram.size).toBe(9)
    expect(seen.alignment.size).toBe(9)
  })

  it('flat profile is True Neutral plurality; nudges tilt the axes', () => {
    const flat = tally(deriveAlignment, P(50, 50, 50, 50, 50), 2000)
    const top = Object.entries(flat).sort((a, b) => b[1] - a[1])[0][0]
    expect(top).toBe('True Neutral')
    const power = tally(deriveAlignment, { ...P(50, 50, 50, 35, 50), values: 'Power' }, 2000)
    const evil = Object.entries(power).filter(([k]) => k.endsWith('Evil')).reduce((s, [, v]) => s + v, 0)
    const good = Object.entries(power).filter(([k]) => k.endsWith('Good')).reduce((s, [, v]) => s + v, 0)
    expect(evil).toBeGreaterThan(good)
  })

  it('deriveFromOcean respects locked/touched', () => {
    const rng = createRng(2)
    const c = P(95, 95, 95, 95, 5)
    expect(Object.keys(deriveFromOcean(c, rng)).sort()).toEqual(['alignment', 'enneagram', 'mbti'])
    expect(deriveFromOcean(c, rng, { locked: (id) => id === 'mbti' })).not.toHaveProperty('mbti')
    expect(deriveFromOcean(c, rng, { touched: () => false })).toEqual({})
  })

  it('oceanWeightMultiplier clamps and is neutral for unknown fields', () => {
    expect(oceanWeightMultiplier('species', 'Human', P(0, 0, 0, 0, 0))).toBe(1)
    expect(oceanWeightMultiplier('personality', 'Shy', P(50, 50, 0, 50, 50))).toBeCloseTo(1.9, 5)
    expect(oceanWeightMultiplier('personality', 'Shy', P(50, 50, 100, 50, 50))).toBeCloseTo(0.15, 5)
    expect(oceanWeightMultiplier('personality', 'Shy', {})).toBe(1)
    for (const [field, table] of Object.entries(OCEAN_OPTION_AFFINITY)) {
      for (const id of Object.keys(table)) expect(findOption(field, id), `${field}:${id}`).not.toBeNull()
    }
  })

  it('every nudge and profile id is a real option', () => {
    for (const axis of Object.values(ALIGNMENT_NUDGES)) {
      for (const [field, table] of Object.entries(axis)) {
        for (const id of Object.keys(table)) expect(findOption(field, id), `${field}:${id}`).not.toBeNull()
      }
    }
    expect(ENNEAGRAM_PROFILES.map((p) => p.id).sort()).toEqual(getFieldOptions('enneagram').map((o) => o.id).sort())
  })

  it('describeDerivation returns stats for the three derived fields', () => {
    const c = P(72, 31, 60, 50, 50)
    expect(describeDerivation('mbti', c)).toHaveLength(4)
    expect(describeDerivation('mbti', c)[0].value).toContain('60 → 75% E')
    expect(describeDerivation('enneagram', c)).toHaveLength(3)
    expect(describeDerivation('alignment', c)).toHaveLength(2)
    expect(describeDerivation('species', c)).toEqual([])
  })
})
