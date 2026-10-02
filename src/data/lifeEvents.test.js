import { describe, it, expect } from 'vitest'
import { LIFE_EVENT_TEMPLATES, TRAUMA_TEMPLATE_IDS, LEDGER_TONES, NON_WOUND_TONES, renderTemplate, templateEligible } from './lifeEvents'
import { LEDGER_WRITABLE_FIELDS } from '../utils/ledger'
import { findOption, getFieldOptions } from './options'
import { getDefaultCharacter } from './schemas'

describe('life event templates', () => {
  it('have unique ids, valid tones, sane age bands, and weights', () => {
    const ids = LIFE_EVENT_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(45)
    for (const t of LIFE_EVENT_TEMPLATES) {
      expect(LEDGER_TONES).toContain(t.tone)
      const [lo, hi] = t.ageBand
      expect(Number.isInteger(lo) && Number.isInteger(hi)).toBe(true)
      expect(lo).toBeGreaterThanOrEqual(0)
      expect(hi).toBeGreaterThanOrEqual(lo)
      expect(hi).toBeLessThanOrEqual(120)
      expect(t.weight).toBeGreaterThan(0)
      expect(t.title).toBeTruthy()
      expect(t.summary).toBeTruthy()
    }
  })

  it('every effect key is writable and every value is a real option id', () => {
    for (const t of LIFE_EVENT_TEMPLATES) {
      for (const [field, raw] of Object.entries(t.effects || {})) {
        expect(LEDGER_WRITABLE_FIELDS, `${t.id}:${field}`).toContain(field)
        for (const v of Array.isArray(raw) ? raw : [raw]) {
          expect(findOption(field, v), `${t.id}: ${field}=${v}`).not.toBeNull()
        }
      }
    }
  })

  it('requires reference real option ids', () => {
    for (const t of LIFE_EVENT_TEMPLATES) {
      const r = t.requires
      if (!r) continue
      for (const g of r.genre || []) expect(findOption('genre', g), g).not.toBeNull()
      for (const s of r.species || []) expect(findOption('species', s), s).not.toBeNull()
      for (const o of r.origin || []) expect(findOption('origin', o), o).not.toBeNull()
      for (const c of r.class || []) expect(findOption('socioeconomic_class', c), c).not.toBeNull()
    }
  })

  it('explains every trauma option with an event an 18-year-old could have had', () => {
    const traumas = getFieldOptions('trauma').map((o) => o.id).filter((id) => id !== 'Custom')
    expect(traumas.length).toBe(15)
    for (const id of traumas) {
      const tplIds = TRAUMA_TEMPLATE_IDS[id] || []
      expect(tplIds.length, id).toBeGreaterThanOrEqual(1)
      expect(tplIds.some((tid) => LIFE_EVENT_TEMPLATES.find((t) => t.id === tid).ageBand[0] <= 17), id).toBe(true)
    }
  })

  it('has at least 25% non-wound templates', () => {
    const nonWound = LIFE_EVENT_TEMPLATES.filter((t) => NON_WOUND_TONES.has(t.tone)).length
    expect(nonWound / LIFE_EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(0.25)
  })

  it('renders every template without leftover slots', () => {
    const c = { ...getDefaultCharacter(), name: 'Vex', origin: 'Urban Megacity', occupation: 'Tradesperson', species: 'Human' }
    for (const t of LIFE_EVENT_TEMPLATES) {
      const { title, summary } = renderTemplate(t, c, 12)
      expect(title).not.toMatch(/\{[a-z]+\}/)
      expect(summary).not.toMatch(/\{[a-z]+\}/)
      expect(summary).toContain('Vex')
    }
    const blank = renderTemplate(LIFE_EVENT_TEMPLATES[0], {}, 9)
    expect(blank.summary).not.toMatch(/\{[a-z]+\}/)
  })

  it('templateEligible honors requires and Mixed genre', () => {
    const lab = LIFE_EVENT_TEMPLATES.find((t) => t.id === 'the_lab_years')
    expect(templateEligible(lab, { genre: 'Fantasy' })).toBe(false)
    expect(templateEligible(lab, { genre: 'Sci-Fi' })).toBe(true)
    expect(templateEligible(lab, { genre: 'Mixed' })).toBe(true)
    expect(templateEligible(lab, {})).toBe(true)
    expect(templateEligible(lab, { genre: 'Sci-Fi' }, new Set(['the_lab_years']))).toBe(false)
    const fall = LIFE_EVENT_TEMPLATES.find((t) => t.id === 'the_fall_from_grace')
    expect(templateEligible(fall, { socioeconomic_class: 'Working poor' })).toBe(false)
    expect(templateEligible(fall, { socioeconomic_class: 'Wealthy' })).toBe(true)
    const promo = LIFE_EVENT_TEMPLATES.find((t) => t.id === 'the_promotion')
    expect(templateEligible(promo, { age: 20 })).toBe(false)
    expect(templateEligible(promo, { age: 40 })).toBe(true)
  })
})
