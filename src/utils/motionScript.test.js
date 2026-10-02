import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  MOTION_SCRIPT_SCHEMA_VERSION,
  MAX_SCRIPT_DURATION_MS,
  MIN_EVENT_GAP_MS,
  MAX_SAVED_SCRIPTS,
  MOTION_SCENES,
  buildLocalMotionScript,
  validateAndClampMotionScript,
  buildMotionBible,
  emptyMotionState,
  normalizeMotionState,
  clampScriptDuration,
} from './motionScript'
import { BUILTIN_RIG_PROFILES, DEFAULT_RIG_PROFILE_ID, findBuiltinRigProfile, rigSupports } from '../data/rigProfiles'
import { getDefaultCharacter } from '../data/schemas'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedRandom(seed) {
  return vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed))
}

afterEach(() => vi.restoreAllMocks())

const headOnly = findBuiltinRigProfile('preset_head_only_3dof')
const fullBody = findBuiltinRigProfile('preset_full_body_12dof')

function assertScriptInvariants(script, rig, durationMs) {
  expect(script.schemaVersion).toBe(MOTION_SCRIPT_SCHEMA_VERSION)
  expect(script.meta.durationMs).toBe(durationMs)
  const lastByTrack = {}
  let prev = -1
  for (const ev of script.events) {
    expect(ev.tMs).toBeGreaterThanOrEqual(0)
    expect(ev.tMs).toBeLessThanOrEqual(durationMs)
    expect(ev.tMs).toBeGreaterThanOrEqual(prev)
    prev = ev.tMs
    expect(rigSupports(rig, ev.track, ev.id), `${ev.track}:${ev.id}`).toBe(true)
    if (ev.track !== 'speechSync') {
      expect(ev.intensity).toBeGreaterThanOrEqual(0)
      expect(ev.intensity).toBeLessThanOrEqual(1)
      const last = lastByTrack[ev.track]
      if (last != null) expect(ev.tMs - last).toBeGreaterThanOrEqual(MIN_EVENT_GAP_MS)
      lastByTrack[ev.track] = ev.tMs
    }
  }
}

describe('buildLocalMotionScript', () => {
  it('holds invariants across seeds, rigs, scenes and durations', () => {
    const char = { ...getDefaultCharacter(), personality: 'Curious', ocean_e: 80 }
    for (const rig of BUILTIN_RIG_PROFILES) {
      for (const scene of MOTION_SCENES) {
        for (const seed of [1, 7, 42]) {
          for (const durationMs of [500, 8000, 30000]) {
            seedRandom(seed)
            const s = buildLocalMotionScript(char, rig, { scene: scene.id, durationMs })
            assertScriptInvariants(s, rig, durationMs)
            expect(s.meta.source).toBe('local')
            expect(s.meta.scene).toBe(scene.id)
            expect(s.rigProfileId).toBe(rig.id)
            expect(s.events.length).toBeGreaterThan(0)
            vi.restoreAllMocks()
          }
        }
      }
    }
  })

  it('respects the rig minimum gaps per track', () => {
    seedRandom(3)
    const s = buildLocalMotionScript({ ocean_e: 100, personality: 'Manic' }, headOnly, { durationMs: 20000 })
    const c = headOnly.constraints
    const last = {}
    for (const ev of s.events) {
      const gap = ev.track === 'expression' ? c.minGapMsBetweenExpressionChanges : ev.track === 'gesture' ? c.minGapMsBetweenGestures : 0
      if (gap && last[ev.track] != null) expect(ev.tMs - last[ev.track]).toBeGreaterThanOrEqual(gap)
      last[ev.track] = ev.tMs
    }
  })

  it('head-only rig never emits arm gestures; full-body rig can', () => {
    const char = { ...getDefaultCharacter(), personality: 'Cheerful', dynamic: 'Center of Attention', ocean_e: 95 }
    const armIds = new Set(['wave_greeting', 'arms_open', 'point_forward', 'shrug', 'fidget', 'arms_cross', 'hand_to_face'])
    let fullBodyArm = 0
    for (let seed = 1; seed <= 20; seed++) {
      seedRandom(seed)
      const h = buildLocalMotionScript(char, headOnly, { scene: 'greeting', durationMs: 15000 })
      expect(h.events.some((e) => armIds.has(e.id))).toBe(false)
      vi.restoreAllMocks()
      seedRandom(seed)
      const f = buildLocalMotionScript(char, fullBody, { scene: 'greeting', durationMs: 15000 })
      if (f.events.some((e) => armIds.has(e.id))) fullBodyArm += 1
      vi.restoreAllMocks()
    }
    expect(fullBodyArm).toBeGreaterThan(10)
  })

  it('personality composes with the same rig: extraverts move more than stoics', () => {
    const loud = { ...getDefaultCharacter(), ocean_e: 95, personality: 'Manic', battery: 'Extrovert' }
    const quiet = { ...getDefaultCharacter(), ocean_e: 5, personality: 'Stoic', battery: 'Deep Introvert' }
    let loudTotal = 0
    let quietTotal = 0
    for (let seed = 1; seed <= 15; seed++) {
      seedRandom(seed)
      loudTotal += buildLocalMotionScript(loud, fullBody, { durationMs: 20000 }).events.length
      vi.restoreAllMocks()
      seedRandom(seed)
      quietTotal += buildLocalMotionScript(quiet, fullBody, { durationMs: 20000 }).events.length
      vi.restoreAllMocks()
    }
    expect(loudTotal).toBeGreaterThan(quietTotal * 1.5)
  })

  it('is deterministic for a fixed random stream', () => {
    const char = { ...getDefaultCharacter(), personality: 'Shy' }
    seedRandom(99)
    const a = buildLocalMotionScript(char, fullBody, { durationMs: 10000 })
    vi.restoreAllMocks()
    seedRandom(99)
    const b = buildLocalMotionScript(char, fullBody, { durationMs: 10000 })
    expect(a.events).toEqual(b.events)
  })

  it('emits speechSync markers only with a source line on a rig that supports it', () => {
    seedRandom(5)
    const withLine = buildLocalMotionScript({}, fullBody, { sourceLine: 'Welcome, traveler, to the hall of echoes.', durationMs: 8000 })
    const sync = withLine.events.filter((e) => e.track === 'speechSync')
    expect(sync.map((e) => e.id)).toEqual(['line_start', 'line_end'])
    expect(sync[1].tMs).toBeGreaterThan(0)
    expect(withLine.meta.sourceLine).toContain('Welcome')
    vi.restoreAllMocks()

    seedRandom(5)
    const without = buildLocalMotionScript({}, fullBody, { durationMs: 8000 })
    expect(without.events.some((e) => e.track === 'speechSync')).toBe(false)
    vi.restoreAllMocks()

    seedRandom(5)
    const muteRig = { ...fullBody, constraints: { ...fullBody.constraints, speechSyncSupported: false } }
    const mute = buildLocalMotionScript({}, muteRig, { sourceLine: 'hello there', durationMs: 8000 })
    expect(mute.events.some((e) => e.track === 'speechSync')).toBe(false)
  })

  it('uses the reference rig when none is given', () => {
    seedRandom(1)
    const s = buildLocalMotionScript(getDefaultCharacter(), null)
    expect(s.rigProfileId).toBe(DEFAULT_RIG_PROFILE_ID)
    expect(s.events.length).toBeGreaterThan(0)
  })
})

