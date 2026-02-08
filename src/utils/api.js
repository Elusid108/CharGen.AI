/**
 * API utilities for Gemini (text + vision) and Imagen (image generation)
 */

const GEMINI_MODEL = 'gemini-2.5-flash-preview-04-17'
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
  if (character.muscle_def) parts.push(`Muscle definition: ${character.muscle_def}%.`)
  if (skinTone) parts.push(`Skin tone: ${skinTone}.`)
  if (facialStructure) parts.push(`Facial structure: ${facialStructure}.`)
  if (facialHair) parts.push(`Facial hair: ${facialHair}.`)
  if (hairStyle) parts.push(`Hair: ${hairStyle}${hairColor ? ', ' + hairColor : ''}.`)
  if (eyeColor) parts.push(`Eyes: ${eyeColor}.`)
  if (character.body_hair) parts.push(`Body hair: ${character.body_hair}.`)
  if (character.scars) parts.push(`Distinguishing marks: ${character.scars}.`)

  // Non-human features
  if (character.special_features) parts.push(`Special features: ${character.special_features}.`)

  // Personality influence on expression
  if (character.alignment) parts.push(`Expression reflects a ${character.alignment} disposition.`)
  if (character.personality) parts.push(`Core vibe: ${character.personality}.`)

  // Image type specific instructions
  switch (imageType) {
    case 'profile':
      parts.push('Framing: Head and shoulders portrait, 1:1 aspect ratio. Solid dark background.')
      break
    case 'fullbody':
      parts.push('Framing: Full body shot, natural relaxed pose. Solid dark background.')
      if (character.attire) parts.push(`Wearing: ${character.attire}.`)
      break
    case 'tpose':
      parts.push('Framing: Character reference sheet showing front view, side view, and back view in T-pose. Clean white/grey background. Character model sheet style.')
      break
    case 'mannequin':
      parts.push('Framing: Full body, neutral standing pose wearing only simple underwear/base layer. Clean background. Like a mannequin reference for outfit design.')
      break
    case 'outfit':
      parts.push('Framing: Full body shot showing the complete outfit.')
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
