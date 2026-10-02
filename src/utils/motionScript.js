/**
 * Motion scripts: hardware-agnostic timelines of expression / gesture / speech-sync cues.
 *
 * Shape (MOTION_SCRIPT_SCHEMA_VERSION 1):
 *   MotionEvent  { tMs, track: 'expression'|'gesture'|'pose'|'speechSync', id,
 *                  intensity?: 0..1, holdMs?, transitionMs?, loop? }
 *   MotionScript { schemaVersion, characterId, rigProfileId,
 *                  meta: { scene, sourceLine, generatedAt, source: 'llm'|'local', durationMs },
 *                  events: MotionEvent[] }   // flat, time-sorted
 *
 * Every producer (local or LLM) must pass its draft through `validateAndClampMotionScript`,
 * which never throws and always returns a playable script — the motion analog of
 * chatProtocol.js clamping [DELAY] with DELAY_CAP_MS.
 *
 * Extension seam (not built yet): chatProtocol.parseReplyBlocks() yields { text, delayMs }
 * per chat bubble — each block's text is a natural `sourceLine` for a per-line script
 * during live chat.
 */

import { pickWeightedFrom } from '../data/options/shared'
import { compileMotionStyle } from '../data/options/motionBehavior'
import { MOTION_TRACKS, isCanonicalId, gestureById } from '../data/motionVocabulary'
import {
  DEFAULT_RIG_PROFILE,
  DEFAULT_RIG_PROFILE_ID,
  rigSupports,
  supportedExpressionIds,
  supportedGestureIds,
} from '../data/rigProfiles'
import { compileChatTrait, compileOceanBehavior } from './compileCharacter'
import { selectDisplay } from './selectDisplay'

export const MOTION_SCRIPT_SCHEMA_VERSION = 1
export const MAX_SCRIPT_DURATION_MS = 60_000
export const MIN_SCRIPT_DURATION_MS = 500
export const MIN_EVENT_GAP_MS = 80
export const DEFAULT_SCENE_DURATION_MS = 8_000
export const MAX_SAVED_SCRIPTS = 12

export const MOTION_SCENES = [
  { id: 'idle', label: 'Idle', direction: 'Alone, waiting. Ambient life only; nothing is happening yet.', expressionWeights: { neutral: 2.5, blink_slow: 1.6, thinking: 1.2, sleepy_droop: 1.1, laugh: 0.2, surprised: 0.2, fear: 0.1, angry_narrow: 0.2 }, gestureWeights: { idle_sway: 2.5, breathe: 2.0, look_around: 1.6, settle_still: 1.4, wave_greeting: 0.1, point_forward: 0.1, startle_flinch: 0.1 } },
  { id: 'greeting', label: 'Greeting', direction: 'Someone just walked up. First contact; size them up and welcome (or not).', expressionWeights: { smile_soft: 2.0, curious_tilt: 1.6, alert: 1.4, smile_broad: 1.3, sleepy_droop: 0.1 }, gestureWeights: { look_at_listener: 2.5, nod: 1.8, wave_greeting: 1.8, lean_in: 1.4, chin_up: 1.2, idle_sway: 0.4 } },
  { id: 'listening', label: 'Listening', direction: 'Someone is talking to them. React without speaking; show that the words land.', expressionWeights: { curious_tilt: 1.8, concerned: 1.3, thinking: 1.5, skeptical_squint: 1.2, surprised: 1.1, neutral: 1.2 }, gestureWeights: { nod: 2.5, look_at_listener: 2.0, lean_in: 1.5, hand_to_face: 1.2, look_away: 0.8, idle_sway: 0.5 } },
  { id: 'speaking', label: 'Speaking', direction: 'They are delivering the source line. Motion punctuates speech.', expressionWeights: { neutral: 1.2, smile_soft: 1.2, alert: 1.1, thinking: 1.1 }, gestureWeights: { point_forward: 1.5, shrug: 1.3, arms_open: 1.3, nod: 1.2, look_at_listener: 1.6, lean_in: 1.1, idle_sway: 0.4 } },
  { id: 'alarmed', label: 'Alarmed', direction: 'Something sudden and wrong just happened. Startle, assess, decide.', expressionWeights: { surprised: 2.5, alert: 2.2, fear: 1.6, recoil: 1.5, angry_narrow: 1.2, smile_soft: 0.2, smile_broad: 0.1, sleepy_droop: 0.05 }, gestureWeights: { startle_flinch: 2.5, look_around: 2.0, lean_back: 1.8, double_take: 1.6, chin_up: 1.1, idle_sway: 0.2, breathe: 0.5 } },
  { id: 'farewell', label: 'Farewell', direction: 'The visitor is leaving. Let them go — warmly, coldly, or reluctantly.', expressionWeights: { smile_soft: 1.8, sad: 1.3, neutral: 1.3, wink: 1.1 }, gestureWeights: { wave_greeting: 2.2, nod: 1.6, look_at_listener: 1.4, look_away: 1.2, head_drop: 1.0, settle_still: 1.2 } },
]

