/**
 * Compact story bible for narrative generation — not the full character JSON.
 */

import { selectDisplay } from './selectDisplay'
import { compileChatTrait } from './compileCharacter'
import { renderLedgerForPrompt } from './ledger'

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim()
    if (s) return s
  }
  return ''
}

export const NARRATIVE_LENSES = [
  { id: 'random', label: 'Random' },
  { id: 'wanted', label: 'Wanted poster' },
  { id: 'confession', label: 'Drunken confession' },
  { id: 'personnel', label: 'Personnel file' },
  { id: 'eulogy', label: 'Eulogy' },
  { id: 'dating', label: 'Dating-app about me' },
  { id: 'interrogation', label: 'Interrogator’s notes' },
  { id: 'campfire', label: 'Campfire lie' },
]

export const LENS_INSTRUCTIONS = {
  wanted:
    'Form: a wanted poster or bounty docket. Dry, official, a little wrong about who they really are. Include one detail the authorities got right and one they invented.',
  confession:
    'Form: something they would only say after too much drink (or the local equivalent). First person, messy, not a speech. They almost take it back.',
  personnel:
    'Form: an internal file — clipped, bureaucratic, with one handwritten marginal note that undercuts the official line.',
  eulogy:
    'Form: someone speaking over them as if they were gone (or as if the speaker wishes they were). Unreliable. Love and grievance in the same breath.',
  dating:
    'Form: a dating-app bio they actually posted, plus the sentence they typed and deleted. Voice, not résumé.',
  interrogation:
    'Form: an interrogator’s notes after one session. What was asked, what was answered, what the silence meant.',
  campfire:
    'Form: the story they tell strangers at a fire or in a bunk. It is a lie that contains one true thing. Do not label which is which.',
}

export function pickNarrativeLens(lensId) {
  if (lensId && lensId !== 'random' && LENS_INSTRUCTIONS[lensId]) return lensId
  const ids = Object.keys(LENS_INSTRUCTIONS)
  return ids[Math.floor(Math.random() * ids.length)]
}

/**
 * Guess a default story genre from species / origin / genre prior when the user has not chosen one.
 * @param {Record<string, unknown>} c
 */
export function guessGenreFromCharacter(c) {
  const prior = selectDisplay(c, 'genre')
  if (prior === 'Modern') return 'Modern'
  if (prior === 'Sci-Fi') return 'Sci-Fi'
  if (prior === 'Fantasy') return 'High Fantasy'

  const species = selectDisplay(c, 'species').toLowerCase()
  const origin = selectDisplay(c, 'origin').toLowerCase()
  const hay = `${species} ${origin}`

  if (/android|cyborg|alien|orbital|martian|starship|generation ship/.test(hay)) return 'Sci-Fi'
  if (/cyber|neon|arcology|megacity/.test(hay) && /urban|arcology|megacity|cyber/.test(hay)) {
    return 'Cyberpunk'
  }
  if (/vampire|undead|demon|werewolf|horror|lich/.test(hay)) return 'Horror'
  if (/elf|dwarf|orc|fae|fairy|dragon|elemental|angel/.test(hay)) return 'High Fantasy'
  if (/urban megacity|rural heartland|frontier/.test(hay) && !/elf|dwarf|orc|fae/.test(species)) {
    return 'Modern'
  }
  return 'High Fantasy'
}

function pickNarrativeSpine(c) {
  const picks = []
  const add = (label, id) => {
    const v = selectDisplay(c, id)
    if (v) picks.push({ label, value: v })
  }
  add('Want', 'goal')
  add('Wound', 'trauma')
  add('The lie they believe', 'lie')
  add('Fear', 'fear')
  return picks.slice(0, 4)
}

function pickPhysicalTell(c) {
  const order = [
    ['Scars & markings', 'scars'],
    ['Distinguishing features', 'distinguishing_facial'],
    ['Non-human features', 'special_features'],
    ['Blemishes', 'blemishes'],
  ]
  for (const [label, id] of order) {
    const v = selectDisplay(c, id)
    if (!v) continue
    if (/^n\/a/i.test(v) || /^none/i.test(v) || v === 'Fully humanoid baseline' || v === 'Minimal / none visible') continue
    return `${label}: ${v}`
  }
  const height = selectDisplay(c, 'height')
  if (height) return `Height: ${height}`
  return ''
}

export function includeAdultInStoryBible(tone) {
  const t = String(tone || '')
  return t === 'Locker Room' || t === 'Romance'
}

/**
 * Compact bible: wound + want, not the psychology dump (that lives in chat compile).
 * @param {Record<string, unknown>} character
 * @param {{ includeAdult?: boolean, ledger?: { events?: object[] } | null }} [options]
 * @returns {Record<string, string>}
 */
export function buildStoryBible(character, options = {}) {
  const c = character || {}
  const { includeAdult = false, ledger = null } = options
  const bible = {
    name: firstNonEmpty(c.name, 'Unnamed'),
    species: selectDisplay(c, 'species'),
    origin: selectDisplay(c, 'origin'),
    occupation: selectDisplay(c, 'occupation'),
    sex: c.sex ? String(c.sex) : '',
    gender: c.gender ? String(c.gender) : '',
    speech_style: selectDisplay(c, 'speech_style'),
    voice: selectDisplay(c, 'voice'),
    lie: selectDisplay(c, 'lie'),
    want: selectDisplay(c, 'goal'),
    wound: selectDisplay(c, 'trauma'),
    physical_tell: pickPhysicalTell(c),
  }

  const spine = pickNarrativeSpine(c)
  spine.forEach((p, i) => {
    bible[`spine_${i + 1}`] = `${p.label}: ${p.value}`
  })

  if (includeAdult) {
    const kinks = compileChatTrait('kinks', c)
    const intimacy = compileChatTrait('intimacy_style', c)
    if (kinks) bible.kinks = kinks
    if (intimacy) bible.intimacy_style = intimacy
  }

  bible.life_ledger = renderLedgerForPrompt(ledger)

  const compact = {}
  Object.entries(bible).forEach(([k, v]) => {
    if (v) compact[k] = v
  })
  return compact
}
