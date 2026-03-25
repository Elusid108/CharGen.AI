/**
 * API utilities for Gemini (text + vision) and Imagen / Gemini image generation
 */

import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from './modelConstants'

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

// --- Backstory Generation ---

export async function generateBackstory(apiKey, character, options = {}) {
  const { length = 'Standard Bio', tone = 'Simple', genre = 'High Fantasy', modelId } = options

  const charSummary = Object.entries(character)
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const systemInstruction = `You are a master fiction writer specializing in character backstories. Write vivid, immersive prose that brings characters to life. Never list stats - write narratively. Focus on sensory details, emotional depth, and the internal conflicts that define the character.`

  const userPrompt = `Write a creative character backstory.
Length: ${length}.
Tone/Style: ${tone}.
Genre: ${genre}.

Character Data:
${charSummary}

Instructions:
1. Write prose, not a stat block. Be descriptive and evocative.
2. Focus on how their internal conflicts interact with their history.
3. Use sensory details - what they smell like, how they move, what their voice sounds like.
4. Weave their fears, goals, and personality traits naturally into the narrative.
5. Make it feel like the opening chapter of their story.`

  return generateText(apiKey, systemInstruction, userPrompt, { temperature: 1.1, ...(modelId ? { modelId } : {}) })
}

// --- Prompt Helper: Translate numeric stats to visual descriptions ---

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

// --- Image Prompt Builder ---

