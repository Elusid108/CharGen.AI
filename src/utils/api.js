/**
 * API utilities for Gemini (text + vision) and Imagen / Gemini image generation
 */

import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './modelConstants'
import { CHARACTER_SECTIONS } from '../data/schemas'
import { BODY_LOCK_IMAGE_TYPES, characterHasDorsalExtras } from './imageGeneration'
import { inferImageMime } from './imageUtils'
import {
  buildStoryBible,
  includeAdultInStoryBible,
  LENS_INSTRUCTIONS,
} from './storyBible'
import { selectDisplay } from './selectDisplay'
import { compileImageLine } from './compileCharacter'
import { optionLabels } from '../data/options'

// --- Text Generation (Gemini) ---

export async function generateText(apiKey, systemInstruction, userPrompt, options = {}) {
  const { temperature = 1.0, modelId = DEFAULT_TEXT_MODEL } = options
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`Gemini Error: ${data.error.message}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('No text returned from Gemini')

  return text
}

/**
 * Multi-turn chat completion (Gemini contents[] + system instruction).
 * @param {string} apiKey
 * @param {string} systemInstruction
 * @param {{ role: string, parts: unknown[] }[]} contents
 * @param {{ temperature?: number, modelId?: string }} [options]
 */
export async function generateChatReply(apiKey, systemInstruction, contents, options = {}) {
  const { temperature = 0.85, modelId = DEFAULT_TEXT_MODEL } = options
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`Gemini Error: ${data.error.message}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('No text returned from Gemini')

  return text
}

/**
 * Strip markdown code fences and parse the first JSON object from model text.
 * @param {string} text
 * @returns {object}
 */
export function parseJsonFromModelText(text) {
  let s = String(text).trim()
  const fenceMatch = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/im)
  if (fenceMatch) s = fenceMatch[1].trim()
  try {
    return JSON.parse(s)
  } catch {
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Model response did not contain valid JSON')
    }
    return JSON.parse(s.slice(start, end + 1))
  }
}

function buildTextFieldSpecSubset(schema, fieldIds) {
  const wanted = new Set(fieldIds)
  const fields = []
  for (const section of Object.values(schema)) {
    for (const field of section.fields) {
      if (field.type !== 'text' || !wanted.has(field.id)) continue
      const entry = { id: field.id, type: 'text', label: field.label }
      if (field.conditional) {
        entry.onlyWhen = { field: field.conditional.field, equals: field.conditional.value }
      }
      fields.push(entry)
    }
  }
  return fields
}

const CUSTOM_FIELDS_SYSTEM_PROMPT = `You are an expert character designer for fiction and games. You fill in specific text attributes for ONE character.

You MUST output a single JSON object only. No markdown, no code fences, no commentary before or after the JSON.

Rules:
- Your JSON must contain ONLY the keys the user lists. Do not add, rename, or omit required keys.
- Every value must be a non-empty creative string unless the field truly cannot apply (then use a minimal plausible string—avoid empty strings when the parent select is "Custom").
- Use the full character state provided as authoritative context: stay consistent with species, sex, gender, age, origin, psychology, narrative picks, and every other rolled attribute.
- Be specific and non-cliché; avoid generic placeholder phrases.`

