/**
 * OCEAN → MBTI / Enneagram / alignment, plus soft OCEAN-conditioned weights for the
 * personality selects. Derived on roll with seeded noise; the fields stay editable.
 */

import { mathRng } from '../../utils/rng'

export const OCEAN_IDS = ['ocean_o', 'ocean_c', 'ocean_e', 'ocean_a', 'ocean_n']
export const OCEAN_DERIVED_IDS = ['mbti', 'enneagram', 'alignment']

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function oceanValue(c, id) {
  const n = Number(c?.[id])
  return Number.isFinite(n) ? clamp(n, 0, 100) : 50
}

// --- MBTI ---

export const MBTI_AXES = [
  { high: 'E', low: 'I', source: 'ocean_e', label: 'Extraversion' },
  { high: 'N', low: 'S', source: 'ocean_o', label: 'Openness' },
  { high: 'F', low: 'T', source: 'ocean_a', label: 'Agreeableness' },
  { high: 'J', low: 'P', source: 'ocean_c', label: 'Conscientiousness' },
]
export const MBTI_SOFTNESS = 20

export function mbtiHighProbability(value) {
  return clamp(0.5 + (value - 50) / (2 * MBTI_SOFTNESS), 0, 1)
}

export function deriveMbti(character, rng = mathRng) {
  return MBTI_AXES.map((axis) => (rng.chance(mbtiHighProbability(oceanValue(character, axis.source))) ? axis.high : axis.low)).join('')
}

// --- Enneagram ---

/** Target OCEAN profile per type as [target, weight]; weights say which traits define the type. */
export const ENNEAGRAM_PROFILES = [
  { id: 'Type 1 (Reformer)', ocean_o: [45, 0.3], ocean_c: [85, 1], ocean_e: [45, 0.3], ocean_a: [55, 0.4], ocean_n: [55, 0.5] },
  { id: 'Type 2 (Helper)', ocean_o: [55, 0.3], ocean_c: [55, 0.3], ocean_e: [75, 0.8], ocean_a: [85, 1], ocean_n: [55, 0.4] },
  { id: 'Type 3 (Achiever)', ocean_o: [55, 0.3], ocean_c: [80, 0.9], ocean_e: [75, 0.8], ocean_a: [45, 0.4], ocean_n: [30, 0.7] },
  { id: 'Type 4 (Individualist)', ocean_o: [85, 1], ocean_c: [40, 0.5], ocean_e: [30, 0.7], ocean_a: [50, 0.3], ocean_n: [80, 0.9] },
  { id: 'Type 5 (Investigator)', ocean_o: [80, 0.9], ocean_c: [55, 0.3], ocean_e: [20, 1], ocean_a: [35, 0.7], ocean_n: [50, 0.3] },
  { id: 'Type 6 (Loyalist)', ocean_o: [40, 0.4], ocean_c: [70, 0.7], ocean_e: [45, 0.3], ocean_a: [60, 0.5], ocean_n: [80, 1] },
  { id: 'Type 7 (Enthusiast)', ocean_o: [80, 0.9], ocean_c: [25, 0.8], ocean_e: [85, 1], ocean_a: [55, 0.3], ocean_n: [25, 0.8] },
  { id: 'Type 8 (Challenger)', ocean_o: [50, 0.2], ocean_c: [65, 0.5], ocean_e: [80, 0.9], ocean_a: [20, 1], ocean_n: [30, 0.7] },
  { id: 'Type 9 (Peacemaker)', ocean_o: [50, 0.3], ocean_c: [35, 0.6], ocean_e: [35, 0.7], ocean_a: [85, 1], ocean_n: [30, 0.8] },
]
export const ENNEAGRAM_TEMPERATURE = 0.06

export function enneagramDistance(profile, character) {
  let num = 0
  let den = 0
  for (const id of OCEAN_IDS) {
    const [target, w] = profile[id]
    const d = (oceanValue(character, id) - target) / 100
    num += w * d * d
    den += w
  }
  return Math.sqrt(num / den)
}

