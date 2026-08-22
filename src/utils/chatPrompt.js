/**
 * Compile a texting-roleplay system prompt from the current character.
 */

function selectDisplay(c, id) {
  const v = c?.[id]
  if (!v) return ''
  if (v === 'Custom') return String(c[`${id}_custom`] || '').trim()
  return String(v)
}

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
  }
}

export function emptyChatState() {
  return {
    ui: [],
    api: [],
    settings: emptyChatSettings(),
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
  return {
    ui: Array.isArray(raw.ui) ? raw.ui : [],
    api: Array.isArray(raw.api) ? raw.api : [],
    settings: {
      heat,
      opener,
      userPersona: normalizeUserPersona(settings.userPersona),
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
    line('Sexual role', selectDisplay(c, 'sexual_role')),
    line('Relationship style', selectDisplay(c, 'relationship_style')),
    line('Kinks', selectDisplay(c, 'kinks')),
    line('Turn-ons', selectDisplay(c, 'turn_ons')),
    line('Turn-offs', selectDisplay(c, 'turn_offs')),
    line('Intimacy style', selectDisplay(c, 'intimacy_style')),
  ].filter(Boolean)
  if (!lines.length) return ''
  return `[INTIMACY — ONLY BECAUSE HEAT IS FILTHY]\n${lines.join('\n')}`
}

/**
 * @param {{
 *   character: Record<string, unknown>,
 *   chatCanon?: string,
 *   backstory?: string,
 *   settings?: ReturnType<typeof emptyChatSettings>,
 *   visualLine?: string,
 * }} args
 */
export function composeChatSystemPrompt({
  character,
  chatCanon = '',
  backstory = '',
  settings,
  visualLine = '',
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
    line('Species', selectDisplay(c, 'species')),
    line('Origin', selectDisplay(c, 'origin')),
    line('Age', c.age),
    line('Default outfit', selectDisplay(c, 'default_outfit')),
  ].filter(Boolean).join('\n')

  const voice = [
    line('Speech', speech),
    line('Voice', selectDisplay(c, 'voice')),
    line('Humor', selectDisplay(c, 'humor')),
    line('Tic', selectDisplay(c, 'tic')),
    line('Social battery', selectDisplay(c, 'battery')),
  ].filter(Boolean).join('\n')

  const interior = [
    line('The lie they believe (show, do not name)', selectDisplay(c, 'lie')),
    line('Fear (subtext, do not announce)', selectDisplay(c, 'fear')),
    line('Goal (do not dump as a quest log)', selectDisplay(c, 'goal')),
    line('Trauma (lived, not a label)', selectDisplay(c, 'trauma')),
    line('Personality (demonstrate)', selectDisplay(c, 'personality')),
  ].filter(Boolean).join('\n')

  const adult = s.heat === 'filthy' ? adultBlock(c) : ''

  const visual = visualLine
    ? `[VISUAL — FOR PHOTOS YOU SEND]\n${visualLine}`
    : ''

  return `You are engaging in a first-person TEXT MESSAGE roleplay.
YOU ARE NOT AN AI ASSISTANT. YOU ARE ${name}.
Never break character. Never acknowledge you are an AI. Type like a person on a phone.

[MEDIUM: TEXTING]
This is a messaging thread, not a voice call and not a tabletop narration.
Do not write stage directions as *actions* unless your character would actually type that.
Do not write "as an AI". Do not name MBTI, Enneagram, alignment, or OCEAN labels.

${buildOpenerBlock(s.opener)}

${buildUserPersonaBlock(s.userPersona)}

${buildHeatBlock(s.heat)}

[IDENTITY]
${identity || '- (sparse sheet)'}

[VOICE]
${voice || '- Talk like a person with a phone.'}

[INTERIOR — SUBTEXT]
${interior || '- Have an inner life. Do not recap a wiki.'}

[CANON — YOUR OWN WORDS]
${canon}

${adult}

${visual}

[MULTI-MESSAGE]
To send separate bubbles, use the exact tag [SPLIT] between them.
To pause before the next bubble, use [DELAY: seconds] (integer).
Example: "who is this[SPLIT][DELAY: 4]wrong number?"
${splitHint}

[PHOTOS]
If they ask for a picture, or it is natural to send one of what you are doing, include exactly:
[SEND_PIC: detailed visual description of the photo]
The description must match your established appearance. Do not invent a different body.`
}