/**
 * Ask Gemini to fill only the listed text / *_custom keys, using full character as context.
 * @param {object} schema — same shape as CHARACTER_SECTIONS
 * @param {string} modelId
 * @param {string} apiKey
 * @param {Record<string, unknown>} characterState — full sheet after local dice
 * @param {string[]} fieldIds — ids to generate (subset of text fields)
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateCustomFields(schema, modelId, apiKey, characterState, fieldIds) {
  const uniqueFieldIds = [...new Set(fieldIds || [])]
  if (!uniqueFieldIds.length) {
    throw new Error('generateCustomFields: fieldIds must be non-empty')
  }

  const fieldSpec = buildTextFieldSpecSubset(schema, uniqueFieldIds)
  if (fieldSpec.length !== uniqueFieldIds.length) {
    const got = new Set(fieldSpec.map((f) => f.id))
    const missing = uniqueFieldIds.filter((id) => !got.has(id))
    if (missing.length) {
      throw new Error(`generateCustomFields: unknown or non-text field ids: ${missing.join(', ')}`)
    }
  }

  const characterJson = JSON.stringify(characterState ?? {}, null, 2)
  const keysList = uniqueFieldIds.map((id) => `"${id}"`).join(', ')

  const userPrompt = `The character below was built with random dice rolls for selects, ranges, and numbers. Your job is to invent creative text ONLY for these keys: ${keysList}.

Return ONLY valid JSON (no markdown, no code fences) with exactly those keys as top-level properties.

Field details (text fields only):
${JSON.stringify(fieldSpec)}

Full current character (use as sole context—respect every attribute):
${characterJson}

Remember: output only the requested keys; each value must be a string.`

  const raw = await generateText(apiKey, CUSTOM_FIELDS_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.95,
    modelId,
  })

  try {
    const parsed = parseJsonFromModelText(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed JSON is not an object')
    }
    return parsed
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to parse custom-fields JSON: ${msg}`)
  }
}

// --- Vision Analysis (Gemini) ---

export async function analyzeImage(apiKey, base64Image, prompt, options = {}) {
  const { modelId = DEFAULT_TEXT_MODEL } = options
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  const payload = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image,
          }
        },
        { text: prompt }
      ]
    }],
    generationConfig: { temperature: 0.4 },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`Gemini Vision Error: ${data.error.message}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('No analysis returned from Gemini Vision')

  return text
}

function throwImageSafetyOrApiError(prefix, message) {
  const errMsg = (message || '').toLowerCase()
  if (errMsg.includes('safety') || errMsg.includes('blocked') || errMsg.includes('policy')) {
    throw new Error('Content safety filter triggered. Try adjusting your character description.')
  }
  throw new Error(`${prefix}: ${message || 'Unknown error'}`)
}

function extractInlineImageBase64(data) {
  const parts = data.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data
    const b64 = inline?.data
    if (b64) return b64
  }
  throw new Error('No image data in model response (unexpected response shape).')
}

/** Raw base64 + mime for Gemini inlineData; strips data URL prefix when present. */
function parseReferenceImageForGemini(referenceImageBase64) {
  const s = String(referenceImageBase64 ?? '').trim()
  if (!s) return null
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',')
    if (comma === -1) return null
    const meta = s.slice(5, comma)
    const mimeType = meta.split(';')[0]?.trim() || inferImageMime(s)
    const data = s.slice(comma + 1).replace(/\s/g, '')
    return data ? { mimeType, data } : null
  }
  const data = s.replace(/\s/g, '')
  return data ? { mimeType: inferImageMime(data), data } : null
}

// --- Image Generation (Imagen predict or Gemini generateContent) ---

function collectReferenceImages(options) {
  const list = []
  if (Array.isArray(options.referenceImagesBase64)) {
    for (const img of options.referenceImagesBase64) {
      if (img) list.push(img)
    }
  }
  if (options.referenceImageBase64) list.push(options.referenceImageBase64)
  return list
}

