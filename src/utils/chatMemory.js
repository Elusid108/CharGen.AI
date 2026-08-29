/**
 * Chat memory helpers: timestamps, action perspective, photo album ids.
 */

const TOKEN = {
  MY: '\u0001MY\u0001',
  I: '\u0001I\u0001',
  IM: '\u0001IM\u0001',
  IVE: '\u0001IVE\u0001',
  ID: '\u0001ID\u0001',
  ILL: '\u0001ILL\u0001',
  ME: '\u0001ME\u0001',
  MINE: '\u0001MINE\u0001',
  MYSELF: '\u0001MYSELF\u0001',
  YOUR: '\u0001YOUR\u0001',
  YOU: '\u0001YOU\u0001',
  YOURE: '\u0001YOURE\u0001',
  YOUVE: '\u0001YOUVE\u0001',
  YOUD: '\u0001YOUD\u0001',
  YOULL: '\u0001YOULL\u0001',
  YOURS: '\u0001YOURS\u0001',
  YOURSELF: '\u0001YOURSELF\u0001',
}

function replaceWord(text, pattern, replacement) {
  return text.replace(pattern, replacement)
}

/**
 * Flip first/second person so the character remembers a user action from their POV.
 * "I put my hand on your shoulder" → "You put your hand on my shoulder"
 */
export function flipActionPerspective(text) {
  let s = String(text ?? '')
  s = replaceWord(s, /\bmyself\b/gi, TOKEN.MYSELF)
  s = replaceWord(s, /\byourself\b/gi, TOKEN.YOURSELF)
  s = replaceWord(s, /\bI'm\b/gi, TOKEN.IM)
  s = replaceWord(s, /\bI've\b/gi, TOKEN.IVE)
  s = replaceWord(s, /\bI'd\b/gi, TOKEN.ID)
  s = replaceWord(s, /\bI'll\b/gi, TOKEN.ILL)
  s = replaceWord(s, /\byou're\b/gi, TOKEN.YOURE)
  s = replaceWord(s, /\byou've\b/gi, TOKEN.YOUVE)
  s = replaceWord(s, /\byou'd\b/gi, TOKEN.YOUD)
  s = replaceWord(s, /\byou'll\b/gi, TOKEN.YOULL)
  s = replaceWord(s, /\bmine\b/gi, TOKEN.MINE)
  s = replaceWord(s, /\byours\b/gi, TOKEN.YOURS)
  s = replaceWord(s, /\bmy\b/gi, TOKEN.MY)
  s = replaceWord(s, /\byour\b/gi, TOKEN.YOUR)
  s = replaceWord(s, /\bme\b/gi, TOKEN.ME)
  s = replaceWord(s, /\bI\b/g, TOKEN.I)
  s = replaceWord(s, /\byou\b/gi, TOKEN.YOU)

  s = s.split(TOKEN.MYSELF).join('yourself')
  s = s.split(TOKEN.YOURSELF).join('myself')
  s = s.split(TOKEN.IM).join("you're")
  s = s.split(TOKEN.IVE).join("you've")
  s = s.split(TOKEN.ID).join("you'd")
  s = s.split(TOKEN.ILL).join("you'll")
  s = s.split(TOKEN.YOURE).join("I'm")
  s = s.split(TOKEN.YOUVE).join("I've")
  s = s.split(TOKEN.YOUD).join("I'd")
  s = s.split(TOKEN.YOULL).join("I'll")
  s = s.split(TOKEN.MINE).join('yours')
  s = s.split(TOKEN.YOURS).join('mine')
  s = s.split(TOKEN.MY).join('your')
  s = s.split(TOKEN.YOUR).join('my')
  s = s.split(TOKEN.ME).join('you')
  s = s.split(TOKEN.I).join('you')
  s = s.split(TOKEN.YOU).join('I')
  return s
}

const QUOTE_TOKEN = (i) => `\u0002Q${i}\u0002`

/**
 * Hold paired quotes so spoken "I" is not flipped.
 * Straight "...", curly “...”, and low-high „...“ — unmatched leftovers stay as-is.
 */
function protectQuotedSpeech(text) {
  const held = []
  let s = String(text ?? '')
  const patterns = [
    /\u201C([^\u201D]*)\u201D/g,
    /\u201E([^\u201C]*)\u201C/g,
    /"([^"]*)"/g,
  ]
  for (const re of patterns) {
    s = s.replace(re, (match) => {
      const token = QUOTE_TOKEN(held.length)
      held.push(match)
      return token
    })
  }
  return { text: s, held }
}

function restoreQuotedSpeech(text, held) {
  let s = String(text ?? '')
  for (let i = 0; i < held.length; i++) {
    s = s.split(QUOTE_TOKEN(i)).join(held[i])
  }
  return s
}

/**
 * Rewrite their turn into the character's POV. Quoted speech stays as they said it.
 *
 * Garage: they type
 *   walk into the garage, your back to me, bent over working on a car
 *   I smirk and tap the vending machine
 *   "Hey stranger"
 * The model sees
 *   walk into the garage, my back to you, bent over working on a car
 *   You smirk and tap the vending machine
 *   "Hey stranger"
 */
export function flipUserActionsForMemory(userText) {
  const { text, held } = protectQuotedSpeech(userText)
  const flipped = flipActionPerspective(text).replace(
    /(^|[.!?]\s+|\n|\*)(you|i)\b/g,
    (_, pre, word) => pre + word[0].toUpperCase() + word.slice(1),
  )
  return restoreQuotedSpeech(flipped, held)
}

export function formatClockStamp(ms = Date.now()) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString()
  }
}

export function formatElapsed(fromMs, toMs = Date.now()) {
  if (!fromMs) return ''
  const ms = Math.max(0, toMs - Number(fromMs))
  if (ms < 15_000) return 'a few seconds ago'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`
  const days = Math.round(ms / 86_400_000)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export function formatUserApiText(userText, createdAt, options = {}) {
  const name = String(options.characterName || '').trim()
  const who = name ? `not ${name}` : 'not you'
  const stamp = `[${formatClockStamp(createdAt)}]`
  if (options.presence === 'inperson') {
    const rewritten = flipUserActionsForMemory(userText)
    return `${stamp}\n[THE OTHER PERSON (${who}). Actions are already in YOUR POV: you/your = them, I/me/my = you. Quoted speech is unflipped.]\n${rewritten}`
  }
  return `${stamp}\n[THE OTHER PERSON (${who}) texted this. Treat it as a message, not a scene.]\n${userText}`
}

export function nextPhotoId(photos = []) {
  let max = 0
  for (const photo of photos) {
    const match = String(photo?.id || '').match(/^p(\d+)$/i)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `p${max + 1}`
}

export function resolveAlbumPhoto(photos, token) {
  const raw = String(token || '').trim().replace(/^#/, '')
  if (!raw) return null
  const list = Array.isArray(photos) ? photos : []
  return list.find((p) => {
    const id = String(p?.id || '')
    return id === raw || id === `p${raw}` || raw === `p${id}`
  }) || null
}

export function lastUserMessageAt(ui = []) {
  for (let i = ui.length - 1; i >= 0; i--) {
    if (ui[i]?.role === 'user' && ui[i].createdAt) return ui[i].createdAt
  }
  return 0
}
