import { describe, it, expect } from 'vitest'
import { compileMotionStyle, MOTION_TRAIT_TEXT, MOTION_OCEAN_BINS } from './motionBehavior'
import { EXPRESSION_IDS, GESTURE_IDS } from '../motionVocabulary'
import { getFieldOptions } from './index'
import { getDefaultCharacter } from '../schemas'

function assertBounded(style) {
  expect(style.pacingMsMultiplier).toBeGreaterThanOrEqual(0.4)
  expect(style.pacingMsMultiplier).toBeLessThanOrEqual(2.5)
  expect(style.amplitudeMultiplier).toBeGreaterThanOrEqual(0.3)
  expect(style.amplitudeMultiplier).toBeLessThanOrEqual(2.0)
  expect(style.gestureFrequencyMultiplier).toBeGreaterThan(0)
  expect(style.expressivenessScore).toBeGreaterThanOrEqual(5)
  expect(style.expressivenessScore).toBeLessThanOrEqual(100)
  expect(style.stillnessTolerance).toBeGreaterThanOrEqual(0)
  expect(style.stillnessTolerance).toBeLessThanOrEqual(100)
  for (const w of Object.values(style.preferredExpressionWeights)) expect(w).toBeGreaterThan(0)
  for (const w of Object.values(style.preferredGestureWeights)) expect(w).toBeGreaterThan(0)
}

describe('compileMotionStyle', () => {
  it('returns neutral multipliers for an empty / default character and never throws', () => {
    for (const c of [undefined, null, {}, getDefaultCharacter()]) {
      const s = compileMotionStyle(c)
      expect(s.pacingMsMultiplier).toBe(1)
      expect(s.amplitudeMultiplier).toBe(1)
      expect(s.expressivenessScore).toBe(50)
      expect(s.promptNotes).toEqual([])
      assertBounded(s)
    }
  })

  it('stays bounded at every OCEAN extreme', () => {
    const ids = ['ocean_o', 'ocean_c', 'ocean_e', 'ocean_a', 'ocean_n']
    for (const v of [0, 100, -50, 999, 'junk']) {
      const c = Object.fromEntries(ids.map((id) => [id, v]))
      assertBounded(compileMotionStyle(c))
    }
  })

  it('extraversion raises gesture frequency and amplitude; introversion lowers them', () => {
    const hi = compileMotionStyle({ ocean_e: 95 })
    const lo = compileMotionStyle({ ocean_e: 5 })
    expect(hi.gestureFrequencyMultiplier).toBeGreaterThan(lo.gestureFrequencyMultiplier)
    expect(hi.amplitudeMultiplier).toBeGreaterThan(lo.amplitudeMultiplier)
    expect(hi.expressivenessScore).toBeGreaterThan(lo.expressivenessScore)
  })

  it('composes multiple traits multiplicatively and collects notes', () => {
    const s = compileMotionStyle({ personality: 'Shy', battery: 'Deep Introvert', ocean_e: 10 })
    expect(s.amplitudeMultiplier).toBeLessThan(0.5)
    expect(s.gestureFrequencyMultiplier).toBeLessThan(0.4)
    expect(s.preferredGestureWeights.look_away).toBeGreaterThan(1)
    expect(s.promptNotes.length).toBeGreaterThanOrEqual(2)
  })

  it('surfaces a custom quirk as a prompt note', () => {
    const s = compileMotionStyle({ quirk: 'Custom', quirk_custom: 'Counts ceiling tiles' })
    expect(s.promptNotes.some((n) => n.includes('Counts ceiling tiles'))).toBe(true)
  })

  it('every weight key in the tables is a canonical id', () => {
    const check = (d) => {
      for (const id of Object.keys(d.expressionWeights || {})) expect(EXPRESSION_IDS.has(id), id).toBe(true)
      for (const id of Object.keys(d.gestureWeights || {})) expect(GESTURE_IDS.has(id), id).toBe(true)
    }
    Object.values(MOTION_OCEAN_BINS).flat().forEach(check)
    Object.values(MOTION_TRAIT_TEXT).forEach((table) => Object.values(table).forEach(check))
  })

  it('every option id in the tables exists in the real option lists', () => {
    for (const [fieldId, table] of Object.entries(MOTION_TRAIT_TEXT)) {
      const real = new Set(getFieldOptions(fieldId).map((o) => o.id))
      for (const optId of Object.keys(table)) expect(real.has(optId), `${fieldId}: ${optId}`).toBe(true)
    }
  })
})