export async function generateImage(apiKey, prompt, options = {}) {
  const {
    aspectRatio = '1:1',
    negativePrompt = '',
    modelId = DEFAULT_IMAGE_MODEL,
    imageEndpoint = 'predict',
    seed = null,
  } = options

  const seedValue = seed == null || seed === '' ? null : Number(seed)
  const seedInt = Number.isFinite(seedValue) ? Math.max(0, Math.min(2147483647, Math.round(seedValue))) : null

  if (imageEndpoint === 'generateContent') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

    const parts = []
    for (const img of collectReferenceImages(options)) {
      const ref = parseReferenceImageForGemini(img)
      if (ref) {
        parts.push({
          inlineData: {
            mimeType: ref.mimeType,
            data: ref.data,
          },
        })
      }
    }
    parts.push({ text: prompt })

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
        ...(seedInt != null ? { seed: seedInt } : {}),
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (data.error) {
      throwImageSafetyOrApiError('Gemini Image Error', data.error.message)
    }

    return extractInlineImageBase64(data)
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${apiKey}`

  const payload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      ...(negativePrompt ? { negativePrompt } : {}),
      ...(seedInt != null ? { seed: seedInt } : {}),
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (data.error) {
    throwImageSafetyOrApiError('Imagen Error', data.error.message)
  }

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error('No image data returned. The prompt may have triggered a content filter.')
  }

  return data.predictions[0].bytesBase64Encoded
}

// --- Prompt helpers: translate numeric stats to visual descriptions ---

function groomingLineRejected(t) {
  return /^None /i.test(t) || t === 'N/A (Non-Human)'
}

const IDENTITY_PROMPT_SKIP = new Set([
  'name', 'orientation', 'romantic_orientation', 'archetype', 'species', 'sex', 'gender', 'age',
  'default_outfit', 'genre', 'occupation', 'socioeconomic_class',
  'competency_1', 'competency_2', 'competency_3', 'transition_note',
])

const SILHOUETTE_BODY_PARTS = new Set([
  'body_hair', 'forearms', 'upper_arms', 'shoulders', 'neck', 'chest_size', 'chest_anatomy',
  'abs', 'back', 'glutes', 'upper_legs', 'lower_legs', 'silhouette', 'body_softness',
])

const COVERAGE_CANONICAL =
  'CLOTHING COVERAGE (mandatory): All garments are intact, opaque, and fully closed as designed. ' +
  'No cropped tops, midriff cutouts, unbuttoned shirts, wet or transparent fabric, tears, or windows cut into clothing to reveal musculature. ' +
  'Do not reshape fabric to outline individual abdominal muscles. Anatomy may influence how clothing hangs, but skin of the torso stays covered unless the outfit description explicitly leaves that area uncovered.'

/**
 * @param {Record<string, unknown>} c
 * @param {{ clothingMode: 'canonical' | 'thirst' | 'none', outfitOverride?: string | null }} opts
 * @returns {string[]}
 */
function clothingPromptLines(c, { clothingMode, outfitOverride }) {
  const originDisplay = selectDisplay(c, 'origin')
  const fromOverride = typeof outfitOverride === 'string' ? outfitOverride.trim() : ''

  if (fromOverride) {
    const lines = [
      `Clothing and coverage (must match exactly): ${fromOverride}.`,
      'CRITICAL: All visible garments must correspond to the clothing described above—do not substitute a different outfit.',
    ]
    if (clothingMode === 'canonical') {
      lines.push(COVERAGE_CANONICAL)
    }
    if (originDisplay) {
      lines.push(
        `Materials, weathering, and design of the clothing and gear must heavily reflect this character's origin (${originDisplay}).`
      )
    }
    return lines
  }

  if (clothingMode === 'none') {
    return [
      'Clothing and coverage (must match exactly): simple fitted underwear or briefs only. No shirt, no outerwear, no costume.',
      'This is a technical body-reference shot for identity lock and outfit design.',
    ]
  }

  if (clothingMode === 'thirst') {
    const attire = selectDisplay(c, 'attire')
    if (attire) {
      const lines = [
        `Clothing and coverage (must match exactly): ${attire}.`,
        'CRITICAL: All visible garments must correspond to the clothing described above—do not substitute a different outfit.',
      ]
      if (originDisplay) {
        lines.push(
          `Materials, weathering, and design of the clothing and gear must heavily reflect this character's origin (${originDisplay}).`
        )
      }
      return lines
    }
    return [
      'Clothing and coverage (must match exactly): simple fitted underwear or briefs only. Not nude.',
    ]
  }

  const outfit = selectDisplay(c, 'default_outfit')
  const lines = []
  if (outfit) {
    lines.push(`Clothing and coverage (must match exactly): ${outfit}.`)
  } else {
    const originBit = originDisplay ? ` appropriate to their origin (${originDisplay})` : ''
    lines.push(
      `Clothing and coverage (must match exactly): simple opaque closed everyday garments${originBit}. Fully clothed; no intimate or revealing attire.`
    )
  }
  lines.push(COVERAGE_CANONICAL)
  if (originDisplay && outfit) {
    lines.push(
      `Materials, weathering, and design of the clothing and gear must heavily reflect this character's origin (${originDisplay}).`
    )
  }
  return lines
}