export function enneagramWeights(character) {
  return ENNEAGRAM_PROFILES.map((p) => ({ id: p.id, weight: Math.exp(-enneagramDistance(p, character) / ENNEAGRAM_TEMPERATURE) }))
}

export function deriveEnneagram(character, rng = mathRng) {
  return rng.weighted(enneagramWeights(character), (o) => o.weight).id
}

// --- Alignment ---

export const ALIGNMENT_NUDGES = {
  law: {
    values: { Tradition: 0.25, Conformity: 0.25, Security: 0.15, 'Self-direction': -0.25, Stimulation: -0.2 },
    moral_code: { 'Oaths are sacred': 0.2, 'Repay every debt': 0.15, 'Freedom above all': -0.3, 'Survival justifies means': -0.15 },
  },
  good: {
    values: { Benevolence: 0.25, Universalism: 0.25, Power: -0.3, Hedonism: -0.1 },
    vice: { Cruelty: -0.3, Wrath: -0.1, Greed: -0.1 },
    virtue: { Kindness: 0.2, Charity: 0.2 },
    moral_code: { 'Protect the weak': 0.2, 'Never harm the defenseless': 0.15, 'Survival justifies means': -0.15 },
  },
}
export const ALIGNMENT_BAND = 0.22
export const ALIGNMENT_NOISE = 0.25

function sumNudges(table, character) {
  let total = 0
  for (const [fieldId, map] of Object.entries(table)) {
    const v = character?.[fieldId]
    if (v && map[v]) total += map[v]
  }
  return total
}

export function alignmentAxes(character, rng = mathRng) {
  const noise = () => (rng.next() + rng.next() - 1) * ALIGNMENT_NOISE
  const law = clamp((oceanValue(character, 'ocean_c') - 50) / 50 + sumNudges(ALIGNMENT_NUDGES.law, character) + noise(), -1, 1)
  const good = clamp((oceanValue(character, 'ocean_a') - 50) / 50 + sumNudges(ALIGNMENT_NUDGES.good, character) + noise(), -1, 1)
  return { law, good }
}

export function deriveAlignment(character, rng = mathRng) {
  const { law, good } = alignmentAxes(character, rng)
  const lawWord = law > ALIGNMENT_BAND ? 'Lawful' : law < -ALIGNMENT_BAND ? 'Chaotic' : 'Neutral'
  const goodWord = good > ALIGNMENT_BAND ? 'Good' : good < -ALIGNMENT_BAND ? 'Evil' : 'Neutral'
  if (lawWord === 'Neutral' && goodWord === 'Neutral') return 'True Neutral'
  return `${lawWord} ${goodWord}`
}

// --- Soft coupling for rolled selects ---

export const OCEAN_OPTION_AFFINITY = {
  personality: {
    Brooding: { ocean_e: -1, ocean_n: 1 }, Cheerful: { ocean_e: 1, ocean_n: -1 }, Arrogant: { ocean_a: -1 },
    Protective: { ocean_a: 0.6, ocean_c: 0.4 }, Shy: { ocean_e: -1 }, Aggressive: { ocean_a: -1, ocean_n: 0.4 },
    Flirtatious: { ocean_e: 1, ocean_o: 0.4 }, Stoic: { ocean_n: -1, ocean_e: -0.4 }, Manic: { ocean_e: 0.7, ocean_n: 0.7, ocean_c: -0.5 },
    Curious: { ocean_o: 1 }, Paranoid: { ocean_n: 1, ocean_a: -0.5 }, Compassionate: { ocean_a: 1 },
  },
  attachment: {
    Secure: { ocean_n: -1, ocean_a: 0.4 }, 'Anxious-preoccupied': { ocean_n: 1, ocean_e: 0.3 },
    'Dismissive-avoidant': { ocean_a: -0.7, ocean_e: -0.5 }, 'Fearful-avoidant': { ocean_n: 1, ocean_a: -0.4 },
  },
  coping: {
    'Humor deflection': { ocean_e: 0.6 }, 'Withdrawal / shutdown': { ocean_e: -0.8 }, 'Overcontrol / planning': { ocean_c: 1 },
    'People-pleasing': { ocean_a: 1 }, Intellectualizing: { ocean_o: 0.8, ocean_e: -0.3 }, 'Substance / sensation': { ocean_c: -0.8, ocean_n: 0.4 },
    'Rage / confrontation': { ocean_a: -1 }, 'Care-taking others': { ocean_a: 0.8 }, 'Dissociation / numbness': { ocean_n: 0.8 },
    'Problem-solving hyperfocus': { ocean_c: 0.8 },
  },
  values: {
    'Self-direction': { ocean_o: 0.8 }, Stimulation: { ocean_o: 0.6, ocean_e: 0.6 }, Hedonism: { ocean_c: -0.6, ocean_e: 0.4 },
    Achievement: { ocean_c: 0.8 }, Power: { ocean_a: -0.8 }, Security: { ocean_n: 0.6, ocean_o: -0.4 },
    Conformity: { ocean_o: -0.8, ocean_a: 0.4 }, Tradition: { ocean_o: -0.8, ocean_c: 0.4 }, Benevolence: { ocean_a: 0.8 },
    Universalism: { ocean_o: 0.6, ocean_a: 0.6 },
  },
}

