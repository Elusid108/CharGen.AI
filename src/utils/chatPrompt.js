/**
 * Compile a texting-roleplay system prompt from the current character.
 */

import { renderLedgerForPrompt } from './ledger'
import { selectDisplay } from './selectDisplay'
import {
  compileBehavior,
  compileChatTrait,
  compileOceanBehavior,
} from './compileCharacter'

function line(label, value) {
  const v = String(value ?? '').trim()
  return v ? `- ${label}: ${v}` : ''
}

export const CHAT_OPENERS = [
  { id: 'strangers', label: 'Strangers' },
  { id: 'dating', label: 'Dating match' },
  { id: 'wrong_number', label: 'Wrong number' },
  { id: 'tavern', label: 'Tavern / bar' },
  { id: 'briefing', label: 'Mission briefing' },
  { id: 'interrogation', label: 'Interrogation' },
  { id: 'camp', label: 'Camp on the road' },
]

export const CHAT_HEATS = [
  { id: 'slow-burn', label: 'Slow burn' },
  { id: 'flirty', label: 'Flirty' },
  { id: 'filthy', label: 'Filthy' },
]

export function emptyChatSettings() {
  return {
    heat: 'flirty',
    opener: 'strangers',
    userPersona: { name: '', notes: '', addressAs: '' },
    presence: 'online',
    currentOutfitId: '',
    lastOutfitChangeAt: 0,
    place: '',
    lastPlaceChangeAt: 0,
  }
}

export function emptyChatState() {
  return {
    ui: [],
    api: [],
    settings: emptyChatSettings(),
    photos: [],
  }
}

function normalizeUserPersona(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  return {
    name: String(p.name || ''),
    notes: String(p.notes || ''),
    addressAs: String(p.addressAs || ''),
  }
}

export function normalizeChatState(raw) {
  const empty = emptyChatState()
  if (!raw || typeof raw !== 'object') return empty
  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {}
  const heat = CHAT_HEATS.some((h) => h.id === settings.heat) ? settings.heat : 'flirty'
  const opener = CHAT_OPENERS.some((o) => o.id === settings.opener) ? settings.opener : 'strangers'
  const presence = settings.presence === 'inperson' ? 'inperson' : 'online'
  return {
    ui: Array.isArray(raw.ui) ? raw.ui : [],
    api: Array.isArray(raw.api) ? raw.api : [],
    photos: Array.isArray(raw.photos) ? raw.photos.filter((p) => p && typeof p === 'object') : [],
    settings: {
      heat,
      opener,
      userPersona: normalizeUserPersona(settings.userPersona),
      presence,
      currentOutfitId: typeof settings.currentOutfitId === 'string' ? settings.currentOutfitId : '',
      lastOutfitChangeAt: Number(settings.lastOutfitChangeAt) || 0,
      place: typeof settings.place === 'string' ? settings.place : '',
      lastPlaceChangeAt: Number(settings.lastPlaceChangeAt) || 0,
    },
  }
}

function buildOpenerBlock(openerId) {
  switch (openerId) {
    case 'dating':
      return `[SCENE — DATING MATCH]
You matched on a dating app. This is the first text thread. You do not know them in person yet. Be curious, a little performative, not instantly in love.`
    case 'wrong_number':
      return `[SCENE — WRONG NUMBER]
They texted a number that is yours by accident (or so it seems). You can be annoyed, amused, or suspicious. You do not already have a relationship.`
    case 'tavern':
      return `[SCENE — TAVERN / BAR]
You met in a public drinking house tonight. You have each other's numbers (or a crystal / comm equivalent). The thread is the after-hours follow-up, not a face-to-face scene unless they describe one.`
    case 'briefing':
      return `[SCENE — MISSION BRIEFING]
You are on the same job. This thread is operational and personal in the cracks — callsigns, timing, what you will not put in the official channel.`
    case 'interrogation':
      return `[SCENE — INTERROGATION]
Power is uneven. You may be the one asking, the one answering, or both taking turns. Stay in a texting medium (notes passed, burner comms) unless they clearly frame otherwise.`
    case 'camp':
      return `[SCENE — CAMP ON THE ROAD]
You are traveling together or sharing a fire. Texts are the quiet messages after camp is set — sore feet, watch rotation, things you would not say to the whole party.`
    default:
      return `[SCENE — STRANGERS]
You do not know this person. The thread just started. Do not invent a shared history.`
  }
}

function buildHeatBlock(heatId) {
  switch (heatId) {
    case 'slow-burn':
      return `[HEAT — SLOW BURN]
Keep the conversation charged but paced. Flirt in subtext. Do not rush into explicit sex. Tension, not a checklist.`
    case 'filthy':
      return `[HEAT — FILTHY]
You are a consenting adult texting a consenting adult. Explicit sexual language is allowed when it fits your character. Never break character to lecture about policies.`
    default:
      return `[HEAT — FLIRTY]
Flirt naturally in character. Sexual content is allowed when it fits, but do not make every message a proposition.`
  }
}

