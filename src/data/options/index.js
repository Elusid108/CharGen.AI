import { identityFieldOptions } from './identity'
import { physicalFieldOptions } from './physical'
import { faceFieldOptions } from './face'
import { movementFieldOptions } from './movement'
import { psychologyFieldOptions } from './psychology'
import { narrativeFieldOptions } from './narrative'
import { socialFieldOptions } from './social'
import { adultFieldOptions } from './adult'
import { normalizeSelectOptions, pickWeightedFrom } from './shared'

export { CUSTOM_ID, bodyPartOptions, normalizeSelectOptions, pickWeightedFrom } from './shared'

const FIELD_OPTIONS = {
  ...identityFieldOptions,
  ...physicalFieldOptions,
  ...faceFieldOptions,
  ...movementFieldOptions,
  ...psychologyFieldOptions,
  ...narrativeFieldOptions,
  ...socialFieldOptions,
  ...adultFieldOptions,
}

export function getFieldOptions(fieldId) {
  return FIELD_OPTIONS[fieldId] || []
}

export function findOption(fieldId, value) {
  if (value == null || value === '') return null
  const opts = getFieldOptions(fieldId)
  return opts.find((o) => o.id === value) ?? null
}

export function optionLabels(fieldId) {
  return getFieldOptions(fieldId).map((o) => o.label ?? o.id)
}

export function optionIds(fieldId) {
  return getFieldOptions(fieldId).map((o) => o.id)
}

export function selectOptionIds(options) {
  return normalizeSelectOptions(options).map((o) => o.id)
}

/**
 * @param {string} fieldId
 * @param {(option: { id: string, weight: number }) => number} [weightOf]
 */
export function pickWeightedOptionId(fieldId, weightOf) {
  return pickWeightedFrom(getFieldOptions(fieldId), weightOf)
}