describe('validateAndClampMotionScript', () => {
  it('never throws on garbage and returns an empty playable script', () => {
    for (const junk of [null, undefined, 'x', 42, [], {}, { events: 'nope' }, { events: [null, 1, 'a', {}, { track: 'x' }] }]) {
      const { script, warnings } = validateAndClampMotionScript(junk, null)
      expect(Array.isArray(script.events)).toBe(true)
      expect(script.events).toEqual([])
      expect(script.schemaVersion).toBe(MOTION_SCRIPT_SCHEMA_VERSION)
      expect(script.meta.durationMs).toBeGreaterThan(0)
      expect(warnings.length).toBeGreaterThan(0)
    }
  })

  it('drops non-canonical ids and rig-unsupported ids with warnings', () => {
    const raw = { meta: { durationMs: 5000 }, events: [
      { tMs: 0, track: 'expression', id: 'neutral' },
      { tMs: 1000, track: 'gesture', id: 'raise_left_arm_45deg' },
      { tMs: 2000, track: 'gesture', id: 'wave_greeting' },
      { tMs: 3000, track: 'expression', id: 'nod' },
    ] }
    const { script, warnings } = validateAndClampMotionScript(raw, headOnly)
    expect(script.events.map((e) => e.id)).toEqual(['neutral'])
    expect(warnings.some((w) => w.includes('non-canonical'))).toBe(true)
    expect(warnings.some((w) => w.includes('does not support'))).toBe(true)
    expect(script.rigProfileId).toBe(headOnly.id)
  })

  it('clamps intensity and tMs, sorts, and coerces optional fields', () => {
    const raw = { meta: { durationMs: 4000 }, events: [
      { tMs: 9999, track: 'expression', id: 'alert', intensity: 7, holdMs: -5, transitionMs: '120', loop: 1 },
      { tMs: -50, track: 'expression', id: 'neutral', intensity: -2 },
      { tMs: '1500', track: 'gesture', id: 'nod' },
    ] }
    const { script } = validateAndClampMotionScript(raw, null)
    expect(script.events.map((e) => e.tMs)).toEqual([0, 1500, 4000])
    expect(script.events[0].intensity).toBe(0)
    expect(script.events[2].intensity).toBe(1)
    expect(script.events[2].holdMs).toBe(0)
    expect(script.events[2].transitionMs).toBe(120)
    expect(script.events[2].loop).toBe(true)
    expect(script.events[1].intensity).toBe(0.7)
  })

  it('enforces per-track minimum gaps but lets tracks overlap', () => {
    const rig = { ...headOnly, constraints: { ...headOnly.constraints, minGapMsBetweenExpressionChanges: 1000, minGapMsBetweenGestures: 1000, maxEventsPerMinute: 0 } }
    const raw = { meta: { durationMs: 5000 }, events: [
      { tMs: 0, track: 'expression', id: 'neutral' },
      { tMs: 0, track: 'gesture', id: 'nod' },
      { tMs: 500, track: 'expression', id: 'alert' },
      { tMs: 1000, track: 'expression', id: 'sad' },
      { tMs: 1000, track: 'gesture', id: 'shake_head' },
    ] }
    const { script, warnings } = validateAndClampMotionScript(raw, rig)
    expect(script.events.map((e) => `${e.track}:${e.id}@${e.tMs}`)).toEqual([
      'expression:neutral@0', 'gesture:nod@0', 'expression:sad@1000', 'gesture:shake_head@1000',
    ])
    expect(warnings.some((w) => w.includes('minimum gap'))).toBe(true)
  })

  it('applies the global MIN_EVENT_GAP_MS floor even if the rig says 0', () => {
    const rig = { ...fullBody, constraints: { ...fullBody.constraints, minGapMsBetweenExpressionChanges: 0, maxEventsPerMinute: 0 } }
    const raw = { meta: { durationMs: 2000 }, events: [
      { tMs: 0, track: 'expression', id: 'neutral' },
      { tMs: 10, track: 'expression', id: 'alert' },
      { tMs: MIN_EVENT_GAP_MS, track: 'expression', id: 'sad' },
    ] }
    const { script } = validateAndClampMotionScript(raw, rig)
    expect(script.events.map((e) => e.id)).toEqual(['neutral', 'sad'])
  })

  it('downsamples to maxEventsPerMinute while preserving speechSync', () => {
    const rig = { ...fullBody, constraints: { ...fullBody.constraints, maxEventsPerMinute: 60, minGapMsBetweenExpressionChanges: 0, minGapMsBetweenGestures: 0 } }
    const events = [{ tMs: 0, track: 'speechSync', id: 'line_start' }]
    for (let i = 0; i < 40; i++) events.push({ tMs: i * 100, track: i % 2 ? 'expression' : 'gesture', id: i % 2 ? 'neutral' : 'nod' })
    events.push({ tMs: 4000, track: 'speechSync', id: 'line_end' })
    const { script, warnings } = validateAndClampMotionScript({ meta: { durationMs: 4000 }, events }, rig)
    const motion = script.events.filter((e) => e.track !== 'speechSync')
    expect(motion.length).toBe(4)
    expect(script.events.filter((e) => e.track === 'speechSync').length).toBe(2)
    expect(warnings.some((w) => w.includes('Downsampled'))).toBe(true)
  })

  it('clamps duration into range and honours characterId/meta overrides', () => {
    expect(clampScriptDuration(-5)).toBe(500)
    expect(clampScriptDuration(1e9)).toBe(MAX_SCRIPT_DURATION_MS)
    expect(clampScriptDuration('junk')).toBe(8000)
    const { script } = validateAndClampMotionScript({ meta: { durationMs: 1e9, source: 'llm' }, events: [] }, null, { characterId: 'abc', meta: { scene: 'greeting' } })
    expect(script.meta.durationMs).toBe(MAX_SCRIPT_DURATION_MS)
    expect(script.meta.source).toBe('llm')
    expect(script.meta.scene).toBe('greeting')
    expect(script.characterId).toBe('abc')
  })
})

