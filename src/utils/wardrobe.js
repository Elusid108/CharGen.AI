/**
 * Wardrobe draft helpers: look numbers, migration, prompt compile, lock-aware dice.
 */

import { pickWeightedFrom } from '../data/options'
import {
  CUSTOM_ID,
  NONE_ID,
  STYLE_TAG_IDS,
  STYLE_GENRE_WEIGHTS,
  WARDROBE_SLOT_CATALOGS,
  findWardrobeOption,
} from '../data/options/wardrobe'

const LOOK_NAME_RE = /^Look #(\d+)$/

const GARMENT_SLOTS = ['top', 'bottom', 'onePiece', 'outerwear', 'footwear']
const MODIFIER_SLOTS = ['palette', 'fabric', 'condition']

export function customFieldKey(slot) {
  return `custom${slot.charAt(0).toUpperCase()}${slot.slice(1)}`
}

export function emptyOutfitDraft() {
  return {
    name: '',
    styleTag: 'Casual',
    occupancy: 'separates',
    top: '',
    bottom: '',
    onePiece: '',
    outerwear: NONE_ID,
    footwear: '',
    accessories: [],
    palette: '',
    fabric: '',
    condition: '',
    customTop: '',
    customBottom: '',
    customOnePiece: '',
    customOuterwear: '',
    customFootwear: '',
    customAccessories: '',
    customPalette: '',
    customFabric: '',
    customCondition: '',
  }
}

