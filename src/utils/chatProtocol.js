/**
 * Parse Adonis-style chat control tags from a model reply.
 */

const DELAY_CAP_MS = 8000

export function stripProtocolTags(raw) {
  return String(raw ?? '')
    .replace(/\[SEND_PIC:\s*[\s\S]*?\]/gi, '*[Sent a photo]*')
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

function extractSendPic(block) {
  let picDescription = ''
  const text = String(block || '').replace(/\[SEND_PIC:\s*([\s\S]*?)\]/gi, (_, desc) => {
    picDescription = String(desc || '').trim()
    return ''
  })
  return { text, picDescription }
}

/**
 * @param {string} rawReply
 * @returns {{ text: string, delayMs: number, picDescription: string }[]}
 */
export function parseReplyBlocks(rawReply) {
  const raw = String(rawReply ?? '')
  const chunks = raw.split(/\[SPLIT\]/i)
  const blocks = []
  for (const chunk of chunks) {
    const delayed = extractDelayMs(chunk)
    const pictured = extractSendPic(delayed.text)
    const text = pictured.text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    if (!text && !pictured.picDescription) continue
    blocks.push({
      text,
      delayMs: delayed.delayMs == null ? heuristicDelayMs(text) : delayed.delayMs,
      picDescription: pictured.picDescription,
    })
  }
  if (!blocks.length) {
    const fallback = stripProtocolTags(raw)
    if (fallback) {
      blocks.push({ text: fallback, delayMs: heuristicDelayMs(fallback), picDescription: '' })
    }
  }
  return blocks
}

export const PHOTO_REQUEST_RE =
  /\b(selfie|selfies|pics?|pictures?|photos?|nudes?|snaps?)\b|\b(send|show|snap)\b[\s\S]{0,24}\b(pic|photo|selfie|picture|nude)\b|\b((what|how) (do you|you) look|see (your )?face)\b/i

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

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
}