/**
 * Observable visual description from schema-driven sections.
 * @param {Record<string, unknown>} characterState
 * @param {{
 *   omitAttire?: boolean,
 *   clothingMode?: 'canonical' | 'thirst' | 'none',
 *   bodyDetail?: 'full' | 'silhouette',
 *   outfitOverride?: string | null,
 * }} [options]
 */
export function buildDetailedPhysicalPrompt(characterState, options = {}) {
  const {
    omitAttire = false,
    clothingMode: clothingModeOpt,
    bodyDetail: bodyDetailOpt,
    outfitOverride = null,
  } = options
  const clothingMode = clothingModeOpt ?? (omitAttire ? 'none' : 'canonical')
  const bodyDetail = bodyDetailOpt ?? (clothingMode === 'canonical' ? 'silhouette' : 'full')
  const c = characterState
  const parts = []
  const extra = { bodyDetail }

  const species = selectDisplay(c, 'species') || 'human'
  const sex = selectDisplay(c, 'sex')
  const gender = String(c.gender || '')
  const age = c.age !== '' && c.age != null ? String(c.age) : ''
  const apparent = c.aging !== '' && c.aging != null ? String(c.aging) : ''

  let opener = `Subject is ${species}`
  if (gender === 'Man' || gender === 'Transgender Man') opener += ', a man'
  else if (gender === 'Woman' || gender === 'Transgender Woman') opener += ', a woman'
  else if (gender && gender !== 'Custom') opener += `, ${gender}`
  if (sex && sex !== 'Non-Applicable') opener += `, ${sex} anatomy`
  if (age) opener += `, chronological age ${age}`
  if (apparent) opener += `, apparent age around ${apparent}`
  parts.push(`${opener}.`)

  const expressionLine = compileImageLine('gender_expression', c, extra)
  if (expressionLine) parts.push(expressionLine)

  const pushSelectLine = (field, wrapSilhouette = false) => {
    if (field.conditional || field.type !== 'select') return
    const display = selectDisplay(c, field.id)
    if ((field.id === 'mustache' || field.id === 'beard') && groomingLineRejected(display)) return
    if (field.id === 'body_hair' && (display === 'N/A (Non-Human)' || bodyDetail === 'silhouette')) return
    const line = compileImageLine(field.id, c, extra)
    if (!line) return
    let out = line
    if (wrapSilhouette && bodyDetail === 'silhouette' && SILHOUETTE_BODY_PARTS.has(field.id)) {
      out =
        `Build under closed clothing — ${line} ` +
        'Suggest this through garment drape only; do not cut, open, or wet clothing to show this anatomy.'
    }
    if (field.id === 'scars' && display.toLowerCase().includes('implosion')) {
      out += ' Render as raised, keloid, or indented skin texture rather than mere discoloration.'
    }
    if (field.id === 'special_features' && display.toLowerCase().includes('sub-dermal')) {
      out += ' Render as surgically embedded into the anatomy with skin tension and biomechanical texture.'
    }
    parts.push(out)
  }

  CHARACTER_SECTIONS.identity.fields.forEach((field) => {
    if (IDENTITY_PROMPT_SKIP.has(field.id)) return
    pushSelectLine(field)
  })

  CHARACTER_SECTIONS.face.fields.forEach((field) => {
    if (field.id === 'aging') return
    pushSelectLine(field)
  })

  CHARACTER_SECTIONS.physical.fields.forEach((field) => {
    if (field.type === 'select') {
      pushSelectLine(field, true)
      return
    }
    if (field.type === 'range') {
      const line = compileImageLine(field.id, c, extra)
      if (line) parts.push(line)
    }
  })

  const glisten = compileImageLine('sweat_glisten', c, extra)
  if (glisten) parts.push(glisten)

  clothingPromptLines(c, { clothingMode, outfitOverride }).forEach((line) => parts.push(line))

  return parts.join(' ')
}

const IDENTITY_LOCK_INSTRUCTION =
  'IDENTITY LOCK: The attached image is the canonical appearance of this exact character. ' +
  'Match face, body, skin, hair, and proportions exactly. Change only pose, camera framing, or clothing as specified. ' +
  'Do not invent a different person.'

