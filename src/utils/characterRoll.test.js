import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRng } from './rng'
import {
  buildLocalRandomizedCharacter, rollSection, applyRandomizeCorrelations, effectiveLockedFields,
  clearStaleCustomTexts, mergeCharacterWithSelectCleanup, collectLlmTextFieldIds, FIELD_BY_ID, DERIVED_FIELD_IDS,
} from './characterRoll'
import { getDefaultCharacter, CHARACTER_SECTIONS } from '../data/schemas'
import { findOption } from '../data/options'
import { SILHOUETTE_TEMPLATES } from '../data/options/priors'

afterEach(() => vi.restoreAllMocks())

describe('seeded character roll', () => {
  it('is deterministic for a fixed seed and differs across seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const a = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
      const b = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
      expect(a).toEqual(b)
    }
    expect(buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(1)))
      .not.toEqual(buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(2)))
  })

  it('never touches Math.random during a seeded roll', () => {
    const spy = vi.spyOn(Math, 'random')
    buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(42))
    rollSection('psychology', getDefaultCharacter(), {}, createRng(42))
    expect(spy).not.toHaveBeenCalled()
  })

  it('every select resolves to a real option and every field is filled', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const c = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
      for (const section of Object.values(CHARACTER_SECTIONS)) {
        for (const f of section.fields) {
          if (f.type === 'select') {
            expect(c[f.id], `${f.id}@${seed}`).not.toBe('')
            expect(findOption(f.id, c[f.id]), `${f.id}=${c[f.id]}@${seed}`).not.toBeNull()
          }
          if (f.type === 'range') {
            expect(c[f.id]).toBeGreaterThanOrEqual(f.min ?? 0)
            expect(c[f.id]).toBeLessThanOrEqual(f.max ?? 100)
          }
        }
      }
      expect(c.name).toMatch(/\S+ \S+/)
      expect(c.age).toBeGreaterThanOrEqual(18)
      expect(c.aging).toBeGreaterThanOrEqual(1)
      expect(Math.abs(c.aging - c.age)).toBeLessThanOrEqual(40)
      for (const id of DERIVED_FIELD_IDS) expect(c[id], id).not.toBe('')
    }
  })

  it('honors locks, including a locked *_custom locking its parent', () => {
    const base = { ...getDefaultCharacter(), species: 'Custom', species_custom: 'Moth-folk', name: 'Keep Me', ocean_e: 7 }
    const locked = effectiveLockedFields({ species_custom: true, name: true, ocean_e: true }, base)
    expect(locked.species).toBe(true)
    const c = buildLocalRandomizedCharacter(locked, base, createRng(9))
    expect(c.species).toBe('Custom')
    expect(c.species_custom).toBe('Moth-folk')
    expect(c.name).toBe('Keep Me')
    expect(c.ocean_e).toBe(7)
    expect(clearStaleCustomTexts({ ...c, species: 'Human' }, locked).species_custom).toBe('Moth-folk')
    expect(clearStaleCustomTexts({ ...c, species: 'Human' }, {}).species_custom).toBe('')
    expect(mergeCharacterWithSelectCleanup(c, { species: 'Elf' }, locked).species_custom).toBe('Moth-folk')
  })

  it('applies silhouette templates without wasted draws and keeps regions coherent', () => {
    let templated = 0
    for (let seed = 1; seed <= 100; seed++) {
      const c = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
      const t = SILHOUETTE_TEMPLATES[c.silhouette]
      if (!t) continue
      templated += 1
      const [lo, hi] = t.muscle_def
      expect(c.muscle_def).toBeGreaterThanOrEqual(lo)
      expect(c.muscle_def).toBeLessThanOrEqual(hi)
    }
    expect(templated).toBeGreaterThan(0)
  })

  it('OCEAN rolls are bell-shaped and derived fields follow them', () => {
    let extreme = 0
    let eMatch = 0
    for (let seed = 1; seed <= 300; seed++) {
      const c = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
      if (c.ocean_e <= 10 || c.ocean_e >= 90) extreme += 1
      if ((c.ocean_e >= 70 && c.mbti[0] === 'E') || (c.ocean_e <= 30 && c.mbti[0] === 'I') || (c.ocean_e > 30 && c.ocean_e < 70)) eMatch += 1
    }
    expect(extreme / 300).toBeLessThan(0.1)
    expect(eMatch).toBe(300)
  })

  it('section roll re-derives owned fields and leaves other sections alone', () => {
    const base = buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(5))
    const { updates } = rollSection('psychology', base, {}, createRng(77))
    const psychIds = new Set(CHARACTER_SECTIONS.psychology.fields.map((f) => f.id))
    for (const id of Object.keys(updates)) {
      expect(psychIds.has(id) || id === 'battery', id).toBe(true)
    }
    expect(updates).toHaveProperty('mbti')
    const { updates: social } = rollSection('social', base, { battery: true }, createRng(8))
    expect(social).not.toHaveProperty('battery')
    const { updates: narrative } = rollSection('narrative', base, {}, createRng(8))
    expect(narrative).not.toHaveProperty('mbti')
    expect(narrative).not.toHaveProperty('battery')
  })

  it('fills local custom phrases only for rolled Custom selects', () => {
    const c = applyRandomizeCorrelations({ ...getDefaultCharacter(), quirk: 'Custom', genre: 'Modern' }, {}, {}, createRng(4))
    expect(c.quirk_custom).not.toBe('')
    const kept = applyRandomizeCorrelations({ ...getDefaultCharacter(), quirk: 'Custom', quirk_custom: 'Mine' }, {}, {}, createRng(4))
    expect(kept.quirk_custom).toBe('Mine')
    const lockedOut = applyRandomizeCorrelations({ ...getDefaultCharacter(), quirk: 'Custom' }, { quirk_custom: true }, {}, createRng(4))
    expect(lockedOut.quirk_custom).toBe('')
  })

  it('collectLlmTextFieldIds onlyBlank skips filled fields', () => {
    const c = { ...getDefaultCharacter(), name: 'Filled', quirk: 'Custom', quirk_custom: '', species: 'Custom', species_custom: 'Done' }
    const all = collectLlmTextFieldIds(c, {}, { mode: 'all' })
    expect(all).toEqual(expect.arrayContaining(['name', 'quirk_custom', 'species_custom']))
    const blank = collectLlmTextFieldIds(c, {}, { mode: 'all', onlyBlank: true })
    expect(blank).toEqual(['quirk_custom'])
    expect(FIELD_BY_ID.quirk_custom.type).toBe('text')
  })
})
