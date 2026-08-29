/**
 * Identity-lock resolution and clothing-mode helpers for image generation.
 */

import { getImageEndpointForModel } from './models'
import { selectDisplay } from './selectDisplay'

export const IDENTITY_LOCK_FALLBACK_ORDER = [
  'tpose', 'side', 'back', 'mannequin', 'profile', 'turnaround', 'fullbody',
]

/** Image types that show the body in underwear as a technical reference (full anatomy). */
export const BODY_LOCK_IMAGE_TYPES = new Set(['tpose', 'side', 'back', 'mannequin'])

/** Image types that wear Canonical default outfit or Thirst attire / wardrobe. */
export const CLOTHED_IMAGE_TYPES = new Set(['profile', 'outfit', 'chatphoto'])

export const CANONICAL_CLOTHING_NEGATIVES =
  'cropped shirt, midriff cutout, unbuttoned shirt revealing abs or chest, abs visible through clothing, wet t-shirt, transparent clothing, torn fabric revealing muscles, clothing cut to show anatomy, navel window'

export const CHAT_PHOTO_NEGATIVES =
  'T-pose, arms stretched out to the sides, turnaround sheet, character design reference, grey seamless background, solid studio backdrop, mannequin pose, catalog lighting, identical composition to the reference image, full-body technical orthographic'

export const WARDROBE_POSE_NEGATIVES =
  'T-pose, arms stretched out to the sides, character design reference sheet, turnaround sheet, orthographic technical pose'

/** Rear T-pose: stop copying front-plate wing/tail silhouettes onto a rotated torso. */
export const BACK_VIEW_OCCLUDER_NEGATIVES =
  'wings in front of the abdomen, chest-mounted wings, wings hidden behind the torso, ' +
  'wings pasted from a front view, face visible, pectorals facing camera, front of chest visible, ' +
  'tail growing from the stomach, occluders left in the front-lock screen position'

/** Face-first reference for texted photos; lock is identity fallback. */
export const CHAT_PHOTO_REFERENCE_ORDER = [
  'profile', 'profileCanonical', 'profileThirst', 'tpose', 'mannequin', 'side', 'back',
]

/** Library tiles prefer a portrait; body shots are fallbacks. */
export const LIBRARY_THUMB_ORDER = [
  'profile', 'profileCanonical', 'profileThirst', 'tpose', 'mannequin', 'side', 'back',
]

/**
 * Keep `profile` pointing at the Canonical or Thirst variant for the current mode.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @param {'canonical' | 'thirst'} presentationMode
 */
export function syncActiveProfileAlias(generatedImages, presentationMode = 'canonical') {
  const next = { ...(generatedImages || {}) }
  const slot = presentationMode === 'thirst' ? 'profileThirst' : 'profileCanonical'
  next.profile = next[slot] || next.profile || next.profileCanonical || next.profileThirst || null
  return next
}

/**
 * Old saves stored a single `profile`. Copy it into both variant slots.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @param {'canonical' | 'thirst'} presentationMode
 */
export function migrateProfileSlots(generatedImages, presentationMode = 'canonical') {
  const next = { ...(generatedImages || {}) }
  if (next.profile && !next.profileCanonical && !next.profileThirst) {
    next.profileCanonical = next.profile
    next.profileThirst = next.profile
  }
  if (!next.profileCanonical && next.profileThirst) next.profileCanonical = next.profileThirst
  if (!next.profileThirst && next.profileCanonical) next.profileThirst = next.profileCanonical
  return syncActiveProfileAlias(next, presentationMode)
}

/**
 * Canonical body lock, then weaker fallbacks when the lock has not been generated yet.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @returns {string | null}
 */
export function resolveIdentityLock(generatedImages) {
  if (!generatedImages) return null
  for (const key of IDENTITY_LOCK_FALLBACK_ORDER) {
    const v = generatedImages[key]
    if (v) return v
  }
  return null
}

const DORSAL_FEATURE_RE = /wing|tail|prehensile|feathered|membran|bat[\s-]?wing/i

/**
 * Wings, tails, and similar extras that must re-parent when the camera rotates 180°.
 * @param {Record<string, unknown> | null | undefined} character
 */