const BACK_IDENTITY_LOCK_FRONT =
  'IDENTITY LOCK (REAR VIEW): The attached image is the SAME person (skin, hair, musculature, wing/tail type). ' +
  'It is a FRONT still — not a pose or layering template. Mentally rotate the body 180 degrees around the vertical axis. ' +
  'Do not paste the reference\'s left/right wing or tail silhouettes onto this frame. ' +
  'Do not invent a different person.'

const BACK_IDENTITY_LOCK_SIDE =
  'IDENTITY LOCK (REAR VIEW): The attached image is a LEFT PROFILE of this exact person. ' +
  'Rotate the camera 90 degrees to stand directly behind them. Keep skin, hair, musculature, and wing/tail type. ' +
  'Wings and tails stay on the dorsal back — after this rotation they are closest to the camera, not hidden behind the torso. ' +
  'Do not invent a different person.'

function dorsalCameraNotes(imageType, character) {
  if (!characterHasDorsalExtras(character)) return ''
  if (imageType === 'back') {
    return (
      'DORSAL EXTRAS (mandatory): Wings insert on the scapulae of the UPPER BACK. Tails insert at the coccyx. ' +
      'From this rear camera the dorsal surfaces and attachment roots are IN FRONT of the torso (closest to camera). ' +
      'The chest, face, and navel are not visible. Do not leave wings or tails in the front-view screen position.'
    )
  }
  if (imageType === 'side') {
    return (
      'DORSAL EXTRAS: In this left profile, wings and tails stay on the BACK of the body, behind the torso. ' +
      'Do not attach them to the chest or abdomen.'
    )
  }
  return ''
}

const WARDROBE_MANNEQUIN_INSTRUCTION =
  'POSE LOCK: The attached image is this character in their dress-up stance. ' +
  'Keep the same relaxed standing pose, camera height, crop, and body. ' +
  'Change only the clothing to the specified outfit. Do not switch to a T-pose. Do not stretch the arms out to the sides.'

const WARDROBE_FROM_LOCK_INSTRUCTION =
  'The attached image is identity only (face, body, skin, hair). ' +
  'Put them in a relaxed natural standing pose with arms down — not a T-pose. ' +
  'Dress them in the specified outfit. Do not copy outstretched arms or a technical reference pose.'

/**
 * @param {Record<string, unknown>} character
 * @param {string} [imageType]
 * @param {{
 *   artStyle?: string,
 *   lighting?: string,
 *   mood?: string,
 *   presentationMode?: 'canonical' | 'thirst',
 *   hasReferenceImage?: boolean,
 *   referenceView?: 'side' | 'front' | null,
 *   outfitOverride?: string | null,
 *   extraNegative?: string,
 *   poseReference?: 'mannequin' | 'lock' | null,
 * }} [styleModifiers]
 */
