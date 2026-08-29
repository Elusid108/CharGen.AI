/**
 * Wardrobe draft helpers: line items, migration, prompt compile, dice.
 */

import { pickWeightedFrom } from '../data/options'
import { generateId } from './imageUtils'
import {
  CUSTOM_ID,
  NONE_ID,
  STYLE_TAG_IDS,
  STYLE_GENRE_WEIGHTS,
  WARDROBE_SLOT_CATALOGS,
  WARDROBE_ITEM_TYPES,
  WARDROBE_LOCATIONS,
  findWardrobeOption,
  slotForItemType,
  defaultLocationForType,
} from '../data/options/wardrobe'

const LOOK_NAME_RE = /^Look #(\d+)$/

const MODIFIER_SLOTS = ['palette', 'fabric', 'condition']
const ITEM_TYPE_IDS = WARDROBE_ITEM_TYPES.map((t) => t.id)

export function customFieldKey(slot) {
  return `custom${slot.charAt(0).toUpperCase()}${slot.slice(1)}`
}

export function emptyOutfitItem(overrides = {}) {
  const type = ITEM_TYPE_IDS.includes(overrides.type) ? overrides.type : 'top'
  const garment = typeof overrides.garment === 'string' ? overrides.garment : ''
  return {
    id: overrides.id || generateId(),
    style: STYLE_TAG_IDS.includes(overrides.style) ? overrides.style : 'Casual',
    type,
    garment,
    customGarment: typeof overrides.customGarment === 'string' ? overrides.customGarment : '',
    material: typeof overrides.material === 'string' ? overrides.material : '',
    customMaterial: typeof overrides.customMaterial === 'string' ? overrides.customMaterial : '',
    condition: typeof overrides.condition === 'string' ? overrides.condition : '',
    customCondition: typeof overrides.customCondition === 'string' ? overrides.customCondition : '',
    color: typeof overrides.color === 'string' ? overrides.color : '',
    customColor: typeof overrides.customColor === 'string' ? overrides.customColor : '',
    location: typeof overrides.location === 'string' && overrides.location
      ? overrides.location
      : defaultLocationForType(type, garment),
    customLocation: typeof overrides.customLocation === 'string' ? overrides.customLocation : '',
  }
}

export function emptyOutfitDraft() {
  return {
    name: '',
    styleTag: 'Casual',
    items: [],
  }
}

function normalizeOutfitItem(raw) {
  if (!raw || typeof raw !== 'object') return emptyOutfitItem()
  return emptyOutfitItem(raw)
}

function resolvedCatalogText(slot, id, customText) {
  if (!id || id === NONE_ID) return ''
  if (id === CUSTOM_ID) return String(customText || '').trim()
  const option = findWardrobeOption(slot, id)
  return String(option?.image || option?.label || id).trim()
}

function itemFromLegacySlot(type, garmentId, customText, shared) {
  if (!garmentId || garmentId === NONE_ID) return null
  return emptyOutfitItem({
    style: shared.style,
    type,
    garment: garmentId,
    customGarment: garmentId === CUSTOM_ID ? String(customText || '') : '',
    material: shared.material,
    customMaterial: shared.customMaterial,
    condition: shared.condition,
    customCondition: shared.customCondition,
    color: shared.color,
    customColor: shared.customColor,
    location: defaultLocationForType(type, garmentId),
  })
}

function legacySlotsToItems(raw) {
  const style = STYLE_TAG_IDS.includes(raw.styleTag) ? raw.styleTag : 'Casual'
  const shared = {
    style,
    material: typeof raw.fabric === 'string' ? raw.fabric : '',
    customMaterial: typeof raw.customFabric === 'string' ? raw.customFabric : '',
    condition: typeof raw.condition === 'string' ? raw.condition : '',
    customCondition: typeof raw.customCondition === 'string' ? raw.customCondition : '',
    color: typeof raw.palette === 'string' ? raw.palette : '',
    customColor: typeof raw.customPalette === 'string' ? raw.customPalette : '',
  }

  const items = []
  if (raw.occupancy === 'one-piece') {
    const one = itemFromLegacySlot('onePiece', raw.onePiece, raw.customOnePiece, shared)
    if (one) items.push(one)
  } else {
    const top = itemFromLegacySlot('top', raw.top, raw.customTop, shared)
    const bottom = itemFromLegacySlot('bottom', raw.bottom, raw.customBottom, shared)
    if (top) items.push(top)
    if (bottom) items.push(bottom)
  }

  const outer = itemFromLegacySlot('outerwear', raw.outerwear, raw.customOuterwear, shared)
  if (outer) items.push(outer)
  const feet = itemFromLegacySlot('footwear', raw.footwear, raw.customFootwear, shared)
  if (feet) items.push(feet)

  let accessories = raw.accessories
  if (Array.isArray(accessories)) {
    accessories = accessories.map(String).filter((id) => id && id !== NONE_ID)
  } else if (!accessories || accessories === NONE_ID) {
    accessories = []
  } else {
    accessories = [String(accessories)]
  }
  for (const id of accessories) {
    const acc = itemFromLegacySlot(
      'accessory',
      id,
      id === CUSTOM_ID ? raw.customAccessories : '',
      shared,
    )
    if (acc) items.push(acc)
  }
  return items
}