describe('buildMotionBible', () => {
  it('is compact and lists only rig-supported ids', () => {
    const bible = buildMotionBible({ ...getDefaultCharacter(), name: 'Vex', personality: 'Shy', quirk: 'Counts steps' }, headOnly, { scene: 'listening', sourceLine: 'hi', durationMs: 6000 })
    expect(bible.name).toBe('Vex')
    expect(bible.scene.id).toBe('listening')
    expect(bible.sourceLine).toBe('hi')
    expect(bible.durationMs).toBe(6000)
    expect(bible.rig.supportedGestures).not.toContain('wave_greeting')
    expect(bible.rig.supportedGestures).toContain('nod')
    expect(bible.motionStyle.notes.some((n) => n.includes('Counts steps'))).toBe(true)
    expect(bible.traits.personality).toContain('Shy')
    expect(JSON.stringify(bible).length).toBeLessThan(6000)
  })

  it('tolerates an empty character', () => {
    expect(() => buildMotionBible(null, null)).not.toThrow()
  })
})

describe('motion state', () => {
  it('normalizes garbage to empty and keeps valid scripts up to the cap', () => {
    expect(normalizeMotionState(null)).toEqual(emptyMotionState())
    expect(normalizeMotionState('x')).toEqual(emptyMotionState())
    seedRandom(2)
    const good = buildLocalMotionScript({}, fullBody, { durationMs: 3000 })
    const scripts = Array.from({ length: MAX_SAVED_SCRIPTS + 5 }, () => good)
    const state = normalizeMotionState({ rigProfileId: fullBody.id, scripts: [...scripts, 'junk', { events: [] }] })
    expect(state.rigProfileId).toBe(fullBody.id)
    expect(state.scripts.length).toBe(MAX_SAVED_SCRIPTS)
    expect(state.scripts[0].rigProfileId).toBe(fullBody.id)
  })
})