export function buildImagePrompt(character, imageType = 'profile', styleModifiers = {}) {
  const parts = []

  // Core physical description
  const species = selectDisplay(character, 'species') || 'human'
  const sex = character.sex || ''
  const age = character.age || ''
  const skinTone = selectDisplay(character, 'skin_tone')
  const skinTexture = selectDisplay(character, 'skin_texture')
  const hairStyle = character.hair_style || ''
  const hairColor = character.hair_color || ''
  const eyeColor = selectDisplay(character, 'eye_color')
  const facialStructure = character.facial_structure || ''

  const lineage = [selectDisplay(character, 'race'), selectDisplay(character, 'ethnicity'), selectDisplay(character, 'origin')].filter(Boolean)
  const apparent = character.aging !== '' && character.aging != null ? String(character.aging) : ''

  parts.push(
    `A highly detailed character concept art of a ${age ? age + ' year old ' : ''}${sex} ${species}` +
      `${apparent ? `, apparent age around ${apparent}` : ''}.`
  )

  if (lineage.length) parts.push(`Ancestry / background: ${lineage.join('; ')}.`)

  const height = selectDisplay(character, 'height')
  if (height) parts.push(`Height: ${height}.`)

  // Translate muscle_def to visual description instead of raw percentage
  const muscleDesc = describeMuscleDef(character.muscle_def)
  if (muscleDesc) parts.push(`Body: ${muscleDesc}.`)

  const bodyPartLabels = [
    ['forearms', 'forearms'],
    ['upper_arms', 'upper arms'],
    ['shoulders', 'shoulders'],
    ['neck', 'neck'],
    ['chest_size', 'chest'],
    ['abs', 'abs'],
    ['back', 'back'],
    ['glutes', 'hips/glutes'],
    ['upper_legs', 'thighs'],
    ['lower_legs', 'calves'],
  ]
  const bodyBits = bodyPartLabels
    .map(([id, label]) => {
      const t = selectDisplay(character, id)
      return t ? `${label}: ${t}` : null
    })
    .filter(Boolean)
  if (bodyBits.length) parts.push(`Proportions: ${bodyBits.join('; ')}.`)

  if (skinTone) parts.push(`Skin tone: ${skinTone}.`)
  if (skinTexture) parts.push(`Skin texture: ${skinTexture}.`)
  if (facialStructure) parts.push(`Facial structure: ${facialStructure}.`)

  const mustache = selectDisplay(character, 'mustache')
  if (mustache && !/^None /i.test(mustache) && mustache !== 'N/A (Non-Human)') {
    parts.push(`Mustache: ${mustache}.`)
  }
  const beard = selectDisplay(character, 'beard')
  if (beard && !/^None /i.test(beard) && beard !== 'N/A (Non-Human)') {
    parts.push(`Beard: ${beard}.`)
  }

  if (hairStyle) parts.push(`Hair: ${hairStyle}${hairColor && hairColor !== 'Bald/N/A' ? ', ' + hairColor : ''}.`)
  if (eyeColor) parts.push(`Eyes: ${eyeColor}.`)
  const bodyHair = selectDisplay(character, 'body_hair')
  if (bodyHair && bodyHair !== 'N/A (Non-Human)') parts.push(`Body hair: ${bodyHair}.`)
  const scars = selectDisplay(character, 'scars')
  if (scars) parts.push(`Distinguishing marks: ${scars}.`)
  const blemishes = selectDisplay(character, 'blemishes')
  if (blemishes) parts.push(`Imperfections: ${blemishes}.`)

  // Translate vascularity and sweat to visual descriptions
  const vascDesc = describeVascularity(character.vascularity)
  if (vascDesc) parts.push(`Veins: ${vascDesc}.`)

  const glistenDesc = describeSkinGlisten(character.sweat_glisten)
  if (glistenDesc) parts.push(`Skin surface: ${glistenDesc}.`)

  // Non-human features
  const special = selectDisplay(character, 'special_features')
  if (special) parts.push(`Special features: ${special}.`)

  // Only use personality for expression/mood -- do NOT include alignment or archetype
  // as they are narrative concepts that confuse the image model
  if (character.personality) {
    parts.push(`Their facial expression conveys a ${character.personality} demeanor.`)
  }

  // Image type specific instructions
  switch (imageType) {
    case 'profile':
      parts.push('Framing: Head and shoulders portrait, 1:1 square aspect ratio. Solid dark background.')
      break
    case 'fullbody':
      parts.push('Framing: Full body shot, natural relaxed confident pose. Solid dark background.')
      {
        const attire = selectDisplay(character, 'attire')
        if (attire) parts.push(`Wearing: ${attire}.`)
      }
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

  // Style modifiers
  const { artStyle = '', lighting = '', mood = '' } = styleModifiers
  let styleStr = 'Style: High quality digital concept art, 8k resolution, detailed.'
  if (artStyle) styleStr += ` ${artStyle}.`
  if (lighting) styleStr += ` ${lighting}.`
  if (mood) styleStr += ` ${mood}.`
  parts.push(styleStr)

  return parts.join(' ')
}

// --- Image Analysis Prompt ---

export function buildAnalysisPrompt() {
  return `Analyze this character image in extreme detail and extract attributes. Return ONLY valid JSON (no markdown, no code fences) matching this exact structure:

{
  "name": "suggested name or empty string",
  "species": "Human/Humanoid Alien/Creature/etc",
  "sex": "Male/Female/Intersex/Ambiguous",
  "gender": "Man/Woman/Non-binary/etc",
  "age": "estimated chronological age as number or empty",
  "race": "short label or empty",
  "ethnicity": "short label or empty",
  "origin": "birthplace/upbringing hint or empty",
  "height": "Very Short/Tall/etc or short phrase",
  "skin_tone": "description",
  "skin_texture": "Smooth/Scarred/etc or empty",
  "hair_style": "description",
  "hair_color": "description",
  "eye_color": "description",
  "facial_structure": "Chiseled/Rugged/Soft/etc",
  "mustache": "style or None / empty",
  "beard": "style or None / empty",
  "aging": "apparent age as integer or empty",
  "body_hair": "description or N/A",
  "forearms": "Slender/Toned/Muscular/etc or empty",
  "upper_arms": "descriptor or empty",
  "shoulders": "descriptor or empty",
  "neck": "descriptor or empty",
  "chest_size": "descriptor or empty",
  "abs": "descriptor or empty",
  "back": "descriptor or empty",
  "glutes": "descriptor or empty",
  "upper_legs": "descriptor or empty",
  "lower_legs": "descriptor or empty",
  "muscle_def": "0-100 number",
  "vascularity": "0-100 number",
  "scars": "description or empty",
  "blemishes": "description or empty",
  "special_features": "horns/wings/tail/etc or empty",
  "attire": "what they are wearing",
  "personality": "inferred personality trait",
  "archetype": "The Hero/The Outlaw/etc",
  "alignment": "Lawful Good/Chaotic Neutral/etc",
  "mood_expression": "description of expression/mood"
}

Be specific and detailed. If something is not visible, use your best judgment or leave empty.`
}
