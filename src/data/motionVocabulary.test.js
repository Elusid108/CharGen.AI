import { describe, it, expect } from 'vitest'
import {
  CANONICAL_EXPRESSIONS,
  CANONICAL_GESTURES,
  EXPRESSION_IDS,
  GESTURE_IDS,
  isCanonicalId,
  expressionById,
  gestureById,
} from './motionVocabulary'

const ID_RE = /^[a-z][a-z0-9_]*$/

describe('motion vocabulary', () => {
  it('expression ids are unique, snake_case, and described', () => {
    const ids = CANONICAL_EXPRESSIONS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of CANONICAL_EXPRESSIONS) {
      expect(e.id).toMatch(ID_RE)
      expect(e.label).toBeTruthy()
      expect(e.description).toBeTruthy()
      expect(Array.isArray(e.tags)).toBe(true)
    }
  })

  it('gesture ids are unique, snake_case, and described', () => {
    const ids = CANONICAL_GESTURES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of CANONICAL_GESTURES) {
      expect(g.id).toMatch(ID_RE)
      expect(g.label).toBeTruthy()
      expect(g.description).toBeTruthy()
    }
  })

  it('expression and gesture ids do not overlap', () => {
    for (const id of EXPRESSION_IDS) expect(GESTURE_IDS.has(id)).toBe(false)
  })

  it('includes the baseline rest states', () => {
    expect(EXPRESSION_IDS.has('neutral')).toBe(true)
    expect(GESTURE_IDS.has('idle_sway')).toBe(true)
  })

  it('isCanonicalId respects track', () => {
    expect(isCanonicalId('expression', 'smile_soft')).toBe(true)
    expect(isCanonicalId('gesture', 'smile_soft')).toBe(false)
    expect(isCanonicalId('gesture', 'nod')).toBe(true)
    expect(isCanonicalId('pose', 'nod')).toBe(true)
    expect(isCanonicalId('speechSync', 'emphasis')).toBe(true)
    expect(isCanonicalId('speechSync', 'nod')).toBe(false)
    expect(isCanonicalId('bogus', 'nod')).toBe(false)
  })

  it('lookups return null for unknown ids', () => {
    expect(expressionById('neutral')?.label).toBe('Neutral')
    expect(expressionById('nope')).toBeNull()
    expect(gestureById('nod')?.label).toBe('Nod')
    expect(gestureById('nope')).toBeNull()
  })
})
