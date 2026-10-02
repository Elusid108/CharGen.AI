import { describe, it, expect } from 'vitest'
import { createRng } from './rng'
import {
  buildLedger, applyLedgerEffects, rerollLedgerEvent, addLedgerEvent, normalizeLedger, emptyLedger,
  renderLedgerForPrompt, LEDGER_MIN_EVENTS, LEDGER_MAX_EVENTS, LEDGER_HARD_CAP, LEDGER_WRITABLE_FIELDS,
} from './ledger'
import { buildLocalRandomizedCharacter } from './characterRoll'
import { getDefaultCharacter } from '../data/schemas'
import { findOption } from '../data/options'
import { NON_WOUND_TONES, LIFE_EVENT_BY_ID, templateEligible } from '../data/lifeEvents'

function sheet(seed) {
  return buildLocalRandomizedCharacter({}, getDefaultCharacter(), createRng(seed))
}

describe('buildLedger', () => {
  it('holds invariants across 500 seeded sheets', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const c = sheet(seed)
      const rng = createRng(seed * 7)
      const { events } = buildLedger(c, rng)
      expect(events.length).toBeGreaterThanOrEqual(LEDGER_MIN_EVENTS)
      expect(events.length).toBeLessThanOrEqual(LEDGER_MAX_EVENTS)
      for (let i = 1; i < events.length; i++) expect(events[i].age).toBeGreaterThanOrEqual(events[i - 1].age)
      for (const e of events) {
        expect(e.age).toBeLessThan(Number(c.age))
        expect(e.age).toBeGreaterThanOrEqual(0)
        expect(e.title).toBeTruthy()
        expect(e.summary).not.toMatch(/\{[a-z]+\}/)
        for (const x of e.effects) expect(findOption(x.field, x.value), `${x.field}=${x.value}`).not.toBeNull()
        if (!e.effects.some((x) => x.field === 'trauma')) {
          expect(templateEligible(LIFE_EVENT_BY_ID[e.templateId], c), `${e.templateId}@${seed}`).toBe(true)
        }
      }
      const traumaEvents = events.filter((e) => e.effects.some((x) => x.field === 'trauma'))
      if (c.trauma && c.trauma !== 'Custom') {
        expect(traumaEvents.length, `seed ${seed}`).toBe(1)
        expect(traumaEvents[0].effects.find((x) => x.field === 'trauma').value).toBe(c.trauma)
      }
      expect(new Set(events.map((e) => e.templateId)).size).toBe(events.length)
      const fields = events.flatMap((e) => e.effects.map((x) => x.field))
      expect(new Set(fields).size).toBe(fields.length)
      expect(events.some((e) => NON_WOUND_TONES.has(e.tone)), `seed ${seed}`).toBe(true)
    }
  })

  it('is deterministic for a fixed seed', () => {
    const c = sheet(3)
    expect(buildLedger(c, createRng(9))).toEqual(buildLedger(c, createRng(9)))
    expect(buildLedger(c, createRng(9))).not.toEqual(buildLedger(c, createRng(10)))
  })

  it('does not require a trauma event when trauma is Custom, and sets trauma when empty', () => {
    const custom = { ...sheet(4), trauma: 'Custom', trauma_custom: 'A thing' }
    const { events } = buildLedger(custom, createRng(1))
    expect(events.some((e) => e.effects.some((x) => x.field === 'trauma'))).toBe(false)
    const empty = { ...sheet(4), trauma: '' }
    const built = buildLedger(empty, createRng(1))
    const t = built.events.find((e) => e.effects.some((x) => x.field === 'trauma'))
    expect(t).toBeTruthy()
    const applied = applyLedgerEffects(empty, built.events, {}, { mode: 'fill' })
    expect(findOption('trauma', applied.trauma)).not.toBeNull()
  })

  it('keeps locked events and respects locked fields', () => {
    const c = sheet(5)
    const first = buildLedger(c, createRng(2))
    const kept = { ...first.events[1], locked: true }
    const second = buildLedger(c, createRng(3), { keep: [kept] })
    expect(second.events.find((e) => e.id === kept.id)).toEqual(kept)
    const keptFields = new Set(kept.effects.map((x) => x.field))
    for (const e of second.events) {
      if (e.id === kept.id) continue
      for (const x of e.effects) expect(keptFields.has(x.field)).toBe(false)
    }
    const lockedBuild = buildLedger(c, createRng(2), { lockedFields: { fear: true, lie: true } })
    for (const e of lockedBuild.events) for (const x of e.effects) expect(['fear', 'lie']).not.toContain(x.field)
  })

  it('older characters get more events on average', () => {
    let young = 0
    let old = 0
    for (let seed = 1; seed <= 60; seed++) {
      young += buildLedger({ ...sheet(seed), age: 19 }, createRng(seed)).events.length
      old += buildLedger({ ...sheet(seed), age: 60 }, createRng(seed)).events.length
    }
    expect(old).toBeGreaterThan(young)
  })
})

