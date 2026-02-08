/**
 * API utilities for Gemini (text + vision) and Imagen (image generation)
 */

const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025'
const IMAGEN_MODEL = 'imagen-4.0-generate-001'

// --- Text Generation (Gemini) ---

export async function generateText(apiKey, systemInstruction, userPrompt, options = {}) {
  const { temperature = 1.0 } = options
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

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

// --- Vision Analysis (Gemini) ---

export async function analyzeImage(apiKey, base64Image, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

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

// --- Image Generation (Imagen) ---

export async function generateImage(apiKey, prompt, options = {}) {
  const { aspectRatio = '1:1', negativePrompt = '' } = options
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${apiKey}`

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
    const errMsg = data.error.message?.toLowerCase() || ''
    if (errMsg.includes('safety') || errMsg.includes('blocked') || errMsg.includes('policy')) {
      throw new Error('Content safety filter triggered. Try adjusting your character description.')
    }
    throw new Error(`Imagen Error: ${data.error.message}`)
  }

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error('No image data returned. The prompt may have triggered a content filter.')
  }

  return data.predictions[0].bytesBase64Encoded
}

// --- Backstory Generation ---

export async function generateBackstory(apiKey, character, options = {}) {
  const { length = 'Standard Bio', tone = 'Simple', genre = 'High Fantasy' } = options

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

  return generateText(apiKey, systemInstruction, userPrompt, { temperature: 1.1 })
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

// --- Image Prompt Builder ---

export function buildImagePrompt(character, imageType = 'profile', styleModifiers = {}) {
  const parts = []

  // Core physical description
  const species = character.species || 'human'
  const sex = character.sex || ''
  const age = character.age || ''
  const physique = character.physique || ''
  const skinTone = character.skin_tone || ''
  const hairStyle = character.hair_style || ''
  const hairColor = character.hair_color || ''
  const eyeColor = character.eye_color || ''
  const facialStructure = character.facial_structure || ''
  const facialHair = character.facial_hair || ''

  parts.push(`A highly detailed character concept art of a ${age ? age + ' year old ' : ''}${sex} ${species}.`)

  if (physique) parts.push(`Build: ${physique}.`)

  // Translate muscle_def to visual description instead of raw percentage
  const muscleDesc = describeMuscleDef(character.muscle_def)
  if (muscleDesc) parts.push(`Body: ${muscleDesc}.`)

  if (skinTone) parts.push(`Skin tone: ${skinTone}.`)
  if (character.skin_texture) parts.push(`Skin texture: ${character.skin_texture}.`)
  if (facialStructure) parts.push(`Facial structure: ${facialStructure}.`)
  if (facialHair && facialHair !== 'N/A') parts.push(`Facial hair: ${facialHair}.`)
  if (hairStyle) parts.push(`Hair: ${hairStyle}${hairColor && hairColor !== 'Bald/N/A' ? ', ' + hairColor : ''}.`)
  if (eyeColor) parts.push(`Eyes: ${eyeColor}.`)
  if (character.body_hair && character.body_hair !== 'N/A (Non-Human)') parts.push(`Body hair: ${character.body_hair}.`)
  if (character.scars) parts.push(`Distinguishing marks: ${character.scars}.`)
  if (character.blemishes) parts.push(`Imperfections: ${character.blemishes}.`)

  // Translate vascularity and sweat to visual descriptions
  const vascDesc = describeVascularity(character.vascularity)
  if (vascDesc) parts.push(`Veins: ${vascDesc}.`)

  const glistenDesc = describeSkinGlisten(character.sweat_glisten)
  if (glistenDesc) parts.push(`Skin surface: ${glistenDesc}.`)

  // Non-human features
  if (character.special_features) parts.push(`Special features: ${character.special_features}.`)

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
      if (character.attire) parts.push(`Wearing: ${character.attire}.`)
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
  "age": "estimated number",
  "physique": "Athletic/Bodybuilder/Wiry/Stocky/etc",
  "skin_tone": "description",
  "hair_style": "description",
  "hair_color": "description",
  "eye_color": "description",
  "facial_structure": "Chiseled/Rugged/Soft/etc",
  "facial_hair": "Clean Shaven/Stubble/Beard/etc or N/A",
  "body_hair": "description or N/A",
  "muscle_def": "0-100 number",
  "scars": "description or empty",
  "special_features": "horns/wings/tail/etc or empty",
  "attire": "what they are wearing",
  "personality": "inferred personality trait",
  "archetype": "The Hero/The Outlaw/etc",
  "alignment": "Lawful Good/Chaotic Neutral/etc",
  "mood_expression": "description of expression/mood"
}

Be specific and detailed. If something is not visible, use your best judgment or leave empty.`
}
