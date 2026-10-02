/**
 * Personality → motion style.
 *
 * Parallel to RANGE_BINS / compileOceanBehavior in compileCharacter.js, but returns
 * numeric knobs the motion generator can use directly instead of prose for a chat
 * prompt. Only motion-relevant fields are mapped; nothing here edits the option tables.
 */

import { CUSTOM_ID } from './shared'

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function bin(max, patch) {
  return { max, ...patch }
}

/** OCEAN sliders (0–100) → multiplicative knobs + weight nudges. */
export const MOTION_OCEAN_BINS = {
  ocean_e: [
    bin(29, { label: 'introverted', gestureFreq: 0.55, amplitude: 0.65, expressiveness: -22, note: 'Reserved body. Small, infrequent gestures; holds still when listening.' }),
    bin(69, { label: 'balanced', gestureFreq: 1.0, amplitude: 1.0, expressiveness: 0 }),
    bin(100, { label: 'extraverted', gestureFreq: 1.55, amplitude: 1.3, expressiveness: 22, note: 'Big, frequent gestures. Turns toward people, leans in, fills the space.', gestureWeights: { lean_in: 1.6, arms_open: 1.6, wave_greeting: 1.5, look_at_listener: 1.4 }, expressionWeights: { smile_broad: 1.5, laugh: 1.5 } }),
  ],
  ocean_n: [
    bin(29, { label: 'steady', pacing: 1.15, stillness: 18, note: 'Unhurried. Long holds. Hard to startle.', gestureWeights: { settle_still: 1.5, fidget: 0.4, tap: 0.4, startle_flinch: 0.4 } }),
    bin(69, { label: 'reactive', pacing: 1.0, stillness: 0 }),
    bin(100, { label: 'nervous', pacing: 0.8, stillness: -20, note: 'Micro-fidgets, short holds, quick glances away, easily startled.', gestureWeights: { fidget: 2.0, tap: 1.8, look_away: 1.6, hand_to_face: 1.5, startle_flinch: 1.6, settle_still: 0.5 }, expressionWeights: { concerned: 1.4, fear: 1.3, alert: 1.3 } }),
  ],
  ocean_o: [
    bin(29, { label: 'concrete', variety: 0.75, note: 'Narrow expression range; repeats a few reliable looks.' }),
    bin(69, { label: 'balanced', variety: 1.0 }),
    bin(100, { label: 'expansive', variety: 1.3, note: 'Wide, curious expression range. Tilts and double-takes at new ideas.', expressionWeights: { curious_tilt: 1.6, thinking: 1.5, surprised: 1.3 }, gestureWeights: { double_take: 1.5, look_around: 1.3 } }),
  ],
  ocean_c: [
    bin(29, { label: 'loose', jitter: 1.4, note: 'Erratic timing; gestures arrive early or late, overlap.' }),
    bin(69, { label: 'steady', jitter: 1.0 }),
    bin(100, { label: 'precise', jitter: 0.6, note: 'Metronomic, deliberate motion. Few wasted moves.', gestureWeights: { fidget: 0.5, tap: 0.6, settle_still: 1.3, chin_up: 1.2 } }),
  ],
  ocean_a: [
    bin(29, { label: 'guarded', note: 'Closed posture. Skeptical looks, arms crossed, leans back.', gestureWeights: { arms_cross: 1.8, lean_back: 1.5, chin_up: 1.3, nod: 0.6 }, expressionWeights: { skeptical_squint: 1.7, contempt: 1.5, smirk: 1.3, smile_soft: 0.6 } }),
    bin(69, { label: 'even' }),
    bin(100, { label: 'warm', note: 'Affiliative. Nods along, soft smiles, open arms.', gestureWeights: { nod: 1.8, lean_in: 1.4, arms_open: 1.3, look_at_listener: 1.4, arms_cross: 0.4 }, expressionWeights: { smile_soft: 1.8, concerned: 1.4, skeptical_squint: 0.5, contempt: 0.3 } }),
  ],
}

/**
 * Select-field option id → motion descriptor. Keyed by existing schema field id, then by
 * the option id as saved in the character sheet. Unlisted options are neutral.
 */
