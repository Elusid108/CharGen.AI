/**
 * Life ledger: 3–7 formative events generated locally from `lifeEvents.js`, each resolving
 * to real option ids on the sheet. Runs AFTER the sheet roll and writes causal values back
 * into LEDGER_WRITABLE_FIELDS only; everything else on the sheet is upstream of it.
 */

import { CUSTOM_ID } from '../data/options/shared'
import { findOption } from '../data/options'
import {
  LIFE_EVENT_TEMPLATES, LIFE_EVENT_BY_ID, TRAUMA_TEMPLATE_IDS, LEDGER_TONES, NON_WOUND_TONES,
  templateEligible, renderTemplate,
} from '../data/lifeEvents'
import { mathRng } from './rng'

export const LEDGER_SCHEMA_VERSION = 1
export const LEDGER_MIN_EVENTS = 3
export const LEDGER_MAX_EVENTS = 7
export const LEDGER_HARD_CAP = 12
export const LEDGER_WRITABLE_FIELDS = [
  'trauma', 'fear', 'lie', 'attachment', 'coping', 'goal', 'desire', 'moral_code', 'prejudice',
  'scars', 'competency_2', 'competency_3', 'socioeconomic_class',
]
const WRITABLE = new Set(LEDGER_WRITABLE_FIELDS)
const AGE_BANDS = [[3, 12], [13, 19], [20, 120]]

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function characterAge(character) {
  const a = Number(character?.age)
  return Number.isFinite(a) && a >= 18 ? Math.min(120, Math.round(a)) : 25
}

export function emptyLedger() {
  return { schemaVersion: LEDGER_SCHEMA_VERSION, events: [] }
}

export function normalizeLedger(raw) {
  if (!isPlainObject(raw)) return emptyLedger()
  const events = (Array.isArray(raw.events) ? raw.events : [])
    .filter(isPlainObject)
    .map((e) => ({
      id: String(e.id || `ev${Math.random().toString(36).slice(2, 9)}`),
      templateId: String(e.templateId || ''),
      age: Math.max(0, Math.round(Number(e.age)) || 0),
      title: String(e.title || ''),
      summary: String(e.summary || ''),
      tone: LEDGER_TONES.includes(e.tone) ? e.tone : 'turning',
      effects: (Array.isArray(e.effects) ? e.effects : [])
        .filter((x) => isPlainObject(x) && WRITABLE.has(x.field) && typeof x.value === 'string' && x.value)
        .map((x) => ({ field: x.field, value: x.value })),
      tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
      locked: !!e.locked,
    }))
    .sort((a, b) => a.age - b.age)
    .slice(0, LEDGER_HARD_CAP)
  return { schemaVersion: LEDGER_SCHEMA_VERSION, events }
}

function claimedFields(events) {
  return new Set(events.flatMap((e) => e.effects.map((x) => x.field)))
}

function resolveEffects(tpl, lockedFields, rng) {
  const out = []
  for (const [field, raw] of Object.entries(tpl.effects || {})) {
    if (!WRITABLE.has(field) || lockedFields[field]) continue
    const value = Array.isArray(raw) ? rng.pick(raw) : raw
    if (value) out.push({ field, value })
  }
  return out
}

function makeEvent(tpl, age, character, lockedFields, rng, claimed = new Set()) {
  const { title, summary } = renderTemplate(tpl, character, age)
  return {
    id: `ev${rng.int(0, 2 ** 31 - 1).toString(36)}`,
    templateId: tpl.id,
    age,
    title,
    summary,
    tone: tpl.tone,
    effects: resolveEffects(tpl, lockedFields, rng).filter((x) => !claimed.has(x.field)),
    tags: [...(tpl.tags || [])],
    locked: false,
  }
}

function bandFor(tpl, maxAge, band) {
  const lo = Math.max(tpl.ageBand[0], band ? band[0] : 0)
  const hi = Math.min(tpl.ageBand[1], band ? band[1] : 120, maxAge)
  return lo <= hi ? [lo, hi] : null
}

function pickAge(tpl, maxAge, band, usedAges, rng) {
  const range = bandFor(tpl, maxAge, band) || bandFor(tpl, maxAge, null)
  if (!range) return Math.min(tpl.ageBand[0], maxAge)
  let age = rng.int(range[0], range[1])
  for (let i = 0; i < 20 && usedAges.has(age); i++) age = age < maxAge ? age + 1 : range[0]
  return age
}

function pickTemplate(pool, rng, weightOf) {
  return rng.weighted(pool, weightOf)
}

function effectFields(tpl) {
  return Object.keys(tpl.effects || {})
}

function overlapsNone(tpl, claimed) {
  return !effectFields(tpl).some((f) => claimed.has(f))
}

function overlapsSome(tpl, claimed) {
  return effectFields(tpl).some((f) => !claimed.has(f))
}

/**
 * @param {Record<string, unknown>} character — sheet AFTER roll/correlations
 * @param {object} rng
 * @param {{ count?: number, keep?: object[], lockedFields?: Record<string, true> }} [opts]
 */