export function characterHasDorsalExtras(character) {
  const feat = selectDisplay(character, 'special_features')
  const custom = String(character?.special_features_custom || '')
  return DORSAL_FEATURE_RE.test(`${feat} ${custom}`)
}

/**
 * Which still to attach for a derived view.
 * Back prefers the side lock (90° is easier than 180° from a front plate).
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @param {string} imageType
 * @param {string | null} [frontLockOverride] freshly generated front lock (Generate All)
 * @returns {{ image: string | null, source: 'side' | 'front' | null }}
 */
export function resolveViewReference(generatedImages, imageType, frontLockOverride = null) {
  const images = generatedImages && typeof generatedImages === 'object' ? generatedImages : {}
  const front = images.tpose || frontLockOverride || resolveIdentityLock(images) || null

  if (imageType === 'back') {
    if (images.side) return { image: images.side, source: 'side' }
    return { image: front, source: front ? 'front' : null }
  }

  if (imageType === 'tpose') return { image: null, source: null }
  return { image: front, source: front ? 'front' : null }
}

/**
 * Prefer a portrait crop so chat photos do not inherit T-pose composition.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @returns {string | null}
 */
export function resolveChatPhotoReference(generatedImages, presentationMode = 'canonical') {
  if (!generatedImages) return null
  const preferred = presentationMode === 'thirst' ? 'profileThirst' : 'profileCanonical'
  const order = [preferred, ...CHAT_PHOTO_REFERENCE_ORDER]
  for (const key of order) {
    const v = generatedImages[key]
    if (v) return v
  }
  return null
}

/**
 * Face-first image for library tiles. Profile fills a square; body shots letterbox.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @returns {string | null}
 */
export function resolveLibraryThumbnail(generatedImages) {
  if (!generatedImages) return null
  for (const key of LIBRARY_THUMB_ORDER) {
    const v = generatedImages[key]
    if (v) return v
  }
  return null
}

/**
 * Wardrobe dress-up uses the relaxed mannequin pose when possible.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @returns {{ image: string | null, source: 'mannequin' | 'lock' | null }}
 */
export function resolveWardrobeReference(generatedImages) {
  if (!generatedImages) return { image: null, source: null }
  if (generatedImages.mannequin) {
    return { image: generatedImages.mannequin, source: 'mannequin' }
  }
  for (const key of IDENTITY_LOCK_FALLBACK_ORDER) {
    if (key === 'mannequin') continue
    const v = generatedImages[key]
    if (v) return { image: v, source: 'lock' }
  }
  return { image: null, source: null }
}

/**
 * Gemini generateContent image models can take an inline reference image; Imagen predict cannot.
 * @param {{ name: string, imageEndpoint?: 'predict' | 'generateContent' }[]} availableImageModels
 * @param {string} selectedImageModel
 */
export function modelSupportsReferenceImages(availableImageModels, selectedImageModel) {
  if (!availableImageModels?.length) {
    return true
  }
  return getImageEndpointForModel(availableImageModels, selectedImageModel) === 'generateContent'
}

/**
 * @param {string} imageType
 * @param {'canonical' | 'thirst'} presentationMode
 * @param {string} [userNegative]
 * @param {{ dorsalExtras?: boolean }} [extras]
 */
export function mergeNegativePrompt(imageType, presentationMode, userNegative, extras = {}) {
  const parts = []
  const user = String(userNegative ?? '').trim()
  if (user) parts.push(user)
  if (imageType === 'chatphoto') {
    parts.push(CHAT_PHOTO_NEGATIVES)
  }
  if (imageType === 'outfit') {
    parts.push(WARDROBE_POSE_NEGATIVES)
  }
  if (imageType === 'back' && extras.dorsalExtras) {
    parts.push(BACK_VIEW_OCCLUDER_NEGATIVES)
  }
  if (presentationMode === 'canonical' && CLOTHED_IMAGE_TYPES.has(imageType)) {
    parts.push(CANONICAL_CLOTHING_NEGATIVES)
  }
  return parts.join(', ')
}
