/**
 * API utilities for Gemini (text + vision) and Imagen / Gemini image generation
 */

import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './modelConstants'
import { CHARACTER_SECTIONS } from '../data/schemas'

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
 * @returns {Promise<Record<string, unknown>>}
 */
export async function generateCharacterProfile(schema, modelId, apiKey, currentCharacterState) {
  const fieldSpec = buildCharacterFieldSpecFromSchema(schema)
  const stateSummary = Object.entries(currentCharacterState || {})
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const userPrompt = `Generate one new random character. Return ONLY valid JSON (no markdown, no code fences).

Field specification (each object describes one character attribute):
${JSON.stringify(fieldSpec)}

Optional tone reference from the user's current sheet (you may ignore or diverge):
${stateSummary || '(empty)'}

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
    const mimeType = meta.split(';')[0]?.trim() || 'image/png'
    const data = s.slice(comma + 1).replace(/\s/g, '')
    return data ? { mimeType, data } : null
  }
  const data = s.replace(/\s/g, '')
  return data ? { mimeType: 'image/png', data } : null
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
    if (
      referenceImageBase64 &&
      modelId === 'gemini-3-flash-image'
    ) {
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

/**
 * Observable visual description from schema-driven sections (identity, face, physical, sweat, intimate attire).
 * New body-part fields in `physical` are picked up automatically.
 * @param {Record<string, unknown>} characterState
 * @param {{ omitAttire?: boolean }} [options]
 */
export function buildDetailedPhysicalPrompt(characterState, options = {}) {
  const { omitAttire = false } = options
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

  const identitySkip = new Set(['name', 'orientation', 'archetype', 'species', 'sex', 'gender', 'age'])
  CHARACTER_SECTIONS.identity.fields.forEach((field) => {
    if (field.conditional || identitySkip.has(field.id)) return
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
      const t = selectDisplay(c, field.id)
      if (!t) return
      if (field.id === 'body_hair' && t === 'N/A (Non-Human)') return
      parts.push(`${field.label}: ${t}.`)
    } else if (field.type === 'range') {
      if (field.id === 'muscle_def') {
        const d = describeMuscleDef(c.muscle_def)
        if (d) parts.push(`${field.label}: ${d}.`)
      } else if (field.id === 'vascularity') {
        const d = describeVascularity(c.vascularity)
        if (d) parts.push(`${field.label}: ${d}.`)
      }
    }
  })

  const glistenDesc = describeSkinGlisten(c.sweat_glisten)
  if (glistenDesc) parts.push(`Skin surface / sweat: ${glistenDesc}.`)

  if (!omitAttire) {
    const attire = selectDisplay(c, 'attire')
    if (attire) {
      parts.push(`Clothing and coverage (must match exactly in the image): ${attire}.`)
      parts.push(
        'CRITICAL: All visible garments must correspond to the clothing described above—do not substitute a different outfit.'
      )
    }
  }

  return parts.join(' ')
}

// --- Image Prompt Builder ---

export function buildImagePrompt(character, imageType = 'profile', styleModifiers = {}) {
  const parts = []

  const physical = buildDetailedPhysicalPrompt(character, { omitAttire: imageType === 'mannequin' })
  parts.push(`A highly detailed character concept art. ${physical}`)

  if (character.personality) {
    parts.push(`Their facial expression conveys a ${character.personality} demeanor.`)
  }

  switch (imageType) {
    case 'profile':
      parts.push('Framing: Head and shoulders portrait, 1:1 square aspect ratio. Solid dark background.')
      break
    case 'fullbody':
      parts.push('Framing: Full body shot, natural relaxed confident pose. Solid dark background.')
      break
    case 'tpose':
      parts.push(
        'Framing: A professional character model reference sheet. ' +
        'Three views of the SAME character side by side: front-facing view on the left, ' +
        'side profile view in the center, rear/back view on the right. ' +
        'The character stands in a symmetrical T-pose with both arms extended straight out to the sides, ' +
        'palms facing forward. Legs shoulder-width apart. ' +
        'Clean neutral grey background. Technical character design sheet style. ' +
        'Consistent proportions across all three views. No other poses.'
      )
      break
    case 'mannequin':
      parts.push(
        'Framing: Full body, neutral standing pose wearing only simple fitted underwear/briefs. ' +
        'Clean solid light grey background. Like a mannequin or dress-up doll reference for designing outfits onto.'
      )
      break
    case 'outfit':
      parts.push('Framing: Full body shot showing the complete outfit clearly. Solid dark background.')
      break
    default:
      parts.push('Solid dark cinematic background.')
  }

  const { artStyle = '', lighting = '', mood = '' } = styleModifiers
  let styleStr = 'Style: High quality digital concept art, 8k resolution, detailed.'
  if (artStyle) styleStr += ` ${artStyle}.`
  if (lighting) styleStr += ` ${lighting}.`
  if (mood) styleStr += ` ${mood}.`
  parts.push(styleStr)

  return parts.join(' ')
}

// --- Backstory Generation ---

export async function generateBackstory(apiKey, character, options = {}) {
  const { length = 'Standard Bio', tone = 'Simple', genre = 'High Fantasy', modelId } = options

  const characterJson = JSON.stringify(character ?? {}, null, 2)

  const systemInstruction = `You are an expert storyteller. You receive the complete character as a JSON object (goal, fear, trauma, kinks, MBTI, archetype, OCEAN sliders, physical traits, social patterns, adult themes, etc.). Use that entire object as the authoritative context.

Write flowing narrative prose only—never output a stat block, bullet list of attributes, or repeat the JSON.

Prioritize internal psychology, narrative history, goals, fears, trauma, relationships, and voice/movement when they appear in the JSON. Reference demographic and species context where it shapes the story. Use fine-grained body-part slider details only when they clearly matter to appearance, scars, or story logic (otherwise imply broad look through higher-level traits).

Every major psychological and narrative field provided should influence the backstory in a coherent, consistent way.`

  const userPrompt = `Write a creative character backstory.

Length: ${length}.
Tone/Style: ${tone}.
Genre: ${genre}.

Complete character (JSON—use as sole canonical context):
${characterJson}

Instructions:
1. Output prose only; do not echo or enumerate the JSON keys.
2. Weave goal, fear, trauma, desires, lies, virtues, vices, alignment, MBTI, enneagram, archetype, and social traits into a single coherent history and present condition.
3. Use sensory and behavioral texture (voice, gait, scent, aura) when those fields are present.
4. Adult-section fields are part of character truth where relevant; keep tone aligned with the requested genre and tone.
5. Make it feel like the opening chapter of their story.`

  return generateText(apiKey, systemInstruction, userPrompt, { temperature: 1.1, ...(modelId ? { modelId } : {}) })
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