/**
 * Normalize a saved or in-progress outfit. Legacy slot recipes become `items[]`.
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function migrateOutfit(raw) {
  const base = emptyOutfitDraft()
  if (!raw || typeof raw !== 'object') return base

  let items
  if (Array.isArray(raw.items) && raw.items.length) {
    items = raw.items.map((row) => normalizeOutfitItem(row))
  } else {
    items = legacySlotsToItems(raw)
  }

  return {
    ...base,
    ...raw,
    name: typeof raw.name === 'string' ? raw.name : '',
    styleTag: STYLE_TAG_IDS.includes(raw.styleTag) ? raw.styleTag : 'Casual',
    items,
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

function resolvedLocationText(item) {
  const id = item.location
  if (!id || id === NONE_ID) return ''
  if (id === CUSTOM_ID) return String(item.customLocation || '').trim()
  const option = WARDROBE_LOCATIONS.find((o) => o.id === id)
  return String(option?.image || id).trim()
}

function compileItemPrompt(item) {
  const row = normalizeOutfitItem(item)
  const slot = slotForItemType(row.type)
  const garment = resolvedCatalogText(slot, row.garment, row.customGarment)
  if (!garment) return ''
  const bits = [garment]
  const color = resolvedCatalogText('palette', row.color, row.customColor)
  const material = resolvedCatalogText('fabric', row.material, row.customMaterial)
  const condition = resolvedCatalogText('condition', row.condition, row.customCondition)
  if (color) bits.push(color)
  if (material) bits.push(material)
  if (condition) bits.push(condition)
  const loc = resolvedLocationText(row)
  if (loc) bits.push(loc)
  if (row.style && row.style !== 'Casual') bits.push(`(${row.style} style)`)
  return bits.join(', ')
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
  for (const item of o.items || []) {
    const line = compileItemPrompt(item)
    if (line) parts.push(line)
  }
  return parts.filter(Boolean).join(' ')
}

export function outfitItemLabel(item) {
  const row = normalizeOutfitItem(item)
  const slot = slotForItemType(row.type)
  const garment = row.garment === CUSTOM_ID
    ? (String(row.customGarment || '').trim() || 'Custom')
    : (row.garment || '')
  const typeLabel = WARDROBE_ITEM_TYPES.find((t) => t.id === row.type)?.label || row.type
  const loc = row.location === CUSTOM_ID
    ? (String(row.customLocation || '').trim() || 'custom location')
    : row.location
  return [typeLabel, garment, loc].filter(Boolean).join(' · ')
}

export function outfitSlotLabel(outfit, slot) {
  const o = migrateOutfit(outfit)
  if (slot === 'styleTag') return o.styleTag || ''
  const type = slot === 'accessories' ? 'accessory' : slot
  const match = (o.items || []).find((item) => item.type === type)
  if (!match) return ''
  return outfitItemLabel(match)
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
    if (MODIFIER_SLOTS.includes(slot) || slot === 'location') return true
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

function rollItem(type, styleTag, presentationMode) {
  const slot = slotForItemType(type)
  const garment = pickId(poolForSlot(slot, styleTag, presentationMode))
  if (!garment || garment === NONE_ID) return null
  return emptyOutfitItem({
    style: styleTag,
    type,
    garment,
    material: pickId(poolForSlot('fabric', styleTag, presentationMode)),
    condition: pickId(poolForSlot('condition', styleTag, presentationMode)),
    color: pickId(poolForSlot('palette', styleTag, presentationMode)),
    location: defaultLocationForType(type, garment),
  })
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

  const prev = migrateOutfit(draft)
  const next = {
    ...prev,
    styleTag: isLocked(lockedFields, 'styleTag') ? prev.styleTag : pickStyleTag(genre),
  }
  const style = next.styleTag || 'Casual'

  if (!isLocked(lockedFields, 'items')) {
    const items = []
    const onePiece = Math.random() < 0.28
    if (onePiece) {
      const piece = rollItem('onePiece', style, presentationMode)
      if (piece) items.push(piece)
    } else {
      const top = rollItem('top', style, presentationMode)
      const bottom = rollItem('bottom', style, presentationMode)
      if (top) items.push(top)
      if (bottom) items.push(bottom)
    }
    if (Math.random() < 0.55) {
      const outer = rollItem('outerwear', style, presentationMode)
      if (outer) items.push(outer)
    }
    const feet = rollItem('footwear', style, presentationMode)
    if (feet) items.push(feet)
    const accRoll = Math.random()
    const accCount = accRoll < 0.32 ? 0 : accRoll < 0.78 ? 1 : 2
    for (let i = 0; i < accCount; i++) {
      const acc = rollItem('accessory', style, presentationMode)
      if (acc) items.push(acc)
    }
    next.items = items
  }

  if (assignName && isAutoLookName(next.name)) {
    next.name = `Look #${nextLookNumber(wardrobe)}`
  }

  return next
}

/**
 * Reroll one unlocked trait. Style dice also rerolls unlocked items so the recipe stays coherent.
 */