describe('applyLedgerEffects', () => {
  it('overwrite writes unlocked writable fields; fill only writes blanks; never writes locked', () => {
    const c = { ...getDefaultCharacter(), fear: 'Fire', lie: '' }
    const events = [{ effects: [{ field: 'fear', value: 'Drowning' }, { field: 'lie', value: 'Trust no one' }, { field: 'name', value: 'X' }, { field: 'goal', value: 'bogus' }] }]
    const over = applyLedgerEffects(c, events, {})
    expect(over.fear).toBe('Drowning')
    expect(over.lie).toBe('Trust no one')
    expect(over.name).toBe('')
    expect(over.goal).toBe('')
    const fill = applyLedgerEffects(c, events, {}, { mode: 'fill' })
    expect(fill.fear).toBe('Fire')
    expect(fill.lie).toBe('Trust no one')
    const locked = applyLedgerEffects(c, events, { fear: true, lie: true })
    expect(locked.fear).toBe('Fire')
    expect(locked.lie).toBe('')
  })
})

describe('reroll / add', () => {
  it('reroll keeps age and lock, swaps template, keeps trauma explained, updates sheet', () => {
    const c = sheet(6)
    const ledger = buildLedger(c, createRng(6))
    const i = ledger.events.findIndex((e) => e.effects.some((x) => x.field === 'trauma'))
    const before = ledger.events[i]
    ledger.events[i] = { ...before, locked: true }
    const { ledger: next, character } = rerollLedgerEvent(ledger, i, c, {}, createRng(99))
    const after = next.events.find((e) => e.age === before.age && e.locked)
    expect(after).toBeTruthy()
    expect(after.effects.find((x) => x.field === 'trauma').value).toBe(c.trauma)
    expect(character.trauma).toBe(c.trauma)
    expect(next.events.length).toBe(ledger.events.length)

    const j = ledger.events.findIndex((e) => !e.effects.some((x) => x.field === 'trauma'))
    const { ledger: n2, character: c2 } = rerollLedgerEvent(ledger, j, c, {}, createRng(5))
    const fields = n2.events.flatMap((e) => e.effects.map((x) => x.field))
    expect(new Set(fields).size).toBe(fields.length)
    expect(new Set(n2.events.map((e) => e.templateId)).size).toBe(n2.events.length)
    for (const e of n2.events) for (const x of e.effects) expect(findOption(x.field, x.value)).not.toBeNull()
    expect(Object.keys(c2).length).toBe(Object.keys(c).length)
  })

  it('reroll picks a different template whenever an alternative exists', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = sheet(seed)
      const ledger = buildLedger(c, createRng(seed))
      const i = ledger.events.findIndex((e) => !e.effects.some((x) => x.field === 'trauma'))
      const before = ledger.events[i]
      const { ledger: next } = rerollLedgerEvent(ledger, i, c, {}, createRng(seed + 1000))
      const after = next.events.find((e) => e.age === before.age) || next.events[i]
      expect(after.templateId, `seed ${seed}`).not.toBe(before.templateId)
    }
  })

  it('add inserts sorted at an unused age and caps at the hard limit', () => {
    const c = sheet(8)
    let ledger = buildLedger(c, createRng(8))
    const n = ledger.events.length
    const res = addLedgerEvent(ledger, c, {}, createRng(1))
    expect(res.ledger.events.length).toBe(n + 1)
    for (let i = 1; i < res.ledger.events.length; i++) expect(res.ledger.events[i].age).toBeGreaterThanOrEqual(res.ledger.events[i - 1].age)
    ledger = res.ledger
    for (let k = 0; k < 20; k++) ledger = addLedgerEvent(ledger, c, {}, createRng(k + 2)).ledger
    expect(ledger.events.length).toBeLessThanOrEqual(LEDGER_HARD_CAP)
  })
})

describe('normalize / render', () => {
  it('normalizeLedger survives garbage and preserves manual edits', () => {
    expect(normalizeLedger(null)).toEqual(emptyLedger())
    expect(normalizeLedger([])).toEqual(emptyLedger())
    expect(normalizeLedger({ events: 'x' })).toEqual(emptyLedger())
    const n = normalizeLedger({ events: [
      null, 'junk',
      { id: 'a', age: '19.6', title: 'Edited', summary: 'By hand', tone: 'nope', effects: [{ field: 'fear', value: 'Fire' }, { field: 'name', value: 'x' }, { field: 'lie' }], locked: 1 },
      { id: 'b', age: -4, tone: 'gift', effects: 'none' },
    ] })
    expect(n.events.length).toBe(2)
    expect(n.events[0].id).toBe('b')
    expect(n.events[0].age).toBe(0)
    expect(n.events[1].tone).toBe('turning')
    expect(n.events[1].age).toBe(20)
    expect(n.events[1].effects).toEqual([{ field: 'fear', value: 'Fire' }])
    expect(n.events[1].locked).toBe(true)
    expect(n.events[1].title).toBe('Edited')
    expect(LEDGER_WRITABLE_FIELDS).toContain('trauma')
  })

  it('renderLedgerForPrompt formats lines and is empty without events', () => {
    expect(renderLedgerForPrompt(emptyLedger())).toBe('')
    const s = renderLedgerForPrompt({ events: [{ age: 7, title: 'T', summary: 'S.' }, { age: 19, title: 'U', summary: 'V.' }] })
    expect(s).toBe('Age 7 — T: S.\nAge 19 — U: V.')
  })
})