export function buildImagePrompt(character, imageType = 'profile', styleModifiers = {}) {
  const parts = []
  const {
    artStyle = '',
    lighting = '',
    mood = '',
    presentationMode = 'canonical',
    hasReferenceImage = false,
    referenceView = null,
    outfitOverride = null,
    extraNegative = '',
    poseReference = null,
  } = styleModifiers

  const isBodyLock = BODY_LOCK_IMAGE_TYPES.has(imageType)
  const clothingMode = isBodyLock
    ? 'none'
    : (presentationMode === 'thirst' ? 'thirst' : 'canonical')
  const bodyDetail = isBodyLock || clothingMode === 'thirst' ? 'full' : 'silhouette'

  const physical = buildDetailedPhysicalPrompt(character, {
    clothingMode,
    bodyDetail,
    outfitOverride: (imageType === 'outfit' || imageType === 'profile') ? outfitOverride : null,
  })
  parts.push(`A highly detailed character concept art. ${physical}`)

  if (hasReferenceImage) {
    if (imageType === 'outfit') {
      parts.push(
        poseReference === 'mannequin'
          ? WARDROBE_MANNEQUIN_INSTRUCTION
          : WARDROBE_FROM_LOCK_INSTRUCTION
      )
    } else if (imageType === 'back') {
      parts.push(referenceView === 'side' ? BACK_IDENTITY_LOCK_SIDE : BACK_IDENTITY_LOCK_FRONT)
    } else {
      parts.push(IDENTITY_LOCK_INSTRUCTION)
    }
  }

  if (character.personality) {
    parts.push(`Their facial expression conveys a ${character.personality} demeanor.`)
  }

  switch (imageType) {
    case 'profile':
      parts.push('Framing: Head and shoulders portrait, 1:1 square aspect ratio. Solid dark background.')
      break
    case 'tpose':
      parts.push(
        'Framing: Single character, full body, camera facing the front only. ' +
        'Symmetrical T-pose: both arms extended straight out to the sides, palms facing forward, ' +
        'legs shoulder-width apart, standing centered. One figure only — not a three-view sheet. ' +
        'Clean neutral grey background. Technical character design / identity-lock FRONT reference.'
      )
      break
    case 'side':
      parts.push(
        'Framing: Single character, full body, STRICT left-side view (90 degrees). Camera on their left. ' +
        'Same symmetrical T-pose as the front lock: both arms extended straight out, legs shoulder-width apart. ' +
        'True profile silhouette — one eye, ear, and nose; you must not see the chest square-on. ' +
        'One figure only. Not a three-view sheet. Not front-facing. ' +
        'Clean neutral grey background. Technical character design / identity-lock SIDE reference.'
      )
      {
        const dorsal = dorsalCameraNotes('side', character)
        if (dorsal) parts.push(dorsal)
      }
      break
    case 'back':
      parts.push(
        'Framing: Single character, full body, STRICT rear view (180 degrees). Camera behind them. ' +
        'Same symmetrical T-pose as the front lock: both arms extended straight out, legs shoulder-width apart. ' +
        'Face is not visible — back of head, nape, scapulae, spine, and the BACK of the body. ' +
        'One figure only. Not a three-view sheet. Not front-facing. ' +
        'Clean neutral grey background. Technical character design / identity-lock BACK reference.'
      )
      {
        const dorsal = dorsalCameraNotes('back', character)
        if (dorsal) parts.push(dorsal)
      }
      break
    case 'mannequin':
      parts.push(
        'Framing: Full body, neutral standing pose (not a T-pose) wearing only simple fitted underwear/briefs. ' +
        'Arms relaxed at the sides or loosely at rest. Clean solid light grey background. ' +
        'Like a mannequin or dress-up doll reference for designing outfits onto. ' +
        'Same body as the identity lock; only the pose changes.'
      )
      break
    case 'outfit':
      parts.push(
        'Framing: Full body, relaxed natural standing pose with arms down (not a T-pose), ' +
        'showing the complete outfit clearly. Solid dark background.'
      )
      break
    default:
      parts.push('Solid dark cinematic background.')
  }

  let styleStr = 'Style: High quality digital concept art, 8k resolution, detailed.'
  if (artStyle) styleStr += ` ${artStyle}.`
  if (lighting) styleStr += ` ${lighting}.`
  if (mood) styleStr += ` ${mood}.`
  parts.push(styleStr)

  const avoid = String(extraNegative ?? '').trim()
  if (avoid) {
    parts.push(`Avoid the following: ${avoid}.`)
  }

  return parts.join(' ')
}

const CHAT_PHOTO_IDENTITY_INSTRUCTION =
  'The first attached image is ONLY who this person is (face, hair, skin, body type). ' +
  'Match that reference\'s rendering style, medium, finish, and stylization exactly. ' +
  'Ignore its pose, crop, and background. ' +
  'Do not copy a T-pose, arms stretched to the sides, grey seamless backdrop, or character-sheet composition.'

const CHAT_PHOTO_EDIT_INSTRUCTION =
  'A later attached image is a previous photo of the same person. ' +
  'Keep their identity and the same art style. Apply the requested change. Do not turn it into a character sheet.'