export const MOTION_TRAIT_TEXT = {
  battery: {
    'Deep Introvert': { pacing: 1.4, gestureFreq: 0.5, note: 'Conserves motion; spends it only when it matters.' },
    'Introvert': { pacing: 1.2, gestureFreq: 0.75 },
    'Ambivert': {},
    'Extrovert': { pacing: 0.85, gestureFreq: 1.3 },
    'Omnivert': { jitter: 1.3, note: 'Swings between stillness and bursts.' },
  },
  speech_style: {
    'Telegraphic (Short)': { hold: 0.7, note: 'Clipped beats; expressions land and release fast.' },
    'Labyrinthine (Complex)': { hold: 1.3, gestureFreq: 1.2, note: 'Long thinking holds; gestures unwind with the sentence.', expressionWeights: { thinking: 1.5 } },
    'Academic': { hold: 1.15, gestureWeights: { point_forward: 1.4, hand_to_face: 1.3 } },
    'Street/Slang': { amplitude: 1.15, gestureWeights: { lean_back: 1.3, chin_up: 1.3, shrug: 1.3 } },
    'Poetic': { pacing: 1.2, hold: 1.3, gestureWeights: { look_away: 1.4, hand_to_face: 1.2 } },
    'Military/Clipped': { jitter: 0.6, amplitude: 0.85, gestureWeights: { nod: 1.5, settle_still: 1.5, fidget: 0.3 }, expressionWeights: { alert: 1.4 } },
    'Formal': { amplitude: 0.8, jitter: 0.75, gestureWeights: { fidget: 0.4, chin_up: 1.2 } },
    'Sarcastic': { expressionWeights: { smirk: 2.0, skeptical_squint: 1.5, contempt: 1.3 }, gestureWeights: { shrug: 1.4, lean_back: 1.3 } },
    'Mumbling': { amplitude: 0.7, expressiveness: -10, gestureWeights: { look_away: 1.6, head_drop: 1.3 } },
  },
  gait: {
    'Staccato': { jitter: 1.3, hold: 0.7 },
    'Lumbering': { pacing: 1.35, amplitude: 1.2, hold: 1.3 },
    'Gliding': { jitter: 0.6, pacing: 1.1, gestureWeights: { idle_sway: 1.4, settle_still: 1.2 } },
    'Shuffling': { amplitude: 0.75, gestureWeights: { head_drop: 1.3, fidget: 1.2 } },
    'Strutting': { amplitude: 1.25, gestureWeights: { chin_up: 1.6, arms_open: 1.3 } },
    'Prowling': { pacing: 1.1, gestureWeights: { look_around: 1.6, lean_in: 1.3, settle_still: 1.3 }, expressionWeights: { alert: 1.4 } },
    'Bouncing': { pacing: 0.75, gestureFreq: 1.4, amplitude: 1.15 },
    'Mechanical': { jitter: 0.4, note: 'Motion arrives in discrete steps, no easing.' },
    'Slithering': { jitter: 0.5, pacing: 1.2, gestureWeights: { idle_sway: 1.6 } },
    'Floating': { pacing: 1.3, amplitude: 0.85, gestureWeights: { idle_sway: 1.5, breathe: 1.4 } },
  },
  aura: {
    'Warm & Inviting': { expressionWeights: { smile_soft: 1.6 }, gestureWeights: { lean_in: 1.4, nod: 1.3 } },
    'Cold & Distant': { amplitude: 0.75, expressiveness: -12, gestureWeights: { lean_back: 1.5, look_away: 1.3, arms_cross: 1.3 } },
    'Electrifying': { gestureFreq: 1.3, amplitude: 1.2, expressionWeights: { alert: 1.3, smile_broad: 1.3 } },
    'Calming': { pacing: 1.25, stillness: 15, gestureWeights: { breathe: 1.6, settle_still: 1.5 }, expressionWeights: { blink_slow: 1.4 } },
    'Menacing': { pacing: 1.15, stillness: 12, expressionWeights: { angry_narrow: 1.4, contempt: 1.4, smirk: 1.3 }, gestureWeights: { chin_up: 1.4, lean_in: 1.3, settle_still: 1.4 } },
    'Mysterious': { expressiveness: -8, expressionWeights: { smirk: 1.4, thinking: 1.3 }, gestureWeights: { look_away: 1.3 } },
    'Chaotic': { jitter: 1.6, gestureFreq: 1.3 },
    'Regal': { amplitude: 0.9, jitter: 0.6, gestureWeights: { chin_up: 1.8, settle_still: 1.3, fidget: 0.3 } },
    'Magnetic': { gestureWeights: { look_at_listener: 1.6, lean_in: 1.3 }, expressionWeights: { smile_soft: 1.3, wink: 1.4 } },
    'Unsettling': { jitter: 1.3, stillness: 10, expressionWeights: { blink_slow: 1.6, smirk: 1.3 }, gestureWeights: { settle_still: 1.5, double_take: 1.3 } },
  },
  tic: {
    'Long pauses': { hold: 1.4, stillness: 12 },
    'Cracks knuckles': { gestureWeights: { fidget: 2.0 } },
    'Clicks tongue': { expressionWeights: { smirk: 1.3 } },
    'Eye twitch': { gestureFreq: 1.1, expressionWeights: { blink_slow: 1.5, skeptical_squint: 1.3 } },
    'Fidgets with hands': { gestureWeights: { fidget: 2.5, hand_to_face: 1.5 } },
    'Taps foot': { gestureWeights: { tap: 2.5 } },
    'Whispers': { amplitude: 0.7, gestureWeights: { lean_in: 1.6 } },
    'Clears throat often': { gestureWeights: { hand_to_face: 1.5 } },
  },
  humor: {
    'Dry/Deadpan': { expressiveness: -12, expressionWeights: { neutral: 1.6, smirk: 1.3, smile_broad: 0.4 } },
    'Slapstick': { amplitude: 1.3, gestureFreq: 1.3, expressionWeights: { surprised: 1.4, laugh: 1.4 } },
    'Self-Deprecating': { gestureWeights: { shrug: 1.6, head_drop: 1.3 }, expressionWeights: { smile_soft: 1.3 } },
    'Dark/Morbid': { expressionWeights: { smirk: 1.5, contempt: 1.2 } },
    'Witty/Puns': { expressionWeights: { wink: 1.6, smirk: 1.4 } },
    'Absurdist': { jitter: 1.3, expressionWeights: { confused_tilt: 1.4, surprised: 1.3 } },
  },
  dynamic: {
    'Dominant': { amplitude: 1.15, gestureWeights: { chin_up: 1.6, point_forward: 1.4, lean_in: 1.2 } },
    'Submissive': { amplitude: 0.8, gestureWeights: { head_drop: 1.5, look_away: 1.4, nod: 1.4 } },
    'Wallflower': { gestureFreq: 0.6, expressiveness: -15, gestureWeights: { look_away: 1.6, settle_still: 1.4, arms_cross: 1.2 } },
    'Center of Attention': { gestureFreq: 1.4, amplitude: 1.3, gestureWeights: { arms_open: 1.6, wave_greeting: 1.4 }, expressionWeights: { smile_broad: 1.5 } },
    'Mediator': { gestureWeights: { nod: 1.6, look_at_listener: 1.4 }, expressionWeights: { concerned: 1.3, smile_soft: 1.3 } },
    'Primal': { amplitude: 1.3, jitter: 1.2, expressionWeights: { alert: 1.4, angry_narrow: 1.3 } },
    'Gentleman': { amplitude: 0.9, jitter: 0.75, gestureWeights: { nod: 1.4, chin_up: 1.2 } },
  },
  personality: {
    'Brooding': { expressiveness: -15, stillness: 12, expressionWeights: { thinking: 1.5, sad: 1.3, smile_broad: 0.4 }, gestureWeights: { look_away: 1.5, head_drop: 1.3 } },
    'Cheerful': { expressiveness: 15, expressionWeights: { smile_soft: 1.6, smile_broad: 1.6, laugh: 1.4, sad: 0.4 }, gestureWeights: { nod: 1.3 } },
    'Arrogant': { expressionWeights: { contempt: 1.7, smirk: 1.6, concerned: 0.5 }, gestureWeights: { chin_up: 1.8, lean_back: 1.4 } },
    'Protective': { expressionWeights: { alert: 1.5, concerned: 1.5 }, gestureWeights: { look_around: 1.5, lean_in: 1.3 } },
    'Shy': { amplitude: 0.65, gestureFreq: 0.7, expressiveness: -18, expressionWeights: { smile_soft: 1.3, smile_broad: 0.5 }, gestureWeights: { look_away: 1.8, head_drop: 1.4, hand_to_face: 1.4, arms_open: 0.3, wave_greeting: 0.5 } },
    'Aggressive': { amplitude: 1.3, jitter: 1.2, expressionWeights: { angry_narrow: 1.8, alert: 1.3 }, gestureWeights: { lean_in: 1.6, point_forward: 1.5, chin_up: 1.3 } },
    'Flirtatious': { expressionWeights: { wink: 2.0, smirk: 1.5, smile_soft: 1.4, pout: 1.4 }, gestureWeights: { lean_in: 1.5, look_away: 1.2, hand_to_face: 1.3 } },
    'Stoic': { amplitude: 0.7, gestureFreq: 0.6, expressiveness: -20, stillness: 20, expressionWeights: { neutral: 2.0 }, gestureWeights: { settle_still: 2.0, fidget: 0.2 } },
    'Manic': { pacing: 0.65, gestureFreq: 1.6, jitter: 1.5, amplitude: 1.2, expressionWeights: { smile_broad: 1.4, surprised: 1.3 } },
    'Curious': { expressionWeights: { curious_tilt: 2.0, thinking: 1.4, surprised: 1.2 }, gestureWeights: { lean_in: 1.4, double_take: 1.4, look_around: 1.3 } },
    'Paranoid': { jitter: 1.2, expressionWeights: { alert: 1.6, skeptical_squint: 1.6, fear: 1.3 }, gestureWeights: { look_around: 2.0, startle_flinch: 1.5, lean_back: 1.3 } },
    'Compassionate': { expressionWeights: { concerned: 1.7, smile_soft: 1.5 }, gestureWeights: { nod: 1.6, lean_in: 1.4, look_at_listener: 1.4 } },
  },
  attachment: {
    'Secure': { jitter: 0.85 },
    'Anxious-preoccupied': { gestureWeights: { look_at_listener: 1.5, fidget: 1.4, hand_to_face: 1.3 }, expressionWeights: { concerned: 1.4 } },
    'Dismissive-avoidant': { gestureWeights: { lean_back: 1.5, look_away: 1.4, arms_cross: 1.4 }, expressionWeights: { neutral: 1.3 } },
    'Fearful-avoidant': { jitter: 1.2, gestureWeights: { lean_in: 1.2, lean_back: 1.3, look_away: 1.3 } },
  },
  coping: {
    'Humor deflection': { expressionWeights: { smirk: 1.4, laugh: 1.3 }, gestureWeights: { shrug: 1.4 } },
    'Withdrawal / shutdown': { expressiveness: -12, gestureWeights: { head_drop: 1.5, settle_still: 1.4, look_away: 1.3 } },
    'Overcontrol / planning': { jitter: 0.65, gestureWeights: { settle_still: 1.3, fidget: 0.6 } },
    'People-pleasing': { gestureWeights: { nod: 1.8, look_at_listener: 1.4 }, expressionWeights: { smile_soft: 1.5 } },
    'Rage / confrontation': { amplitude: 1.2, expressionWeights: { angry_narrow: 1.6 }, gestureWeights: { lean_in: 1.4, point_forward: 1.3 } },
    'Dissociation / numbness': { expressiveness: -15, stillness: 15, expressionWeights: { neutral: 1.6, blink_slow: 1.4 } },
    'Problem-solving hyperfocus': { gestureWeights: { settle_still: 1.4, hand_to_face: 1.3 }, expressionWeights: { thinking: 1.8 } },
  },
  alignment: {
    'Lawful Good': { jitter: 0.8, gestureWeights: { nod: 1.2 } },
    'Lawful Neutral': { jitter: 0.75 },
    'Lawful Evil': { jitter: 0.7, expressionWeights: { contempt: 1.3, smirk: 1.2 } },
    'Chaotic Good': { jitter: 1.25, gestureFreq: 1.1 },
    'Chaotic Neutral': { jitter: 1.4 },
    'Chaotic Evil': { jitter: 1.4, expressionWeights: { angry_narrow: 1.2, smirk: 1.3 } },
    'Neutral Evil': { expressionWeights: { contempt: 1.3 } },
  },
  enneagram: {
    'Type 1 (Reformer)': { jitter: 0.75, gestureWeights: { chin_up: 1.2 } },
    'Type 2 (Helper)': { gestureWeights: { nod: 1.4, lean_in: 1.3 }, expressionWeights: { smile_soft: 1.3 } },
    'Type 3 (Achiever)': { amplitude: 1.1, gestureWeights: { chin_up: 1.3 }, expressionWeights: { smile_broad: 1.3 } },
    'Type 4 (Individualist)': { expressionWeights: { sad: 1.3, thinking: 1.3 }, gestureWeights: { look_away: 1.3 } },
    'Type 5 (Investigator)': { gestureFreq: 0.75, expressionWeights: { thinking: 1.5, curious_tilt: 1.3 } },
    'Type 6 (Loyalist)': { expressionWeights: { alert: 1.3, concerned: 1.3 }, gestureWeights: { look_around: 1.3 } },
    'Type 7 (Enthusiast)': { gestureFreq: 1.3, expressionWeights: { smile_broad: 1.4, laugh: 1.3 } },
    'Type 8 (Challenger)': { amplitude: 1.2, gestureWeights: { lean_in: 1.4, chin_up: 1.3 } },
    'Type 9 (Peacemaker)': { pacing: 1.15, stillness: 10, gestureWeights: { nod: 1.3, settle_still: 1.2 } },
  },
}