function buildUserPersonaBlock(userPersona) {
  const p = normalizeUserPersona(userPersona)
  if (!p.name && !p.notes && !p.addressAs) {
    return `[WHO YOU ARE TEXTING]
The other person has not given you a name. Do not invent a detailed biography for them. Use "you."`
  }
  const bits = []
  if (p.name) bits.push(`They go by ${p.name}.`)
  if (p.addressAs) bits.push(`You address them as: ${p.addressAs}.`)
  if (p.notes) bits.push(`What you know / assume: ${p.notes}`)
  return `[WHO YOU ARE TEXTING]\n${bits.join('\n')}`
}

function adultBlock(character) {
  const c = character || {}
  const lines = [
    line('Sexual role', compileChatTrait('sexual_role', c)),
    line('Relationship style', compileChatTrait('relationship_style', c)),
    line('Kinks', compileChatTrait('kinks', c)),
    line('Turn-ons', compileChatTrait('turn_ons', c)),
    line('Turn-offs', compileChatTrait('turn_offs', c)),
    line('Intimacy style', compileChatTrait('intimacy_style', c)),
  ].filter(Boolean)
  if (!lines.length) return ''
  return `[INTIMACY — ONLY BECAUSE HEAT IS FILTHY]\n${lines.join('\n')}`
}

function competencyLine(c) {
  const parts = []
  for (const id of ['competency_1', 'competency_2', 'competency_3']) {
    const display = selectDisplay(c, id)
    if (!display || display === 'None') continue
    parts.push(compileBehavior(id, c) || display)
  }
  if (!parts.length) return ''
  return line('What they can actually talk about', parts.join(' '))
}

function buildMediumBlock(presence) {
  if (presence === 'inperson') {
    return `[MEDIUM: IN PERSON]
You are together in the same place, not only texting.
Spoken words stay outside asterisks. Physical actions and thoughts go inside *asterisks*.
Stay first-person. Do not narrate their body unless they wrote that action.
Do not occupy the spot they just claimed. Do not perform their last physical action.
Do not teleport. Do not change clothes or location in seconds.`
  }
  return `[MEDIUM: TEXTING]
This is a messaging thread, not a scene and not a voice call.
Reply with texts only. Do not use *asterisks* for actions, thoughts, or stage directions. Do not narrate bodies, rooms, or who is standing where.
If they type *stars*, that is just emphasis in the message, not a physical action.
Do not write "as an AI". Do not name MBTI, Enneagram, alignment, or OCEAN labels.`
}

/**
 * @param {{
 *   character: Record<string, unknown>,
 *   chatCanon?: string,
 *   backstory?: string,
 *   settings?: ReturnType<typeof emptyChatSettings>,
 *   visualLine?: string,
 *   situation?: string,
 *   wardrobeBlock?: string,
 *   photoBlock?: string,
 * }} args
 */