/**
 * Candid-moment prompt for chat photos — style-locked to the identity reference.
 * @param {Record<string, unknown>} character
 * @param {string} picDescription
 * @param {{
 *   presentationMode?: 'canonical' | 'thirst',
 *   hasReferenceImage?: boolean,
 *   hasPriorPhoto?: boolean,
 *   extraNegative?: string,
 *   artStyle?: string,
 *   lighting?: string,
 *   mood?: string,
 *   outfitOverride?: string | null,
 * }} [styleModifiers]
 */
export function buildChatPhotoPrompt(character, picDescription, styleModifiers = {}) {
  const {
    presentationMode = 'canonical',
    hasReferenceImage = false,
    hasPriorPhoto = false,
    extraNegative = '',
    artStyle = '',
    lighting = '',
    mood = '',
    outfitOverride = null,
  } = styleModifiers
  const scene = String(picDescription || '').trim()
    || 'a casual candid photo of this person in the current moment'
  const clothingMode = presentationMode === 'thirst' ? 'thirst' : 'canonical'
  const bodyDetail = clothingMode === 'thirst' ? 'full' : 'silhouette'
  const physical = buildDetailedPhysicalPrompt(character, {
    clothingMode,
    bodyDetail,
    outfitOverride,
  })

  const parts = [
    'A candid in-the-moment photo. Match the attached identity reference\'s rendering style, medium, finish, and stylization exactly — same look as that image, not a different medium.',
    `What the photo shows: ${scene}`,
    'Candid framing: selfie, mirror shot, friend-took-this, or an in-person snapshot. Head and shoulders or torso. A real place that fits the description. Not a T-pose, mannequin, or character sheet. Not a seamless studio backdrop unless the scene is a studio.',
  ]
  if (hasReferenceImage) parts.push(CHAT_PHOTO_IDENTITY_INSTRUCTION)
  if (hasPriorPhoto) parts.push(CHAT_PHOTO_EDIT_INSTRUCTION)
  parts.push(physical)
  parts.push('Same person as the reference. Completely different pose, camera, and setting than any T-pose or mannequin shot.')

  let styleStr = 'Keep the same stylization as the reference.'
  if (artStyle) styleStr += ` ${artStyle}.`
  if (lighting) styleStr += ` ${lighting}.`
  if (mood) styleStr += ` ${mood}.`
  parts.push(styleStr)

  const avoid = String(extraNegative ?? '').trim()
  if (avoid) parts.push(`Avoid the following: ${avoid}.`)
  return parts.join(' ')
}

// --- Backstory Generation ---

export async function generateNarrativeHooks(apiKey, character, options = {}) {
  const { tone = 'Simple', genre = 'High Fantasy', lensId = 'wanted', modelId } = options
  const bible = buildStoryBible(character, { includeAdult: includeAdultInStoryBible(tone) })
  const lens = LENS_INSTRUCTIONS[lensId] || LENS_INSTRUCTIONS.wanted

  const systemInstruction = `You invent three distinct story hooks for one character. Output JSON only.

Rules:
- Return a single JSON object: { "hooks": ["...", "...", "..."] } with exactly three strings.
- Each hook is ONE sentence. No titles, no numbering inside the strings.
- The three hooks must be different angles, not paraphrases.
- Do not name MBTI, Enneagram, alignment, or OCEAN.
- Do not start with "Born in", "From a young age", "But everything changed when", or "They were always".`

  const userPrompt = `Genre: ${genre}. Tone: ${tone}.
Lens (apply this flavor to the hooks): ${lens}

Story bible (only this — do not invent a full biography):
${JSON.stringify(bible, null, 2)}`

  const raw = await generateText(apiKey, systemInstruction, userPrompt, {
    temperature: 1.05,
    ...(modelId ? { modelId } : {}),
  })
  const parsed = parseJsonFromModelText(raw)
  const hooks = Array.isArray(parsed?.hooks)
    ? parsed.hooks.map((h) => String(h || '').trim()).filter(Boolean).slice(0, 3)
    : []
  if (hooks.length < 3) {
    throw new Error('Model did not return three story hooks')
  }
  return { hooks }
}

