/**
 * Parse chat control tags from a model reply.
 */

const DELAY_CAP_MS = 8000

const PROTOCOL_TAG_RE = /\[(?:SEND_PIC|RESEND_PIC|EDIT_PIC|SET_PROFILE|WEAR|PLACE|SPLIT|DELAY):\s*[\s\S]*?\]|\[SPLIT\]/gi

export function stripProtocolTags(raw, { photoSent = false } = {}) {
  return String(raw ?? '')
    .replace(/\[SEND_PIC:\s*[\s\S]*?\]/gi, photoSent ? '*[Sent a photo]*' : '')
    .replace(/\[RESEND_PIC:\s*[^\]]*\]/gi, photoSent ? '*[Sent a photo]*' : '')
    .replace(/\[EDIT_PIC:\s*[\s\S]*?\]/gi, photoSent ? '*[Sent a photo]*' : '')
    .replace(/\[SET_PROFILE:\s*[\s\S]*?\]/gi, '')
    .replace(/\[WEAR:\s*[^\]]*\]/gi, '')
    .replace(/\[PLACE:\s*[^\]]*\]/gi, '')
    .replace(/\[SPLIT\]/gi, '\n\n')
    .replace(/\[DELAY:\s*\d+\s*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function heuristicDelayMs(text) {
  const n = String(text || '').trim().length
  if (n < 40) return 400
  if (n < 120) return 800
  return 1400
}

function extractDelayMs(block) {
  let delayMs = null
  const cleaned = String(block || '').replace(/\[DELAY:\s*(\d+)\s*\]/gi, (_, sec) => {
    const n = parseInt(sec, 10)
    if (!Number.isNaN(n)) delayMs = Math.min(DELAY_CAP_MS, Math.max(0, n * 1000))
    return ''
  })
  return { text: cleaned, delayMs }
}

function emptyTags() {
  return {
    picDescription: '',
    resendPicId: '',
    editPic: null,
    setProfile: null,
    wearId: '',
    place: '',
  }
}

function extractProtocolTags(block) {
  const tags = emptyTags()
  let text = String(block || '')

  text = text.replace(/\[SEND_PIC:\s*([\s\S]*?)\]/gi, (_, desc) => {
    tags.picDescription = String(desc || '').trim()
    return ''
  })
  text = text.replace(/\[RESEND_PIC:\s*([^\]]+?)\]/gi, (_, id) => {
    tags.resendPicId = String(id || '').trim()
    return ''
  })
  text = text.replace(/\[EDIT_PIC:\s*([^\]|]+?)\s*\|\s*([\s\S]*?)\]/gi, (_, id, change) => {
    tags.editPic = { id: String(id || '').trim(), change: String(change || '').trim() }
    return ''
  })
  text = text.replace(/\[SET_PROFILE:\s*new\s*(?:\|\s*([\s\S]*?))?\]/gi, (_, desc) => {
    tags.setProfile = { mode: 'new', description: String(desc || '').trim() }
    return ''
  })
  text = text.replace(/\[SET_PROFILE:\s*([^\]]+?)\]/gi, (_, id) => {
    tags.setProfile = { mode: 'id', id: String(id || '').trim() }
    return ''
  })
  text = text.replace(/\[WEAR:\s*([^\]]+?)\]/gi, (_, id) => {
    tags.wearId = String(id || '').trim()
    return ''
  })
  text = text.replace(/\[PLACE:\s*([^\]]+?)\]/gi, (_, place) => {
    tags.place = String(place || '').trim()
    return ''
  })

  return { text, tags }
}

/**
 * @param {string} rawReply
 * @returns {{
 *   text: string,
 *   delayMs: number,
 *   picDescription: string,
 *   resendPicId: string,
 *   editPic: { id: string, change: string } | null,
 *   setProfile: { mode: 'new' | 'id', id?: string, description?: string } | null,
 *   wearId: string,
 *   place: string,
 * }[]}
 */
export function parseReplyBlocks(rawReply) {
  const raw = String(rawReply ?? '')
  const chunks = raw.split(/\[SPLIT\]/i)
  const blocks = []
  for (const chunk of chunks) {
    const delayed = extractDelayMs(chunk)
    const tagged = extractProtocolTags(delayed.text)
    const text = tagged.text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    const hasWork = !!(
      text
      || tagged.tags.picDescription
      || tagged.tags.resendPicId
      || tagged.tags.editPic
      || tagged.tags.setProfile
      || tagged.tags.wearId
      || tagged.tags.place
    )
    if (!hasWork) continue
    blocks.push({
      text,
      delayMs: delayed.delayMs == null ? heuristicDelayMs(text) : delayed.delayMs,
      ...tagged.tags,
    })
  }
  if (!blocks.length) {
    const fallback = stripProtocolTags(raw)
    if (fallback) {
      blocks.push({ text: fallback, delayMs: heuristicDelayMs(fallback), ...emptyTags() })
    }
  }
  return blocks
}

export const PHOTO_REQUEST_RE =
  /\b(selfie|selfies|pics?|pictures?|photos?|nudes?|snaps?)\b|\b(send|show|snap)\b[\s\S]{0,24}\b(pic|photo|selfie|picture|nude)\b|\b((what|how) (do you|you) look|see (your )?face)\b|\b(that|last|earlier|previous)\b[\s\S]{0,20}\b(pic|photo|selfie|picture)\b|\b(wardrobe|outfit|shop clothes)\b/i

export const PROFILE_PIC_REQUEST_RE =
  /\bprofile (pic|photo|image)\b|\b(use|set|make)\b[\s\S]{0,32}\bprofile\b|\bchange (your )?profile\b/i

/**
 * True if a recent user bubble actually asked for a photo (client-side brake on eager [SEND_PIC]).
 * @param {{ role?: string, parts?: { text?: string }[], text?: string }[]} [apiMessages]
 */
export function userRecentlyAskedForPhoto(apiMessages = []) {
  let seen = 0
  for (let i = apiMessages.length - 1; i >= 0 && seen < 2; i--) {
    const m = apiMessages[i]
    if (m?.role !== 'user') continue
    const text = Array.isArray(m.parts)
      ? m.parts.map((p) => String(p?.text || '')).join(' ')
      : String(m.text || '')
    if (PHOTO_REQUEST_RE.test(text)) return true
    seen += 1
  }
  return false
}

export function userRecentlyAskedForProfilePic(apiMessages = []) {
  let seen = 0
  for (let i = apiMessages.length - 1; i >= 0 && seen < 3; i--) {
    const m = apiMessages[i]
    if (m?.role !== 'user') continue
    const text = Array.isArray(m.parts)
      ? m.parts.map((p) => String(p?.text || '')).join(' ')
      : String(m.text || '')
    if (PROFILE_PIC_REQUEST_RE.test(text)) return true
    seen += 1
  }
  return false
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}

export { PROTOCOL_TAG_RE }
