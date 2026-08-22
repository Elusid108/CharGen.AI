/**
 * Identity-lock resolution and clothing-mode helpers for image generation.
 */

import { getImageEndpointForModel } from './models'

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

/** Face-first reference for texted photos; lock is identity fallback. */
export const CHAT_PHOTO_REFERENCE_ORDER = ['profile', 'tpose', 'mannequin', 'side', 'back']

/** Library tiles prefer a portrait; body shots are fallbacks. */
export const LIBRARY_THUMB_ORDER = ['profile', 'tpose', 'mannequin', 'side', 'back']

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

/**
 * Prefer a portrait crop so chat photos do not inherit T-pose composition.
 * @param {Record<string, string | null | undefined> | null | undefined} generatedImages
 * @returns {string | null}
 */
export function resolveChatPhotoReference(generatedImages) {
  if (!generatedImages) return null
  for (const key of CHAT_PHOTO_REFERENCE_ORDER) {
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
 */
export function mergeNegativePrompt(imageType, presentationMode, userNegative) {
  const parts = []
  const user = String(userNegative ?? '').trim()
  if (user) parts.push(user)
  if (imageType === 'chatphoto') {
    parts.push(CHAT_PHOTO_NEGATIVES)
  }
  if (imageType === 'outfit') {
    parts.push(WARDROBE_POSE_NEGATIVES)
  }
  if (presentationMode === 'canonical' && CLOTHED_IMAGE_TYPES.has(imageType)) {
    parts.push(CANONICAL_CLOTHING_NEGATIVES)
  }
  return parts.join(', ')
}