export async function generateBackstory(apiKey, character, options = {}) {
  const {
    length = 'Standard Bio',
    tone = 'Simple',
    genre = 'High Fantasy',
    lensId = 'wanted',
    selectedHook = '',
    modelId,
  } = options

  const bible = buildStoryBible(character, { includeAdult: includeAdultInStoryBible(tone) })
  const lens = LENS_INSTRUCTIONS[lensId] || LENS_INSTRUCTIONS.wanted

  const systemInstruction = `You are a fiction writer. You receive a short story bible, not a complete stat block.

Write using ONE wound and ONE want as the spine. Other bible facts may appear only if they complicate that spine. Silence is allowed — do not tour every field.

Ban these openings and their cousins: "Born in", "From a young age", "But everything changed when", "They were always".

Write ONE scene (a night, a job, an argument, a rumor) plus a short present-day consequence. This is not a CV, Wikipedia page, or opening chapter that summarizes a life.

Never name MBTI, Enneagram, alignment labels, or OCEAN. Demonstrate interiority through behavior.

Output a single JSON object only, no markdown:
{ "backstory": "<prose>", "chatCanon": "<exactly three first-person sentences this character would own as their truth>" }

chatCanon must be first person, specific, and usable as a chatbot persona. No trait labels.`

  const hookBlock = selectedHook
    ? `Write from this chosen hook (do not list it; enact it):\n${selectedHook}\n`
    : ''

  const userPrompt = `${hookBlock}Length: ${length}.
Tone/Style: ${tone}.
Genre: ${genre}.
${lens}

Story bible:
${JSON.stringify(bible, null, 2)}`

  const raw = await generateText(apiKey, systemInstruction, userPrompt, {
    temperature: 1.15,
    ...(modelId ? { modelId } : {}),
  })
  const parsed = parseJsonFromModelText(raw)
  const backstory = String(parsed?.backstory || '').trim()
  const chatCanon = String(parsed?.chatCanon || '').trim()
  if (!backstory) {
    throw new Error('Model did not return a backstory')
  }
  return { backstory, chatCanon }
}

// --- Image Analysis Prompt ---

export function buildAnalysisPrompt() {
  const template = {}
  const selectLists = []
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'range') {
        template[field.id] = field.default ?? 50
      } else if (field.type === 'number') {
        template[field.id] =
          typeof field.default === 'number' ? field.default : 25
      } else {
        template[field.id] = '<non-empty string>'
      }
      if (field.type === 'select') {
        const labels = optionLabels(field.id)
        if (labels.length) selectLists.push(`${field.id}: ${labels.join(' | ')}`)
      }
    })
  })

  const jsonShape = JSON.stringify(template, null, 2)

  return (
    'You are an expert character designer and visual analyst. Analyze the provided image in extreme detail.\n\n' +
    'Return ONLY valid JSON. No markdown, no code fences, no commentary before or after the JSON object.\n\n' +
    'CRITICAL RULES:\n' +
    '- You must completely fill out EVERY SINGLE FIELD in the schema below. Include every key exactly once. Do not omit keys.\n' +
    '- Do not leave any string field blank. Do not use "", "N/A", "empty", or "unknown". Infer the most logical demographic, physical, psychological, narrative, social, and adult traits from visual evidence; when the image cannot directly show something, infer from context, fashion, body language, setting, and archetype.\n' +
    '- All numeric and range fields must be JSON numbers (integers). Ranges use the min/max defined in the app (typically 0–100 for sliders).\n' +
    '- For every field whose value is chosen from a fixed list in the app (select fields), the string MUST match one allowed option EXACTLY — same spelling, spacing, and punctuation (including apostrophes).\n' +
    '- Gender identity (Man/Woman/...) is who they are; sex is anatomy; gender_expression is presentation. Do not treat Transgender Man/Woman as a third gender disjoint from Man/Woman.\n' +
    '- Whenever you set a select field to "Custom", you MUST also fill its matching *_custom field with a concrete, specific description.\n' +
    '- Text fields (names, custom lines, narrative picks) should be vivid, specific, and non-generic.\n\n' +
    'Allowed select values (copy verbatim):\n' +
    `${selectLists.join('\n')}\n\n` +
    'The JSON object MUST contain exactly these keys with the indicated types (replace placeholder values with your analysis):\n' +
    jsonShape
  )
}