export function findScene(id) {
  return MOTION_SCENES.find((s) => s.id === id) || MOTION_SCENES[0]
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function clamp01(n) {
  return clamp(n, 0, 1)
}

function finite(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function clampScriptDuration(v) {
  return Math.round(clamp(finite(v, DEFAULT_SCENE_DURATION_MS), MIN_SCRIPT_DURATION_MS, MAX_SCRIPT_DURATION_MS))
}

function normalizeMeta(raw, overrides = {}) {
  const m = isPlainObject(raw) ? raw : {}
  const merged = { ...m, ...overrides }
  return {
    scene: String(merged.scene || 'idle'),
    sourceLine: String(merged.sourceLine || ''),
    generatedAt: finite(merged.generatedAt, Date.now()),
    source: merged.source === 'llm' ? 'llm' : 'local',
    durationMs: clampScriptDuration(merged.durationMs),
  }
}

/**
 * Coerce, drop, clamp, sort and rate-limit a draft script against a rig. Never throws.
 * @param {unknown} rawScript
 * @param {object|null} rigProfile — null means the permissive DEFAULT_RIG_PROFILE
 * @param {{ characterId?: string, meta?: object }} [opts]
 * @returns {{ script: object, warnings: string[] }}
 */
export function validateAndClampMotionScript(rawScript, rigProfile, opts = {}) {
  const warnings = []
  const rig = rigProfile || DEFAULT_RIG_PROFILE
  const src = isPlainObject(rawScript) ? rawScript : {}
  const meta = normalizeMeta(src.meta, opts.meta)
  const durationMs = meta.durationMs

  const rawEvents = Array.isArray(src.events) ? src.events : []
  if (!Array.isArray(src.events)) warnings.push('Script had no events array.')

  const dropped = { malformed: 0, unknownTrack: 0, unknownId: [], unsupported: [] }
  const kept = []
  rawEvents.forEach((ev) => {
    if (!isPlainObject(ev)) { dropped.malformed += 1; return }
    const track = String(ev.track || '')
    if (!MOTION_TRACKS.includes(track)) { dropped.unknownTrack += 1; return }
    const id = String(ev.id || '').trim()
    if (!isCanonicalId(track, id)) { dropped.unknownId.push(`${track}:${id || '(empty)'}`); return }
    if (!rigSupports(rig, track, id)) { dropped.unsupported.push(`${track}:${id}`); return }
    const tMs = Math.round(clamp(finite(ev.tMs, NaN), 0, durationMs))
    if (!Number.isFinite(tMs)) { dropped.malformed += 1; return }
    const out = { tMs, track, id }
    if (track === 'expression' || track === 'gesture' || track === 'pose') {
      out.intensity = clamp01(finite(ev.intensity, 0.7))
    }
    if (ev.holdMs != null) out.holdMs = Math.max(0, Math.round(finite(ev.holdMs, 0)))
    if (ev.transitionMs != null) out.transitionMs = Math.max(0, Math.round(finite(ev.transitionMs, 0)))
    if (ev.loop != null) out.loop = !!ev.loop
    kept.push(out)
  })

  if (dropped.malformed) warnings.push(`Dropped ${dropped.malformed} malformed event(s).`)
  if (dropped.unknownTrack) warnings.push(`Dropped ${dropped.unknownTrack} event(s) with an unknown track.`)
  if (dropped.unknownId.length) warnings.push(`Dropped non-canonical ids: ${[...new Set(dropped.unknownId)].join(', ')}.`)
  if (dropped.unsupported.length) warnings.push(`Dropped ids the rig "${rig.name}" does not support: ${[...new Set(dropped.unsupported)].join(', ')}.`)

  kept.sort((a, b) => a.tMs - b.tMs)

  const c = rig.constraints || {}
  const gapFor = (track) => {
    if (track === 'expression') return Math.max(MIN_EVENT_GAP_MS, finite(c.minGapMsBetweenExpressionChanges, 0))
    if (track === 'gesture' || track === 'pose') return Math.max(MIN_EVENT_GAP_MS, finite(c.minGapMsBetweenGestures, 0))
    return 0
  }
  const lastByTrack = {}
  let gapDropped = 0
  const spaced = kept.filter((ev) => {
    const gap = gapFor(ev.track)
    if (!gap) return true
    const last = lastByTrack[ev.track]
    if (last != null && ev.tMs - last < gap) { gapDropped += 1; return false }
    lastByTrack[ev.track] = ev.tMs
    return true
  })
  if (gapDropped) warnings.push(`Dropped ${gapDropped} event(s) that violated the rig's minimum gap.`)

  const maxPerMin = finite(c.maxEventsPerMinute, 0)
  let events = spaced
  if (maxPerMin > 0) {
    const motion = spaced.filter((e) => e.track !== 'speechSync')
    const limit = Math.max(1, Math.ceil((maxPerMin * durationMs) / 60_000))
    if (motion.length > limit) {
      const keepIdx = new Set()
      for (let i = 0; i < limit; i++) keepIdx.add(Math.floor((i * motion.length) / limit))
      const keepSet = new Set(motion.filter((_, i) => keepIdx.has(i)))
      events = spaced.filter((e) => e.track === 'speechSync' || keepSet.has(e))
      warnings.push(`Downsampled ${motion.length} motion events to ${limit} to respect ${maxPerMin}/min.`)
    }
  }

  const script = {
    schemaVersion: MOTION_SCRIPT_SCHEMA_VERSION,
    characterId: String(opts.characterId ?? src.characterId ?? ''),
    rigProfileId: rigProfile ? String(rig.id || '') : (String(src.rigProfileId || '') || DEFAULT_RIG_PROFILE_ID),
    meta,
    events,
  }
  return { script, warnings }
}

function weightedPool(ids, ...weightMaps) {
  return ids.map((id) => ({
    id,
    weight: weightMaps.reduce((w, m) => w * (m?.[id] ?? 1), 1),
  }))
}

function pickAvoiding(pool, lastId) {
  if (!pool.length) return ''
  let id = pickWeightedFrom(pool)
  if (id === lastId && pool.length > 1) id = pickWeightedFrom(pool.filter((p) => p.id !== lastId))
  return id
}

function estimateSpeechMs(line) {
  const words = String(line || '').trim().split(/\s+/).filter(Boolean).length
  return words ? 600 + words * 330 : 0
}

/**
 * Procedural generator: no API key required. Personality style × rig capability × scene.
 * @param {Record<string, unknown>} character
 * @param {object|null} rigProfile
 * @param {{ scene?: string, sourceLine?: string, durationMs?: number, characterId?: string }} [opts]
 */
export function buildLocalMotionScript(character, rigProfile, opts = {}) {
  const rig = rigProfile || DEFAULT_RIG_PROFILE
  const scene = findScene(opts.scene)
  const durationMs = clampScriptDuration(opts.durationMs)
  const sourceLine = String(opts.sourceLine || '')
  const style = compileMotionStyle(character)

  const exprPool = weightedPool(supportedExpressionIds(rig), scene.expressionWeights, style.preferredExpressionWeights)
  const gestPool = weightedPool(supportedGestureIds(rig), scene.gestureWeights, style.preferredGestureWeights)
  const c = rig.constraints || {}
  const exprGap = Math.max(MIN_EVENT_GAP_MS, finite(c.minGapMsBetweenExpressionChanges, 0))
  const gestGap = Math.max(MIN_EVENT_GAP_MS, finite(c.minGapMsBetweenGestures, 0))

  const events = []
  const restId = exprPool.some((p) => p.id === 'neutral') ? 'neutral' : exprPool[0]?.id
  if (restId) events.push({ tMs: 0, track: 'expression', id: restId, intensity: 0.5, holdMs: 400 })
  const ambient = ['breathe', 'idle_sway'].find((id) => gestPool.some((p) => p.id === id))
  if (ambient) events.push({ tMs: 0, track: 'gesture', id: ambient, intensity: clamp01(0.3 * style.amplitudeMultiplier + 0.1), loop: true })

  const speechMs = sourceLine && c.speechSyncSupported !== false ? Math.min(durationMs, estimateSpeechMs(sourceLine)) : 0
  if (speechMs) {
    events.push({ tMs: 0, track: 'speechSync', id: 'line_start' })
    events.push({ tMs: speechMs, track: 'speechSync', id: 'line_end' })
  }

  const baseGap = clamp(700 + (100 - style.expressivenessScore) * 24, 350, 4500) * style.pacingMsMultiplier
  const gestureProb = clamp(0.42 * style.gestureFrequencyMultiplier, 0.08, 0.8)
  const holdBase = (450 + style.stillnessTolerance * 9) * style.holdMsMultiplier

  let t = 0
  let lastExpr = restId
  let lastGest = ambient
  let lastExprAt = 0
  let lastGestAt = 0
  for (let guard = 0; guard < 400; guard++) {
    const jitter = 1 + (Math.random() * 2 - 1) * 0.45 * style.jitterMultiplier
    t += Math.max(MIN_EVENT_GAP_MS, Math.round(baseGap * jitter))
    if (t >= durationMs) break

    const wantGesture = Math.random() < gestureProb
    if (wantGesture && gestPool.length && t - lastGestAt >= gestGap) {
      const id = pickAvoiding(gestPool, lastGest)
      const g = gestureById(id)
      const loopable = !!g?.tags.includes('loopable')
      events.push({
        tMs: t,
        track: 'gesture',
        id,
        intensity: clamp01((0.35 + Math.random() * 0.45) * style.amplitudeMultiplier),
        holdMs: Math.round(holdBase * (loopable ? 2 : 1)),
        ...(loopable ? { loop: true } : {}),
      })
      lastGest = id
      lastGestAt = t
    } else if (exprPool.length && t - lastExprAt >= exprGap) {
      const id = pickAvoiding(exprPool, lastExpr)
      events.push({
        tMs: t,
        track: 'expression',
        id,
        intensity: clamp01((0.4 + Math.random() * 0.45) * style.amplitudeMultiplier),
        holdMs: Math.round(holdBase),
      })
      lastExpr = id
      lastExprAt = t
    }
  }

  const draft = {
    schemaVersion: MOTION_SCRIPT_SCHEMA_VERSION,
    characterId: opts.characterId || '',
    rigProfileId: rig.id,
    meta: { scene: scene.id, sourceLine, generatedAt: Date.now(), source: 'local', durationMs },
    events,
  }
  return validateAndClampMotionScript(draft, rigProfile, { characterId: opts.characterId }).script
}

/**
 * Compact bible for the LLM path — personality, motion style, scene, and rig limits.
 * Deliberately small, like storyBible.buildStoryBible, not the full ~100-field sheet.
 */
export function buildMotionBible(character, rigProfile, opts = {}) {
  const c = character && typeof character === 'object' ? character : {}
  const rig = rigProfile || DEFAULT_RIG_PROFILE
  const scene = findScene(opts.scene)
  const style = compileMotionStyle(c)
  const trait = (id) => compileChatTrait(id, c)

  const traits = {}
  for (const id of ['personality', 'archetype', 'battery', 'speech_style', 'gait', 'aura', 'tic', 'dynamic', 'humor', 'quirk']) {
    const v = trait(id)
    if (v) traits[id] = v
  }

  return {
    name: String(c.name || 'Unnamed'),
    species: selectDisplay(c, 'species') || undefined,
    age: c.age || undefined,
    traits,
    oceanBehavior: compileOceanBehavior(c) || undefined,
    motionStyle: {
      pacingMsMultiplier: style.pacingMsMultiplier,
      amplitudeMultiplier: style.amplitudeMultiplier,
      holdMsMultiplier: style.holdMsMultiplier,
      gestureFrequencyMultiplier: style.gestureFrequencyMultiplier,
      jitterMultiplier: style.jitterMultiplier,
      expressivenessScore: style.expressivenessScore,
      stillnessTolerance: style.stillnessTolerance,
      notes: style.promptNotes,
    },
    scene: { id: scene.id, label: scene.label, direction: opts.sceneDirection || scene.direction },
    sourceLine: String(opts.sourceLine || '') || undefined,
    durationMs: clampScriptDuration(opts.durationMs),
    rig: {
      name: rig.name,
      channelGroups: [...new Set((rig.channels || []).map((ch) => ch.group))],
      supportedExpressions: supportedExpressionIds(rig),
      supportedGestures: supportedGestureIds(rig),
      constraints: rig.constraints,
    },
  }
}

// --- Per-character persisted state ---

export function emptyMotionState() {
  return { rigProfileId: '', scripts: [] }
}

export function normalizeMotionState(raw) {
  const empty = emptyMotionState()
  if (!isPlainObject(raw)) return empty
  const scripts = (Array.isArray(raw.scripts) ? raw.scripts : [])
    .filter(isPlainObject)
    .map((s) => validateAndClampMotionScript(s, null).script)
    .filter((s) => s.events.length)
    .slice(0, MAX_SAVED_SCRIPTS)
  return {
    rigProfileId: typeof raw.rigProfileId === 'string' ? raw.rigProfileId : '',
    scripts,
  }
}

/** Serialize for export / hardware hand-off. */
export function motionScriptToJson(script) {
  return JSON.stringify(script, null, 2)
}