export const MOTION_STYLE_FIELD_IDS = [
  'ocean_o', 'ocean_c', 'ocean_e', 'ocean_a', 'ocean_n',
  ...Object.keys(MOTION_TRAIT_TEXT),
]

function oceanBin(fieldId, value) {
  const bins = MOTION_OCEAN_BINS[fieldId]
  const n = clamp(Number(value ?? 50) || 50, 0, 100)
  return bins.find((b) => n <= b.max) || bins[bins.length - 1]
}

function emptyStyle() {
  return {
    pacingMsMultiplier: 1,
    amplitudeMultiplier: 1,
    holdMsMultiplier: 1,
    gestureFrequencyMultiplier: 1,
    jitterMultiplier: 1,
    varietyMultiplier: 1,
    expressivenessScore: 50,
    stillnessTolerance: 50,
    preferredExpressionWeights: {},
    preferredGestureWeights: {},
    promptNotes: [],
  }
}

function applyDescriptor(style, d) {
  if (!d) return
  if (d.pacing) style.pacingMsMultiplier *= d.pacing
  if (d.amplitude) style.amplitudeMultiplier *= d.amplitude
  if (d.hold) style.holdMsMultiplier *= d.hold
  if (d.gestureFreq) style.gestureFrequencyMultiplier *= d.gestureFreq
  if (d.jitter) style.jitterMultiplier *= d.jitter
  if (d.variety) style.varietyMultiplier *= d.variety
  if (d.expressiveness) style.expressivenessScore += d.expressiveness
  if (d.stillness) style.stillnessTolerance += d.stillness
  if (d.expressionWeights) {
    for (const [id, w] of Object.entries(d.expressionWeights)) {
      style.preferredExpressionWeights[id] = (style.preferredExpressionWeights[id] ?? 1) * w
    }
  }
  if (d.gestureWeights) {
    for (const [id, w] of Object.entries(d.gestureWeights)) {
      style.preferredGestureWeights[id] = (style.preferredGestureWeights[id] ?? 1) * w
    }
  }
  if (d.note) style.promptNotes.push(d.note)
}

