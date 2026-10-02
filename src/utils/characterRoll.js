/**
 * Pure character-sheet roll pipeline (no store, no IndexedDB). Every draw goes through the
 * supplied `rng`, so a seed + lockedFields reproduces a sheet exactly.
 */

import { CHARACTER_SECTIONS, getDefaultCharacter } from '../data/schemas'
import { randomRange, randomName } from '../data/randomPools'
import { normalizeSelectOptions, pickWeightedFrom } from '../data/options'
import { CUSTOM_ID } from '../data/options/shared'
import {
  genreWeightMultiplier,
  SILHOUETTE_TEMPLATES,
  extraversionToBattery,
  correlateChestAnatomy,
  correlateGenderExpression,
  correlateTransitionNote,
  correlateRomanticFromSexual,
  speciesSpecialFeatureWeight,
  HAIRLESS_SPECIES,
  OFTEN_HAIRLESS_SPECIES,
  apparentAgeFromChronological,
} from '../data/options/priors'
import { oceanWeightMultiplier, deriveFromOcean, OCEAN_IDS, OCEAN_DERIVED_IDS } from '../data/options/oceanDerivation'
import { localCustomText } from '../data/customPools'
import { mathRng } from './rng'

function buildFieldById() {
  const map = {}
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      map[field.id] = field
    })
  })
  return map
}

export const FIELD_BY_ID = buildFieldById()

/** Owned by correlations, never rolled directly. */
export const DERIVED_FIELD_IDS = new Set(['aging', 'battery', ...OCEAN_DERIVED_IDS])
/** Rolled before the rest of their section so derived/affinity-weighted fields can read them. */
export const ROLL_FIRST = [...OCEAN_IDS]
const BELL_RANGE_FIELDS = new Set(OCEAN_IDS)

export const REGION_FIELD_IDS = [
  'forearms', 'upper_arms', 'shoulders', 'neck', 'chest_size',
  'abs', 'back', 'glutes', 'upper_legs', 'lower_legs',
]
const TEMPLATED_FIELD_IDS = new Set([...REGION_FIELD_IDS, 'muscle_def', 'body_softness'])

export function optionWeightForField(field, option, character) {
  const genre = character?.genre || 'Mixed'
  const species = character?.species
  let w = option.weight ?? 1
  w *= genreWeightMultiplier(genre, field.id, option.id)
  w *= oceanWeightMultiplier(field.id, option.id, character)
  if (field.id === 'special_features' && species) {
    w *= speciesSpecialFeatureWeight(species, option.id)
  }
  if (species === 'Human' || species === 'Elf' || species === 'Dwarf') {
    if (field.id === 'skin_tone' && (option.id === 'Scaled' || option.id === 'Furred')) w *= 0.08
    if (
      field.id === 'skin_texture'
      && (option.id === 'Scaled' || option.id === 'Furred' || option.id === 'Chitin' || option.id === 'Crystalline' || option.id === 'Bark-like')
    ) {
      w *= 0.1
    }
  }
  return w
}

export function randomSelectValue(field, character = {}, rng = mathRng) {
  const options = normalizeSelectOptions(field.options)
  return pickWeightedFrom(options, (o) => optionWeightForField(field, o, character), rng)
}

export function pickLockedFromCharacter(character, lockedFields) {
  const out = {}
  Object.keys(lockedFields || {}).forEach((id) => {
    if (lockedFields[id]) out[id] = character[id]
  })
  return out
}

/** A locked, non-empty `*_custom` also locks its parent select so a roll cannot orphan it. */
export function effectiveLockedFields(lockedFields, character) {
  const out = { ...(lockedFields || {}) }
  for (const id of Object.keys(out)) {
    if (!out[id] || !id.endsWith('_custom')) continue
    const parent = id.slice(0, -'_custom'.length)
    if (FIELD_BY_ID[parent] && String(character?.[id] ?? '').trim()) out[parent] = true
  }
  return out
}

/** Random value for one schema field; undefined means "not rolled here". */
export function randomValueForField(field, { character = {}, rng = mathRng } = {}) {
  if (DERIVED_FIELD_IDS.has(field.id)) return undefined
  if (TEMPLATED_FIELD_IDS.has(field.id) && SILHOUETTE_TEMPLATES[character.silhouette]) return undefined
  switch (field.type) {
    case 'select':
      return randomSelectValue(field, character, rng)
    case 'range':
      return BELL_RANGE_FIELDS.has(field.id)
        ? rng.bell(field.min ?? 0, field.max ?? 100)
        : randomRange(field.min ?? 0, field.max ?? 100, rng)
    case 'number':
      if (field.id === 'age') return randomRange(18, 80, rng)
      return undefined
    case 'text':
      if (field.id === 'name') return randomName(rng)
      return undefined
    default:
      return undefined
  }
}