/**
 * Normalize a saved or in-progress outfit to the expanded shape.
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function migrateOutfit(raw) {
  const base = emptyOutfitDraft()
  if (!raw || typeof raw !== 'object') return base

  let accessories = raw.accessories
  if (Array.isArray(accessories)) {
    accessories = accessories.map(String).filter((id) => id && id !== NONE_ID)
  } else if (!accessories || accessories === NONE_ID) {
    accessories = []
  } else {
    accessories = [String(accessories)]
  }

  return {
    ...base,
    ...raw,
    accessories,
    occupancy: raw.occupancy === 'one-piece' ? 'one-piece' : 'separates',
    outerwear: raw.outerwear || NONE_ID,
    onePiece: typeof raw.onePiece === 'string' ? raw.onePiece : '',
    palette: typeof raw.palette === 'string' ? raw.palette : '',
    fabric: typeof raw.fabric === 'string' ? raw.fabric : '',
    condition: typeof raw.condition === 'string' ? raw.condition : '',
    customTop: typeof raw.customTop === 'string' ? raw.customTop : '',
    customBottom: typeof raw.customBottom === 'string' ? raw.customBottom : '',
    customOnePiece: typeof raw.customOnePiece === 'string' ? raw.customOnePiece : '',
    customOuterwear: typeof raw.customOuterwear === 'string' ? raw.customOuterwear : '',
    customFootwear: typeof raw.customFootwear === 'string' ? raw.customFootwear : '',
    customAccessories: typeof raw.customAccessories === 'string' ? raw.customAccessories : '',
    customPalette: typeof raw.customPalette === 'string' ? raw.customPalette : '',
    customFabric: typeof raw.customFabric === 'string' ? raw.customFabric : '',
    customCondition: typeof raw.customCondition === 'string' ? raw.customCondition : '',
  }
}

export function isAutoLookName(name) {
  const trimmed = String(name || '').trim()
  return !trimmed || LOOK_NAME_RE.test(trimmed)
}

/** Max existing `Look #N` plus one (survives deletes). */
export function nextLookNumber(wardrobe) {
  let max = 0
  for (const outfit of wardrobe || []) {
    const match = String(outfit?.name || '').match(LOOK_NAME_RE)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
}

function resolvedSlotText(outfit, slot) {
  const id = outfit[slot]
  if (!id || id === NONE_ID) return ''
  if (id === CUSTOM_ID) return String(outfit[customFieldKey(slot)] || '').trim()
  const option = findWardrobeOption(slot, id)
  return String(option?.image || id).trim()
}

/**
 * Single clothing string for `outfitOverride` / `clothingPromptLines`.
 * @param {Record<string, unknown>} outfit
 */
export function compileOutfitPrompt(outfit) {
  const o = migrateOutfit(outfit)
  const parts = []
  const name = String(o.name || '').trim()
  const style = o.styleTag || 'Casual'
  parts.push(name ? `Outfit "${name}" (${style}).` : `Outfit (${style}).`)

  if (o.occupancy === 'one-piece') {
    const piece = resolvedSlotText(o, 'onePiece')
    if (piece) parts.push(piece)
  } else {
    const top = resolvedSlotText(o, 'top')
    const bottom = resolvedSlotText(o, 'bottom')
    if (top) parts.push(top)
    if (bottom) parts.push(bottom)
  }

  const outer = resolvedSlotText(o, 'outerwear')
  if (outer) parts.push(outer)
  const feet = resolvedSlotText(o, 'footwear')
  if (feet) parts.push(feet)

  const accessoryBits = []
  for (const id of o.accessories || []) {
    if (!id || id === NONE_ID) continue
    if (id === CUSTOM_ID) {
      const text = String(o.customAccessories || '').trim()
      if (text) accessoryBits.push(text)
    } else {
      const option = findWardrobeOption('accessories', id)
      accessoryBits.push(String(option?.image || id).trim())
    }
  }
  if (accessoryBits.length) parts.push(accessoryBits.join(', '))

  const palette = resolvedSlotText(o, 'palette')
  const fabric = resolvedSlotText(o, 'fabric')
  const condition = resolvedSlotText(o, 'condition')
  const mods = []
  if (palette) mods.push(`palette ${palette}`)
  if (fabric) mods.push(fabric)
  if (condition) mods.push(condition)
  if (mods.length) parts.push(mods.join(', '))

  return parts.filter(Boolean).join(' ')
}

export function outfitSlotLabel(outfit, slot) {
  const o = migrateOutfit(outfit)
  const id = o[slot]
  if (!id || id === NONE_ID) return ''
  if (id === CUSTOM_ID) return String(o[customFieldKey(slot)] || '').trim() || 'Custom'
  return String(id)
}

function isLocked(lockedFields, id) {
  return !!lockedFields?.[id]
}

function coverageAllowed(item, presentationMode) {
  if (presentationMode !== 'thirst' && item.coverage === 'revealing') return false
  return true
}

function poolForSlot(slot, styleTag, presentationMode) {
  const list = WARDROBE_SLOT_CATALOGS[slot] || []
  const diceable = list.filter((o) => o.id !== CUSTOM_ID)
  const styled = diceable.filter((o) => {
    if (!coverageAllowed(o, presentationMode)) return false
    if (MODIFIER_SLOTS.includes(slot)) return true
    if (o.id === NONE_ID) return true
    if (!styleTag || !o.styles?.length) return true
    return o.styles.includes(styleTag)
  })
  if (styled.length) return styled
  const covered = diceable.filter((o) => coverageAllowed(o, presentationMode) && o.id !== NONE_ID)
  if (covered.length) return covered
  return diceable.filter((o) => o.id !== NONE_ID)
}

function pickId(pool) {
  if (!pool.length) return ''
  return pickWeightedFrom(pool)
}

function pickStyleTag(genre) {
  const table = STYLE_GENRE_WEIGHTS[genre] || {}
  const options = STYLE_TAG_IDS.map((id) => ({
    id,
    weight: Number.isFinite(table[id]) ? table[id] : 1,
  }))
  return pickWeightedFrom(options)
}

function constrainOccupancy(lockedFields) {
  if (isLocked(lockedFields, 'top') || isLocked(lockedFields, 'bottom')) return 'separates'
  if (isLocked(lockedFields, 'onePiece')) return 'one-piece'
  return null
}

function pickAccessories(styleTag, presentationMode) {
  const pool = poolForSlot('accessories', styleTag, presentationMode)
  const roll = Math.random()
  const count = roll < 0.32 ? 0 : roll < 0.78 ? 1 : 2
  const picked = []
  const remaining = [...pool]
  for (let i = 0; i < count && remaining.length; i++) {
    const id = pickWeightedFrom(remaining)
    picked.push(id)
    const idx = remaining.findIndex((o) => o.id === id)
    if (idx >= 0) remaining.splice(idx, 1)
  }
  return picked
}

function clearStaleCustom(next, lockedFields) {
  const out = { ...next }
  for (const slot of [...GARMENT_SLOTS, ...MODIFIER_SLOTS]) {
    if (isLocked(lockedFields, slot)) continue
    if (out[slot] !== CUSTOM_ID) out[customFieldKey(slot)] = ''
  }
  if (!isLocked(lockedFields, 'accessories') && !(out.accessories || []).includes(CUSTOM_ID)) {
    out.customAccessories = ''
  }
  return out
}

/**
 * Reroll every unlocked visible trait. Locked values stay.
 * @param {Record<string, unknown>} draft
 * @param {Record<string, true>} [lockedFields]
 * @param {{ presentationMode?: string, genre?: string, wardrobe?: unknown[], assignName?: boolean }} [ctx]
 */
export function randomizeOutfitDraft(draft, lockedFields = {}, ctx = {}) {
  const {
    presentationMode = 'canonical',
    genre = 'Mixed',
    wardrobe = [],
    assignName = true,
  } = ctx

  let next = migrateOutfit(draft)
  const locked = (id) => isLocked(lockedFields, id)

  if (!locked('styleTag')) {
    next.styleTag = pickStyleTag(genre)
  }

  const forcedOccupancy = constrainOccupancy(lockedFields)
  if (!locked('occupancy')) {
    next.occupancy = forcedOccupancy || (Math.random() < 0.28 ? 'one-piece' : 'separates')
  } else if (forcedOccupancy && next.occupancy !== forcedOccupancy) {
    next.occupancy = forcedOccupancy
  }

  const style = next.styleTag || 'Casual'

  if (next.occupancy === 'one-piece') {
    if (!locked('onePiece')) next.onePiece = pickId(poolForSlot('onePiece', style, presentationMode))
    if (!locked('top')) next.top = ''
    if (!locked('bottom')) next.bottom = ''
  } else {
    if (!locked('top')) next.top = pickId(poolForSlot('top', style, presentationMode))
    if (!locked('bottom')) next.bottom = pickId(poolForSlot('bottom', style, presentationMode))
    if (!locked('onePiece')) next.onePiece = ''
  }

  if (!locked('outerwear')) {
    next.outerwear = pickId(poolForSlot('outerwear', style, presentationMode)) || NONE_ID
  }
  if (!locked('footwear')) {
    next.footwear = pickId(poolForSlot('footwear', style, presentationMode))
  }
  if (!locked('accessories')) {
    next.accessories = pickAccessories(style, presentationMode)
  }
  if (!locked('palette')) next.palette = pickId(poolForSlot('palette', style, presentationMode))
  if (!locked('fabric')) next.fabric = pickId(poolForSlot('fabric', style, presentationMode))
  if (!locked('condition')) next.condition = pickId(poolForSlot('condition', style, presentationMode))

  if (assignName && isAutoLookName(next.name)) {
    next.name = `Look #${nextLookNumber(wardrobe)}`
  }

  return clearStaleCustom(next, lockedFields)
}

/**
 * Reroll one unlocked trait. Style dice also rerolls unlocked garments so the recipe stays coherent.
 */
export function randomizeOutfitTrait(draft, traitId, lockedFields = {}, ctx = {}) {
  if (isLocked(lockedFields, traitId)) return migrateOutfit(draft)

  const base = migrateOutfit(draft)
  const presentationMode = ctx.presentationMode || 'canonical'
  const genre = ctx.genre || 'Mixed'
  const noName = { ...ctx, assignName: false }

  if (traitId === 'styleTag') {
    const next = { ...base, styleTag: pickStyleTag(genre) }
    return randomizeOutfitDraft(next, { ...lockedFields, styleTag: true }, noName)
  }

  if (traitId === 'occupancy') {
    const forced = constrainOccupancy(lockedFields)
    const occupancy = forced || (Math.random() < 0.28 ? 'one-piece' : 'separates')
    const next = { ...base, occupancy }
    return randomizeOutfitDraft(next, { ...lockedFields, occupancy: true, styleTag: true }, noName)
  }

  if (traitId === 'accessories') {
    return {
      ...base,
      accessories: pickAccessories(base.styleTag || 'Casual', presentationMode),
      customAccessories: '',
    }
  }

  const id = pickId(poolForSlot(traitId, base.styleTag || 'Casual', presentationMode))
  const next = { ...base, [traitId]: id }
  if (id !== CUSTOM_ID) next[customFieldKey(traitId)] = ''
  return next
}
