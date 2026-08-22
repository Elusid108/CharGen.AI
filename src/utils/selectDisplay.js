import { CUSTOM_ID } from '../data/options/shared'

/**
 * Resolve a select field to display text. Custom → companion `*_custom` string.
 * @param {Record<string, unknown>} c
 * @param {string} id
 */
export function selectDisplay(c, id) {
  const v = c?.[id]
  if (!v) return ''
  if (v === CUSTOM_ID) return String(c[`${id}_custom`] || '').trim()
  return String(v)
}

export { CUSTOM_ID }