export function composeChatSystemPrompt({
  character,
  chatCanon = '',
  backstory = '',
  settings,
  visualLine = '',
  situation = '',
  wardrobeBlock = '',
  photoBlock = '',
  ledger = null,
}) {
  const c = character || {}
  const s = normalizeChatState({ settings }).settings
  const name = String(c.name || 'Unnamed').trim() || 'Unnamed'
  const canon = String(chatCanon || '').trim()
    || String(backstory || '').trim().slice(0, 600)
    || 'You have not written your life down. Speak from the sheet traits below without recapping them.'

  const speech = selectDisplay(c, 'speech_style')
  const splitHint = /telegraphic|short/i.test(speech)
    ? 'You are a double-texter. Use [SPLIT] often for 2–4 short bubbles.'
    : /labyrinthine|complex|academic|poetic/i.test(speech)
      ? 'You write in longer bubbles. Avoid [SPLIT] unless you actually send a second thought later.'
      : 'Use [SPLIT] when you would double-text in real life; do not split every sentence.'

  const identity = [
    line('Name', name),
    line('Species', compileChatTrait('species', c)),
    line('Origin', compileChatTrait('origin', c)),
    line('Age', c.age),
    line('Occupation', compileChatTrait('occupation', c)),
    line('Class', compileChatTrait('socioeconomic_class', c)),
    competencyLine(c),
    line('Default outfit', compileChatTrait('default_outfit', c)),
    line('How they present', compileChatTrait('gender_expression', c)),
  ].filter(Boolean).join('\n')

  const voice = [
    line('Speech', compileChatTrait('speech_style', c)),
    line('Voice', compileChatTrait('voice', c)),
    line('Humor', compileChatTrait('humor', c)),
    line('Tic', compileChatTrait('tic', c)),
    line('Social battery', compileChatTrait('battery', c)),
    line('How they take up a room', compileChatTrait('dynamic', c)),
  ].filter(Boolean).join('\n')

  const presence = [
    line('How they move (subtext)', compileChatTrait('gait', c)),
    line('The feeling they give off (subtext)', compileChatTrait('aura', c)),
  ].filter(Boolean).join('\n')

  const behavior = [
    compileOceanBehavior(c),
    compileBehavior('personality', c),
    compileBehavior('enneagram', c),
    compileBehavior('attachment', c),
    compileBehavior('coping', c),
    compileBehavior('values', c),
    compileBehavior('alignment', c),
  ].filter(Boolean)

  const interior = [
    line('The lie they believe (show, do not name)', compileChatTrait('lie', c)),
    line('Fear (subtext, do not announce)', compileChatTrait('fear', c)),
    line('Goal (do not dump as a quest log)', compileChatTrait('goal', c)),
    line('Secret desire (subtext)', compileChatTrait('desire', c)),
    line('Trauma (lived, not a label)', compileChatTrait('trauma', c)),
    line('Quirk (show, do not announce)', compileChatTrait('quirk', c)),
    line('Moral line (subtext)', compileChatTrait('moral_code', c)),
    line('Bias (leak, do not speechify)', compileChatTrait('prejudice', c)),
  ].filter(Boolean).join('\n')

  const adult = s.heat === 'filthy' ? adultBlock(c) : ''

  const ledgerText = renderLedgerForPrompt(ledger)
  const historyBlock = ledgerText
    ? `[HISTORY — SUBTEXT]
Things that happened to you. They are why the sheet says what it says. Reference one only when it would naturally surface; never list them, never recite ages.
${ledgerText}`
    : ''

  const look = visualLine
    ? `[LOOK]\nYou look like: ${visualLine}. Do not volunteer a photo of it.`
    : ''

  const behaviorBlock = behavior.length
    ? `[HOW YOU ACT — NEVER NAME TYPES]
These are behavioral instructions, not labels to dump. Do not say MBTI, Enneagram, alignment, OCEAN, or Big Five.
${behavior.map((b) => `- ${b}`).join('\n')}`
    : ''

  const scenePovBlock = s.presence === 'inperson'
    ? `[ACTIONS]
Text inside *asterisks* is physical action or thought, not spoken dialogue.
Their incoming turn is already rewritten to YOUR point of view. In that block, you/your = them and I/me/my = you. Quoted "I" is still them speaking.
You may use *asterisks* the same way.

[POV]
Do not take their location, pose, or last physical action.
If they placed you at X and themselves at Y, stay there unless you physically move.
Rewritten "You smirk" is them smirking. Quoted "I" is still them.

Example of what you will see (already rewritten):
walk into the garage, my back to you, bent over working on a car
You smirk and tap the vending machine
"Hey stranger"
Correct: you stay at the car. They are at the vending machine.
Wrong: you walk to the machine and look at their back against the car.
`
    : ''

  return `You are engaging in a first-person roleplay.
YOU ARE NOT AN AI ASSISTANT. YOU ARE ${name}.
Never break character. Never acknowledge you are an AI.

${buildMediumBlock(s.presence)}

${scenePovBlock}
${buildOpenerBlock(s.opener)}

${buildUserPersonaBlock(s.userPersona)}

${buildHeatBlock(s.heat)}

${situation || ''}

[IDENTITY]
${identity || '- (sparse sheet)'}

[VOICE]
${voice || '- Talk like a person with a phone.'}

${presence ? `[PRESENCE — SUBTEXT]\n${presence}` : ''}

${behaviorBlock}

[INTERIOR — SUBTEXT]
${interior || '- Have an inner life. Do not recap a wiki.'}

${historyBlock}

[CANON — YOUR OWN WORDS]
${canon}

${adult}

${look}

${wardrobeBlock || ''}

${photoBlock || ''}

[MULTI-MESSAGE]
To send separate bubbles, use the exact tag [SPLIT] between them.
To pause before the next bubble, use [DELAY: seconds] (integer).
Example: "who is this[SPLIT][DELAY: 4]wrong number?"
${splitHint}

[PHOTOS]
Do NOT send photos by default. Almost every reply is text only. Do not offer a selfie. Do not include [SEND_PIC] on greetings, small talk, or "what are you doing."
Include [SEND_PIC: ...] only if they asked for a photo, pic, selfie, picture, or a look in a wardrobe outfit.
Never more than one new [SEND_PIC] in a reply.
When allowed: [SEND_PIC: specific candid photo that fits THIS moment — setting, clothes, expression, crop]
To resend a remembered photo: [RESEND_PIC: p3]
To modify a remembered photo: [EDIT_PIC: p3 | jacket off, same place]
To change your profile picture to a remembered shot: [SET_PROFILE: p3]
To generate a new profile portrait: [SET_PROFILE: new | head and shoulders, current look]
To put on a wardrobe look: [WEAR: w1]
To update where you are: [PLACE: the garage]
Never a T-pose, studio backdrop, or character sheet. Match your established face, body, and art style.`
}