export function buildLedger(character, rng = mathRng, opts = {}) {
  const lockedFields = opts.lockedFields || {}
  const maxAge = characterAge(character) - 1
  const keep = (opts.keep || []).map((e) => ({ ...e, effects: [...e.effects] }))
  const target = Math.max(
    LEDGER_MIN_EVENTS,
    Math.min(LEDGER_MAX_EVENTS, opts.count ?? (3 + (maxAge + 1 >= 30 ? 1 : 0) + (maxAge + 1 >= 45 ? 1 : 0) + (rng.chance(0.35) ? 1 : 0))),
  )
  const events = [...keep]
  const used = new Set(events.map((e) => e.templateId))
  const claimed = claimedFields(events)
  const usedAges = new Set(events.map((e) => e.age))
  const eligible = (tpl) => templateEligible(tpl, character, used) && tpl.ageBand[0] <= maxAge

  const push = (tpl, band) => {
    const age = pickAge(tpl, maxAge, band, usedAges, rng)
    const ev = makeEvent(tpl, age, character, lockedFields, rng, claimed)
    events.push(ev)
    used.add(tpl.id)
    usedAges.add(age)
    for (const x of ev.effects) claimed.add(x.field)
    for (const field of Object.keys(tpl.effects || {})) claimed.add(field)
  }

  // Trauma slot: the sheet's trauma must be explained by exactly one event.
  const trauma = character?.trauma
  const traumaExplained = events.some((e) => e.effects.some((x) => x.field === 'trauma'))
  if (!traumaExplained && events.length < target) {
    let pool = []
    if (trauma && trauma !== CUSTOM_ID && findOption('trauma', trauma)) {
      const ids = TRAUMA_TEMPLATE_IDS[trauma] || []
      pool = ids.map((id) => LIFE_EVENT_BY_ID[id]).filter((tpl) => tpl && eligible(tpl))
      if (!pool.length) pool = ids.map((id) => LIFE_EVENT_BY_ID[id]).filter((tpl) => tpl && !used.has(tpl.id))
    } else if (!trauma && !lockedFields.trauma) {
      pool = LIFE_EVENT_TEMPLATES.filter((tpl) => tpl.effects?.trauma && eligible(tpl))
    }
    if (pool.length) push(pickTemplate(pool, rng, (tpl) => tpl.weight), null)
  }

  // Fill the rest, cycling age bands so childhood/adolescence/adulthood are all represented.
  const bands = AGE_BANDS.filter((b) => b[0] <= maxAge)
  let bandIdx = rng.int(0, Math.max(0, bands.length - 1))
  for (let guard = 0; guard < 40 && events.length < target; guard++) {
    const band = bands.length ? bands[bandIdx % bands.length] : null
    bandIdx += 1
    const hasNonWound = events.some((e) => NON_WOUND_TONES.has(e.tone))
    const tones = new Set(events.map((e) => e.tone))
    const base = LIFE_EVENT_TEMPLATES.filter((tpl) => eligible(tpl) && !tpl.effects?.trauma)
    let pool = base.filter((tpl) => overlapsNone(tpl, claimed))
    if (!pool.length) pool = base.filter((tpl) => overlapsSome(tpl, claimed))
    if (!pool.length) break
    const tpl = pickTemplate(pool, rng, (tpl) => {
      let w = tpl.weight
      if (band && !bandFor(tpl, maxAge, band)) w *= 0.25
      if (tones.has(tpl.tone)) w *= 0.35
      if (!hasNonWound && NON_WOUND_TONES.has(tpl.tone)) w *= 1.6
      return w
    })
    push(tpl, band)
  }

  // Guarantee at least one non-wound event.
  if (!events.some((e) => NON_WOUND_TONES.has(e.tone))) {
    const idx = events.map((e, i) => (e.locked || e.effects.some((x) => x.field === 'trauma') ? -1 : i)).filter((i) => i >= 0).pop()
    if (idx != null) {
      const victim = events[idx]
      const freed = claimedFields(events.filter((e) => e !== victim))
      const base = LIFE_EVENT_TEMPLATES.filter((tpl) => NON_WOUND_TONES.has(tpl.tone) && templateEligible(tpl, character, used) && tpl.ageBand[0] <= maxAge)
      let pool = base.filter((tpl) => overlapsNone(tpl, freed))
      if (!pool.length) pool = base.filter((tpl) => overlapsSome(tpl, freed))
      if (pool.length) {
        const tpl = pickTemplate(pool, rng, (tpl) => tpl.weight)
        events[idx] = makeEvent(tpl, pickAge(tpl, maxAge, null, new Set([...usedAges].filter((a) => a !== victim.age)), rng), character, lockedFields, rng, freed)
      }
    }
  }

  events.sort((a, b) => a.age - b.age)
  return { schemaVersion: LEDGER_SCHEMA_VERSION, events }
}