export function randomizeOutfitTrait(draft, traitId, lockedFields = {}, ctx = {}) {
  if (isLocked(lockedFields, traitId)) return migrateOutfit(draft)

  const base = migrateOutfit(draft)
  const genre = ctx.genre || 'Mixed'
  const noName = { ...ctx, assignName: false }

  if (traitId === 'styleTag') {
    const next = { ...base, styleTag: pickStyleTag(genre) }
    return randomizeOutfitDraft(next, { ...lockedFields, styleTag: true }, noName)
  }

  if (traitId === 'items') {
    return randomizeOutfitDraft(base, { ...lockedFields, styleTag: true }, noName)
  }

  return base
}

/**
 * Reroll one field on a line item (or the whole garment stack for that row).
 */
export function randomizeOutfitItem(item, field, ctx = {}) {
  const presentationMode = ctx.presentationMode || 'canonical'
  const row = normalizeOutfitItem(item)
  const style = row.style || ctx.styleTag || 'Casual'

  if (field === 'style') {
    const nextStyle = pickStyleTag(ctx.genre || 'Mixed')
    const rolled = rollItem(row.type, nextStyle, presentationMode)
    return rolled ? { ...rolled, id: row.id, style: nextStyle } : { ...row, style: nextStyle }
  }

  if (field === 'type') {
    const type = pickWeightedFrom(WARDROBE_ITEM_TYPES.map((t) => ({ id: t.id, weight: 1 })))
    const rolled = rollItem(type, style, presentationMode)
    return rolled ? { ...rolled, id: row.id } : { ...row, type }
  }

  if (field === 'garment') {
    const garment = pickId(poolForSlot(slotForItemType(row.type), style, presentationMode))
    return {
      ...row,
      garment,
      customGarment: '',
      location: defaultLocationForType(row.type, garment),
    }
  }

  if (field === 'material') {
    return { ...row, material: pickId(poolForSlot('fabric', style, presentationMode)), customMaterial: '' }
  }
  if (field === 'condition') {
    return { ...row, condition: pickId(poolForSlot('condition', style, presentationMode)), customCondition: '' }
  }
  if (field === 'color') {
    return { ...row, color: pickId(poolForSlot('palette', style, presentationMode)), customColor: '' }
  }
  if (field === 'location') {
    const loc = pickId(WARDROBE_LOCATIONS.filter((o) => o.id !== CUSTOM_ID))
    return { ...row, location: loc || defaultLocationForType(row.type, row.garment), customLocation: '' }
  }

  return row
}

export function garmentOptionsForType(type) {
  return WARDROBE_SLOT_CATALOGS[slotForItemType(type)] || []
}
