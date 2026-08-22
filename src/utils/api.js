/**
 * API utilities for Gemini (text + vision) and Imagen / Gemini image generation
 */

import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './modelConstants'
import { CHARACTER_SECTIONS } from '../data/schemas'
import { BODY_LOCK_IMAGE_TYPES } from './imageGeneration'
import { inferImageMime } from './imageUtils'
import {
  buildStoryBible,
  includeAdultInStoryBible,
  LENS_INSTRUCTIONS,
} from './storyBible'

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

function buildCharacterFieldSpecFromSchema(schema) {
  const fields = []
  for (const section of Object.values(schema)) {
    for (const field of section.fields) {
      const entry = { id: field.id, type: field.type }
      if (field.conditional) {
        entry.onlyWhen = { field: field.conditional.field, equals: field.conditional.value }
      }
      if (field.type === 'select') entry.options = [...field.options]
      if (field.type === 'range') {
        entry.min = field.min ?? 0
        entry.max = field.max ?? 100
      }
      if (field.type === 'number') {
        if (field.id === 'age') {
          entry.min = 18
          entry.max = 80
        } else if (field.min !== undefined || field.max !== undefined) {
          entry.min = field.min ?? 0
          entry.max = field.max ?? 9999
        }
      }
      fields.push(entry)
    }
  }
  return fields
}

const CHARACTER_PROFILE_SYSTEM_PROMPT = `You are an expert character designer for fiction and games. Your task is to invent one cohesive original character.

You MUST output a single JSON object only. No markdown, no code fences, no commentary before or after the JSON.

CRITICAL — Demographic Consistency:
- If Gender Identity is "Transgender Man", Biological Sex MUST be "Female".
- If Gender Identity is "Transgender Woman", Biological Sex MUST be "Male".
- For cisgender alignment: if gender is "Man", biological sex should be "Male"; if "Woman", biological sex should be "Female". For other gender identities, keep sex and gender logically consistent with the definitions above.

CRITICAL — Psychological Consistency (MBTI and OCEAN Big Five):
- Choose an MBTI type first, then set OCEAN sliders (0–100) so they align: E = high Extraversion, I = low Extraversion. N = high Openness, S = low Openness. F = high Agreeableness, T = low Agreeableness. J = high Conscientiousness, P = low Conscientiousness.
- Neuroticism (ocean_n) is not determined by MBTI letters; set it freely for character depth.

CRITICAL — Narrative quality:
- Text fields such as race_custom, ethnicity_custom, origin_custom, goal, fear, desire, trauma, quirk, moral_code, prejudice, scars, distinguishing features, kinks, etc. must be highly creative, specific, and non-cliché. Avoid generic phrases.

Rules for the JSON:
- Every key listed in the field specification must appear exactly once.
- For "select" fields, values MUST be copied verbatim from the allowed options list.
- For "range" fields, use integers within the given min/max.
- For "text" fields, use strings; use "" if nothing applies.
- For conditional fields (onlyWhen), use a meaningful string when the condition holds, otherwise "".
- For "number" field age, use an integer from 18 to 80.
- For "number" field aging (apparent age), use an integer within the min/max given in the field spec when present.`

/**
 * Ask Gemini for a full character profile as JSON matching the app schema.
 * @param {object} schema — same shape as CHARACTER_SECTIONS
 * @param {string} modelId
 * @param {string} apiKey
 * @param {Record<string, unknown>} currentCharacterState
 * @param {{ freshRandomize?: boolean }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateCharacterProfile(schema, modelId, apiKey, currentCharacterState, options = {}) {
  const fieldSpec = buildCharacterFieldSpecFromSchema(schema)
  const stateSummary = Object.entries(currentCharacterState || {})
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const referenceBlock = options.freshRandomize
    ? `User-LOCKED fields only (must match these values exactly in your JSON). There is no other prior character — treat this as a blank sheet except for these keys:
${stateSummary || '(none — user locked nothing; every field is a fresh random pick)'}

CRITICAL — No carryover: For every field NOT listed above, pick a value independently from that field's allowed options and constraints in the spec. Do not assume or repeat anatomy or body descriptors from any previous character (e.g. do not default to "Toned" or mirror old traits). Vary body-part and physique selects across the full option lists.`
    : `Optional tone reference from the user's current sheet (you may ignore or diverge):
${stateSummary || '(empty)'}`

  const userPrompt = `Generate one new random character. Return ONLY valid JSON (no markdown, no code fences).

Field specification (each object describes one character attribute):
${JSON.stringify(fieldSpec)}

${referenceBlock}

Remember: every field id in the spec must be present in your JSON object with a valid value for its type and constraints.`

  const raw = await generateText(apiKey, CHARACTER_PROFILE_SYSTEM_PROMPT, userPrompt, {
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
    throw new Error(`Failed to parse character JSON: ${msg}`)
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

export async function generateImage(apiKey, prompt, options = {}) {
  const {
    aspectRatio = '1:1',
    negativePrompt = '',
    modelId = DEFAULT_IMAGE_MODEL,
    imageEndpoint = 'predict',
    referenceImageBase64 = null,
  } = options

  if (imageEndpoint === 'generateContent') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

    const parts = []
    if (referenceImageBase64) {
      const ref = parseReferenceImageForGemini(referenceImageBase64)
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

function describeMuscleDef(val) {
  const v = parseInt(val)
  if (isNaN(v) || v <= 0) return null
  if (v < 20) return 'very soft body with no visible muscle definition'
  if (v < 40) return 'lightly toned body with subtle muscle shape'
  if (v < 60) return 'athletic body with visible muscle tone and some ab definition'
  if (v < 80) return 'muscular body with clearly defined muscles, visible abs and arm veins'
  return 'extremely muscular and ripped body with deep muscle striations and prominent vascularity'
}

/** Muscle as garment drape only — never an instruction to expose abs. */
function describeMuscleDefSilhouette(val) {
  const v = parseInt(val)
  if (isNaN(v) || v <= 0) return null
  if (v < 20) return 'soft, unathletic silhouette under closed clothing'
  if (v < 40) return 'lightly athletic silhouette filling closed clothing; no muscle visible through fabric'
  if (v < 60) return 'athletic silhouette with a filled-out chest and shoulders under closed clothing'
  if (v < 80) return 'broad muscular silhouette filling closed clothing; bulk suggested by garment drape only, not exposed skin'
  return 'powerfully built silhouette with wide shoulders and a thick torso under fully covering clothing; do not show abs, veins, or skin through fabric'
}