/**
 * Write resolved effects into the sheet.
 * @param {{ mode?: 'overwrite' | 'fill' }} [opts] — 'fill' only writes empty fields
 */
export function applyLedgerEffects(character, events, lockedFields = {}, opts = {}) {
  const mode = opts.mode || 'overwrite'
  const out = { ...character }
  for (const ev of events || []) {
    for (const { field, value } of ev.effects || []) {
      if (!WRITABLE.has(field) || lockedFields[field]) continue
      if (mode === 'fill' && String(out[field] ?? '').trim()) continue
      if (!findOption(field, value)) continue
      out[field] = value
    }
  }
  return out
}

/** Replace one event with a new template at the same age; re-applies its effects. */
export function rerollLedgerEvent(ledger, index, character, lockedFields = {}, rng = mathRng) {
  const events = [...(ledger?.events || [])]
  const old = events[index]
  if (!old) return { ledger: normalizeLedger(ledger), character }
  const maxAge = characterAge(character) - 1
  const others = events.filter((_, i) => i !== index)
  // Exclude the current template too so a reroll visibly changes the event when any alternative exists.
  const used = new Set([...others.map((e) => e.templateId), old.templateId])
  const claimed = claimedFields(others)
  const explainsTrauma = old.effects.some((x) => x.field === 'trauma')
  const trauma = character?.trauma
  let pool
  if (explainsTrauma && trauma && trauma !== CUSTOM_ID && TRAUMA_TEMPLATE_IDS[trauma]) {
    const traumaPool = TRAUMA_TEMPLATE_IDS[trauma].map((id) => LIFE_EVENT_BY_ID[id]).filter(Boolean)
    pool = traumaPool.filter((tpl) => !used.has(tpl.id))
    if (!pool.length) pool = traumaPool.filter((tpl) => tpl.id === old.templateId)
  } else {
    const base = LIFE_EVENT_TEMPLATES.filter((tpl) => templateEligible(tpl, character, used) && !tpl.effects?.trauma && tpl.ageBand[0] <= maxAge)
    const atAge = base.filter((tpl) => tpl.ageBand[0] <= old.age && old.age <= tpl.ageBand[1])
    pool = atAge.filter((tpl) => overlapsNone(tpl, claimed))
    if (!pool.length) pool = atAge.filter((tpl) => overlapsSome(tpl, claimed))
    if (!pool.length) pool = base.filter((tpl) => overlapsSome(tpl, claimed))
  }
  if (!pool.length) return { ledger: normalizeLedger(ledger), character }
  const tpl = pickTemplate(pool, rng, (tpl) => tpl.weight)
  const age = tpl.ageBand[0] <= old.age && old.age <= tpl.ageBand[1] ? old.age : pickAge(tpl, maxAge, null, new Set(others.map((e) => e.age)), rng)
  const ev = { ...makeEvent(tpl, age, character, lockedFields, rng, claimed), locked: old.locked }
  events[index] = ev
  events.sort((a, b) => a.age - b.age)
  return {
    ledger: { schemaVersion: LEDGER_SCHEMA_VERSION, events },
    character: applyLedgerEffects(character, [ev], lockedFields, { mode: 'overwrite' }),
  }
}

/** Add one random event at an unused age. */
export function addLedgerEvent(ledger, character, lockedFields = {}, rng = mathRng) {
  const events = [...(ledger?.events || [])]
  if (events.length >= LEDGER_HARD_CAP) return { ledger: normalizeLedger(ledger), character }
  const maxAge = characterAge(character) - 1
  const used = new Set(events.map((e) => e.templateId))
  const claimed = claimedFields(events)
  const usedAges = new Set(events.map((e) => e.age))
  const base = LIFE_EVENT_TEMPLATES.filter((tpl) => templateEligible(tpl, character, used) && !tpl.effects?.trauma && tpl.ageBand[0] <= maxAge)
  let pool = base.filter((tpl) => overlapsNone(tpl, claimed))
  if (!pool.length) pool = base.filter((tpl) => overlapsSome(tpl, claimed))
  if (!pool.length) pool = base
  if (!pool.length) return { ledger: normalizeLedger(ledger), character }
  const tpl = pickTemplate(pool, rng, (tpl) => tpl.weight)
  const ev = makeEvent(tpl, pickAge(tpl, maxAge, null, usedAges, rng), character, lockedFields, rng, claimed)
  events.push(ev)
  events.sort((a, b) => a.age - b.age)
  return {
    ledger: { schemaVersion: LEDGER_SCHEMA_VERSION, events },
    character: applyLedgerEffects(character, [ev], lockedFields, { mode: 'overwrite' }),
  }
}

export function renderLedgerForPrompt(ledger, { max = LEDGER_HARD_CAP } = {}) {
  const events = (ledger?.events || []).slice(0, max)
  if (!events.length) return ''
  return events.map((e) => `Age ${e.age} — ${e.title}: ${e.summary}`).join('\n')
}