export function oceanWeightMultiplier(fieldId, optionId, character) {
  const affinity = OCEAN_OPTION_AFFINITY[fieldId]?.[optionId]
  if (!affinity) return 1
  let m = 1
  for (const [oceanId, sign] of Object.entries(affinity)) {
    const raw = Number(character?.[oceanId])
    if (!Number.isFinite(raw)) continue
    const z = (clamp(raw, 0, 100) - 50) / 50
    m *= clamp(1 + 0.9 * sign * z, 0.15, 2.5)
  }
  return clamp(m, 0.15, 2.5)
}

/**
 * Patch of derived fields for a roll. `locked(id)` skips a field; `touched(id)` says whether this
 * roll is allowed to recompute it (callers pass a predicate over the roll's hints).
 */
export function deriveFromOcean(character, rng = mathRng, { locked = () => false, touched = () => true } = {}) {
  const patch = {}
  if (!locked('mbti') && touched('mbti')) patch.mbti = deriveMbti(character, rng)
  if (!locked('enneagram') && touched('enneagram')) patch.enneagram = deriveEnneagram(character, rng)
  if (!locked('alignment') && touched('alignment')) patch.alignment = deriveAlignment(character, rng)
  return patch
}

/** Context-panel stats explaining how a derived field follows from OCEAN. */
export function describeDerivation(fieldId, character) {
  if (fieldId === 'mbti') {
    return MBTI_AXES.map((axis) => {
      const v = oceanValue(character, axis.source)
      const p = Math.round(mbtiHighProbability(v) * 100)
      return { label: `${axis.high}/${axis.low} ← ${axis.label}`, value: `${v} → ${p}% ${axis.high}` }
    })
  }
  if (fieldId === 'enneagram') {
    const weights = enneagramWeights(character)
    const total = weights.reduce((a, b) => a + b.weight, 0) || 1
    return weights
      .map((w) => ({ label: w.id.replace(/^Type (\d+) \((.+)\)$/, '$1 $2'), value: `${Math.round((w.weight / total) * 100)}%`, p: w.weight / total }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 3)
      .map(({ label, value }) => ({ label, value }))
  }
  if (fieldId === 'alignment') {
    const c = oceanValue(character, 'ocean_c')
    const a = oceanValue(character, 'ocean_a')
    return [
      { label: 'Law ↔ Chaos ← Conscientiousness', value: `${c} (${((c - 50) / 50 + sumNudges(ALIGNMENT_NUDGES.law, character)).toFixed(2)})` },
      { label: 'Good ↔ Evil ← Agreeableness', value: `${a} (${((a - 50) / 50 + sumNudges(ALIGNMENT_NUDGES.good, character)).toFixed(2)})` },
    ]
  }
  return []
}