function describeVascularity(val) {
  const v = parseInt(val)
  if (isNaN(v) || v < 20) return null
  if (v < 50) return 'subtle veining visible on forearms'
  if (v < 75) return 'prominent veins on arms and hands'
  return 'extreme road-map vascularity across arms, chest and abs'
}

function describeSkinGlisten(val) {
  const v = parseInt(val)
  if (isNaN(v) || v < 20) return null
  if (v < 50) return 'slight sheen on skin'
  if (v < 75) return 'noticeable sweat glistening on skin'
  return 'skin drenched in sweat, heavily glistening and reflecting light'
}

function describeSkinTone(tone, origin) {
  const o = String(origin ?? '').toLowerCase()
  if (tone === 'Pale' && o.includes('deep sea')) {
    return 'vitreous, waxy, sun-deprived pale skin, lacking melanin'
  }
  return tone
}

/** Resolve select + optional *_custom (when value is "Custom"). */
function selectDisplay(c, id) {
  const v = c[id]
  if (!v) return ''
  if (v === 'Custom') return String(c[`${id}_custom`] || '').trim()
  return String(v)
}

function groomingLineRejected(t) {
  return /^None /i.test(t) || t === 'N/A (Non-Human)'
}

const IDENTITY_PROMPT_SKIP = new Set([
  'name', 'orientation', 'archetype', 'species', 'sex', 'gender', 'age', 'default_outfit',
])