/**
 * Compile a character's existing traits into a numeric motion-style profile.
 * Never throws; a default/empty character yields neutral multipliers.
 * @param {Record<string, unknown>} character
 */
export function compileMotionStyle(character) {
  const c = character && typeof character === 'object' ? character : {}
  const style = emptyStyle()

  for (const id of ['ocean_o', 'ocean_c', 'ocean_e', 'ocean_a', 'ocean_n']) {
    applyDescriptor(style, oceanBin(id, c[id]))
  }

  for (const [fieldId, table] of Object.entries(MOTION_TRAIT_TEXT)) {
    const raw = c[fieldId]
    if (raw == null || raw === '' || raw === CUSTOM_ID) continue
    applyDescriptor(style, table[String(raw)])
  }

  const quirk = c.quirk === CUSTOM_ID ? String(c.quirk_custom || '').trim() : String(c.quirk || '').trim()
  if (quirk) style.promptNotes.push(`Recurring quirk to physicalize: ${quirk}.`)

  style.pacingMsMultiplier = clamp(style.pacingMsMultiplier, 0.4, 2.5)
  style.amplitudeMultiplier = clamp(style.amplitudeMultiplier, 0.3, 2.0)
  style.holdMsMultiplier = clamp(style.holdMsMultiplier, 0.4, 2.5)
  style.gestureFrequencyMultiplier = clamp(style.gestureFrequencyMultiplier, 0.25, 3.0)
  style.jitterMultiplier = clamp(style.jitterMultiplier, 0.2, 2.5)
  style.varietyMultiplier = clamp(style.varietyMultiplier, 0.5, 1.6)
  style.expressivenessScore = Math.round(clamp(style.expressivenessScore, 5, 100))
  style.stillnessTolerance = Math.round(clamp(style.stillnessTolerance, 0, 100))
  for (const k of Object.keys(style.preferredExpressionWeights)) {
    style.preferredExpressionWeights[k] = clamp(style.preferredExpressionWeights[k], 0.05, 6)
  }
  for (const k of Object.keys(style.preferredGestureWeights)) {
    style.preferredGestureWeights[k] = clamp(style.preferredGestureWeights[k], 0.05, 6)
  }
  return style
}