export function fieldSkippedForRandomize(field, lockedFields) {
  if (field.conditional) return true
  if (lockedFields[field.id]) return true
  return false
}

export function rollOrder(section) {
  const first = section.fields.filter((f) => ROLL_FIRST.includes(f.id))
  const rest = section.fields.filter((f) => !ROLL_FIRST.includes(f.id))
  return [...first, ...rest]
}

/** Ids a section roll is allowed to (re)compute — includes derived fields owned by correlations. */
export function sectionRollTargets(section, lockedFields) {
  return section.fields.filter((f) => !f.conditional && !lockedFields[f.id]).map((f) => f.id)
}

function fillLocalCustomTexts(out, lockedFields, rng, rolledSet) {
  for (const [id, field] of Object.entries(FIELD_BY_ID)) {
    if (field.type !== 'select' || out[id] !== CUSTOM_ID) continue
    if (rolledSet && !rolledSet.has(id)) continue
    const cid = `${id}_custom`
    if (!FIELD_BY_ID[cid] || lockedFields[cid]) continue
    if (String(out[cid] ?? '').trim()) continue
    const text = localCustomText(cid, out, rng)
    if (text) out[cid] = text
  }
}

/**
 * Deterministic post-roll pass. Draw order is fixed and every draw sits inside its gate so a
 * seed stays stable when unrelated fields change.
 */
export function applyRandomizeCorrelations(next, lockedFields, hints = {}, rng = mathRng) {
  const locked = (id) => !!lockedFields[id]
  const out = { ...next }
  const rolledSet = hints.rolled ? new Set(hints.rolled) : null
  const touched = (...ids) => !rolledSet || ids.some((id) => rolledSet.has(id))

  if (touched('aging', 'age', 'species') && !locked('aging') && out.age !== '' && out.age != null) {
    out.aging = apparentAgeFromChronological(out.age, out.species, rng)
  }

  const template = SILHOUETTE_TEMPLATES[out.silhouette]
  if (template && touched('silhouette', ...REGION_FIELD_IDS, 'muscle_def', 'body_softness')) {
    for (const [id, val] of Object.entries(template)) {
      if (locked(id)) continue
      if (id === 'muscle_def' || id === 'body_softness') {
        const [lo, hi] = val
        out[id] = randomRange(lo, hi, rng)
      } else {
        out[id] = val
      }
    }
    if (rng.chance(0.3)) {
      const pick = rng.pick(REGION_FIELD_IDS)
      const field = FIELD_BY_ID[pick]
      if (field && !locked(pick)) out[pick] = randomSelectValue(field, out, rng)
    }
  }

  const species = out.species
  if (touched('body_hair', 'mustache', 'beard', 'species')) {
    const forceNa = HAIRLESS_SPECIES.has(species) || (OFTEN_HAIRLESS_SPECIES.has(species) && rng.chance(0.55))
    if (forceNa) {
      if (!locked('body_hair')) out.body_hair = 'N/A (Non-Human)'
      if (!locked('mustache')) out.mustache = 'N/A (Non-Human)'
      if (!locked('beard')) out.beard = 'N/A (Non-Human)'
    }
  }

  if (touched('chest_anatomy', 'sex') && !locked('chest_anatomy') && out.sex) {
    out.chest_anatomy = correlateChestAnatomy(out.sex, rng)
  }

  if (touched('gender_expression', 'gender') && !locked('gender_expression') && out.gender && rng.chance(0.7)) {
    const expr = correlateGenderExpression(out.gender, rng)
    if (expr) out.gender_expression = expr
  }

  if (touched('transition_note', 'gender') && !locked('transition_note') && out.gender) {
    out.transition_note = correlateTransitionNote(out.gender, rng)
  }

  if (touched('romantic_orientation', 'orientation') && !locked('romantic_orientation') && out.orientation && rng.chance(0.75)) {
    const rom = correlateRomanticFromSexual(out.orientation, rng)
    if (rom) out.romantic_orientation = rom
  }

  if (touched('sexual_role', 'sex') && !locked('sexual_role') && (out.sex === 'None/Construct' || out.sex === 'Non-Applicable')) {
    if (rng.chance(0.75)) out.sexual_role = 'N/A'
  }

  if (touched('special_features', 'species') && !locked('special_features') && species === 'Human' && rng.chance(0.82)) {
    out.special_features = 'Fully humanoid baseline'
  }

  if (touched('battery', 'ocean_e') && !locked('battery') && out.ocean_e != null && out.ocean_e !== '') {
    out.battery = extraversionToBattery(out.ocean_e, rng)
  }

  Object.assign(out, deriveFromOcean(out, rng, {
    locked,
    touched: (id) => touched(id, ...OCEAN_IDS),
  }))

  fillLocalCustomTexts(out, lockedFields, rng, rolledSet)

  return out
}