const SILHOUETTE_BODY_PARTS = new Set([
  'body_hair', 'forearms', 'upper_arms', 'shoulders', 'neck', 'chest_size',
  'abs', 'back', 'glutes', 'upper_legs', 'lower_legs',
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

  const species = selectDisplay(c, 'species') || 'human'
  const sex = c.sex ? String(c.sex) : ''
  const gender = c.gender ? String(c.gender) : ''
  const age = c.age !== '' && c.age != null ? String(c.age) : ''
  const apparent = c.aging !== '' && c.aging != null ? String(c.aging) : ''

  let opener = `Subject is ${species}`
  if (sex) opener += `, biological sex ${sex}`
  if (gender) opener += `, gender identity ${gender}`
  if (age) opener += `, chronological age ${age}`
  if (apparent) opener += `, apparent age around ${apparent}`
  parts.push(`${opener}.`)

  CHARACTER_SECTIONS.identity.fields.forEach((field) => {
    if (field.conditional || IDENTITY_PROMPT_SKIP.has(field.id)) return
    if (field.type === 'select') {
      const t = selectDisplay(c, field.id)
      if (t) parts.push(`${field.label}: ${t}.`)
    }
  })

  CHARACTER_SECTIONS.face.fields.forEach((field) => {
    if (field.conditional || field.id === 'aging') return
    if (field.type === 'select') {
      const t = selectDisplay(c, field.id)
      if (!t) return
      if ((field.id === 'mustache' || field.id === 'beard') && groomingLineRejected(t)) return
      parts.push(`${field.label}: ${t}.`)
    } else if (field.type === 'number') {
      const t = c[field.id]
      if (t !== '' && t != null) parts.push(`${field.label}: ${t}.`)
    }
  })

  CHARACTER_SECTIONS.physical.fields.forEach((field) => {
    if (field.conditional) return
    if (field.type === 'select') {
      let t = selectDisplay(c, field.id)
      if (!t) return
      if (field.id === 'skin_tone') {
        t = describeSkinTone(t, selectDisplay(c, 'origin'))
      }
      if (field.id === 'body_hair' && t === 'N/A (Non-Human)') return
      if (bodyDetail === 'silhouette' && field.id === 'body_hair') return
      let line = `${field.label}: ${t}.`
      if (bodyDetail === 'silhouette' && SILHOUETTE_BODY_PARTS.has(field.id)) {
        line =
          `Build under closed clothing — ${field.label}: ${t}. ` +
          'Suggest this through garment drape only; do not cut, open, or wet clothing to show this anatomy.'
      }
      if (field.id === 'scars' && t.toLowerCase().includes('implosion')) {
        line +=
          ' Render as raised, keloid, or indented skin texture rather than mere discoloration.'
      }
      if (field.id === 'special_features' && t.toLowerCase().includes('sub-dermal')) {
        line +=
          ' Render as surgically embedded into the anatomy with skin tension and biomechanical texture.'
      }
      parts.push(line)
    } else if (field.type === 'range') {
      if (field.id === 'muscle_def') {
        const d = bodyDetail === 'silhouette'
          ? describeMuscleDefSilhouette(c.muscle_def)
          : describeMuscleDef(c.muscle_def)
        if (d) parts.push(`${field.label}: ${d}.`)
      } else if (field.id === 'vascularity') {
        if (bodyDetail === 'silhouette') return
        const d = describeVascularity(c.vascularity)
        if (d) parts.push(`${field.label}: ${d}.`)
      }
    }
  })

  if (bodyDetail === 'full') {
    const glistenDesc = describeSkinGlisten(c.sweat_glisten)
    if (glistenDesc) parts.push(`Skin surface / sweat: ${glistenDesc}.`)
  }

  clothingPromptLines(c, { clothingMode, outfitOverride }).forEach((line) => parts.push(line))

  return parts.join(' ')
}

const IDENTITY_LOCK_INSTRUCTION =
  'IDENTITY LOCK: The attached image is the canonical appearance of this exact character. ' +
  'Match face, body, skin, hair, and proportions exactly. Change only pose, camera framing, or clothing as specified. ' +
  'Do not invent a different person.'

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
    outfitOverride: imageType === 'outfit' ? outfitOverride : null,
  })
  parts.push(`A highly detailed character concept art. ${physical}`)

  if (hasReferenceImage) {
    if (imageType === 'outfit') {
      parts.push(
        poseReference === 'mannequin'
          ? WARDROBE_MANNEQUIN_INSTRUCTION
          : WARDROBE_FROM_LOCK_INSTRUCTION
      )
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
      break
    case 'back':
      parts.push(
        'Framing: Single character, full body, STRICT rear view (180 degrees). Camera behind them. ' +
        'Same symmetrical T-pose as the front lock: both arms extended straight out, legs shoulder-width apart. ' +
        'Face is not visible — back of head, hair, back, and wings if any. ' +
        'One figure only. Not a three-view sheet. Not front-facing. ' +
        'Clean neutral grey background. Technical character design / identity-lock BACK reference.'
      )
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
  'The attached image is ONLY who this person is (face, hair, skin, body type). ' +
  'Ignore its pose, crop, lighting, and background completely. ' +
  'Do not copy a T-pose, arms stretched to the sides, grey seamless backdrop, or character-sheet composition.'

/**
 * Phone-snapshot prompt for chat [SEND_PIC] — not a studio full-body shot.
 * Scene description is first so it is not buried under the identity lock.
 * @param {Record<string, unknown>} character
 * @param {string} picDescription
 * @param {{
 *   presentationMode?: 'canonical' | 'thirst',
 *   hasReferenceImage?: boolean,
 *   extraNegative?: string,
 * }} [styleModifiers]
 */
export function buildChatPhotoPrompt(character, picDescription, styleModifiers = {}) {
  const {
    presentationMode = 'canonical',
    hasReferenceImage = false,
    extraNegative = '',
  } = styleModifiers
  const scene = String(picDescription || '').trim()
    || 'a casual candid phone photo of this person in the current moment'
  const clothingMode = presentationMode === 'thirst' ? 'thirst' : 'canonical'
  const bodyDetail = clothingMode === 'thirst' ? 'full' : 'silhouette'
  const physical = buildDetailedPhysicalPrompt(character, { clothingMode, bodyDetail })

  const parts = [
    'A candid smartphone photo someone just texted — real phone camera, slight compression, not concept art, not a character reference sheet.',
    `What the photo shows: ${scene}`,
    'Handheld framing: typical selfie, bathroom/bedroom mirror selfie, or a friend-took-this shot. Head and shoulders or torso. A real indoor or outdoor place that fits the description. Imperfect lighting. Not a studio. Not a seamless grey or black backdrop.',
  ]
  if (hasReferenceImage) parts.push(CHAT_PHOTO_IDENTITY_INSTRUCTION)
  parts.push(physical)
  parts.push('Same person as the reference. Completely different pose, camera, and setting than any T-pose or mannequin shot.')
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
    '- Whenever you set a select field to "Custom", you MUST also fill its matching *_custom field with a concrete, specific description.\n' +
    '- Text fields (names, custom lines, narrative picks) should be vivid, specific, and non-generic.\n\n' +
    'The JSON object MUST contain exactly these keys with the indicated types (replace placeholder values with your analysis):\n' +
    jsonShape
  )
}