/** Full local roll; locked values are copied from `character`. */
export function buildLocalRandomizedCharacter(lockedFields, character, rng = mathRng) {
  const nextCharacter = { ...getDefaultCharacter() }
  Object.keys(lockedFields || {}).forEach((id) => {
    if (lockedFields[id]) nextCharacter[id] = character[id]
  })
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    rollOrder(section).forEach((field) => {
      if (fieldSkippedForRandomize(field, lockedFields)) return
      const val = randomValueForField(field, { character: nextCharacter, rng })
      if (val !== undefined) nextCharacter[field.id] = val
    })
  })
  return applyRandomizeCorrelations(nextCharacter, lockedFields, {}, rng)
}

/** Roll one section against the current sheet; returns only the changed fields. */
export function rollSection(sectionKey, character, lockedFields, rng = mathRng) {
  const section = CHARACTER_SECTIONS[sectionKey]
  if (!section) return { updates: {}, rolled: [] }
  const draft = { ...character }
  const updates = {}
  rollOrder(section).forEach((field) => {
    if (fieldSkippedForRandomize(field, lockedFields)) return
    const val = randomValueForField(field, { character: draft, rng })
    if (val !== undefined) {
      updates[field.id] = val
      draft[field.id] = val
    }
  })
  const rolled = [...new Set([...sectionRollTargets(section, lockedFields), ...Object.keys(updates)])]
  const correlated = applyRandomizeCorrelations(draft, lockedFields, { rolled }, rng)
  Object.keys(correlated).forEach((id) => {
    if (lockedFields[id]) return
    if (correlated[id] !== character[id]) updates[id] = correlated[id]
  })
  return { updates, rolled }
}

/** Merge updates and clear `*_custom` when a select is no longer Custom (locked companions survive). */
export function mergeCharacterWithSelectCleanup(prev, updates, lockedFields = {}) {
  const merged = { ...prev, ...updates }
  for (const [id, val] of Object.entries(updates)) {
    const f = FIELD_BY_ID[id]
    if (f?.type !== 'select' || val === CUSTOM_ID) continue
    const cid = `${id}_custom`
    if (FIELD_BY_ID[cid] && !lockedFields[cid]) merged[cid] = ''
  }
  return merged
}

/** Drop orphan `*_custom` strings when the parent select is not Custom (locked companions survive). */
export function clearStaleCustomTexts(merged, lockedFields = {}) {
  const out = { ...merged }
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type !== 'select') return
      const customId = `${field.id}_custom`
      if (!FIELD_BY_ID[customId] || lockedFields[customId]) return
      if (out[field.id] !== CUSTOM_ID) out[customId] = ''
    })
  })
  return out
}

export function textFieldVisibleForMerged(merged, field) {
  if (!field.conditional) return true
  return merged[field.conditional.field] === field.conditional.value
}

/**
 * Text field ids an LLM enrich pass may fill.
 * @param {{ mode: 'all' | 'section', sectionKey?: string, rolledFieldIds?: string[], onlyBlank?: boolean }} context
 */
export function collectLlmTextFieldIds(mergedCharacter, lockedFields, context) {
  const { mode, sectionKey, rolledFieldIds, onlyBlank = false } = context
  const rolledSet = rolledFieldIds ? new Set(rolledFieldIds) : null
  const targets = []

  for (const [secKey, section] of Object.entries(CHARACTER_SECTIONS)) {
    if (mode === 'section' && secKey !== sectionKey) continue
    for (const field of section.fields) {
      if (field.type !== 'text') continue
      if (lockedFields[field.id]) continue
      if (!textFieldVisibleForMerged(mergedCharacter, field)) continue
      if (onlyBlank && String(mergedCharacter[field.id] ?? '').trim()) continue

      if (mode === 'all') {
        if (field.conditional) {
          if (mergedCharacter[field.conditional.field] === CUSTOM_ID) targets.push(field.id)
        } else {
          targets.push(field.id)
        }
      } else {
        const parentId = field.conditional?.field
        if (field.conditional) {
          if (mergedCharacter[parentId] !== CUSTOM_ID) continue
          if (rolledSet && !rolledSet.has(parentId)) continue
          targets.push(field.id)
        } else {
          if (rolledSet && !rolledSet.has(field.id)) continue
          targets.push(field.id)
        }
      }
    }
  }

  return [...new Set(targets)]
}

export function mergeLlmTextPatch(baseCharacter, patch, allowedIds) {
  const out = { ...baseCharacter }
  const allow = new Set(allowedIds)
  for (const id of allow) {
    if (!Object.prototype.hasOwnProperty.call(patch, id)) continue
    const v = patch[id]
    out[id] = v === null || v === undefined ? '' : String(v)
  }
  return out
}
