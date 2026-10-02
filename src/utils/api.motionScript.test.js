import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateMotionScript, buildMotionScriptSystemPrompt } from './api'
import { findBuiltinRigProfile, DEFAULT_RIG_PROFILE, DEFAULT_RIG_PROFILE_ID } from '../data/rigProfiles'
import { getDefaultCharacter } from '../data/schemas'

const headOnly = findBuiltinRigProfile('preset_head_only_3dof')

function geminiReply(text) {
  return {
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('buildMotionScriptSystemPrompt', () => {
  it('lists only rig-supported ids and the rig constraints', () => {
    const p = buildMotionScriptSystemPrompt(headOnly, 8000)
    expect(p).toContain('Allowed gesture ids: ')
    const gestureLine = p.split('\n').find((l) => l.startsWith('Allowed gesture ids:'))
    expect(gestureLine).toContain('nod')
    expect(gestureLine).not.toContain('wave_greeting')
    expect(p).toContain(`${headOnly.constraints.minGapMsBetweenGestures}ms apart`)
    expect(p).toContain('[0, 8000]')
  })

  it('forbids speechSync when the rig does not support it', () => {
    const mute = { ...headOnly, constraints: { ...headOnly.constraints, speechSyncSupported: false } }
    expect(buildMotionScriptSystemPrompt(mute, 5000)).toContain('Do NOT emit speechSync')
    expect(buildMotionScriptSystemPrompt(DEFAULT_RIG_PROFILE, 5000)).toContain('line_start')
  })
})

describe('generateMotionScript', () => {
  it('round-trips a well-formed reply through the validator and sends the bible', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiReply('```json\n' + JSON.stringify({
      events: [
        { tMs: 0, track: 'expression', id: 'neutral', intensity: 0.5, holdMs: 400 },
        { tMs: 0, track: 'gesture', id: 'idle_sway', intensity: 0.3, loop: true },
        { tMs: 1200, track: 'expression', id: 'curious_tilt', intensity: 1.4 },
        { tMs: 2000, track: 'gesture', id: 'wave_greeting', intensity: 0.9 },
        { tMs: 2500, track: 'gesture', id: 'nod', intensity: 0.6 },
      ],
    }) + '\n```'))
    vi.stubGlobal('fetch', fetchMock)

    const character = { ...getDefaultCharacter(), name: 'Pip', personality: 'Curious' }
    const { script, warnings } = await generateMotionScript('key', character, headOnly, {
      scene: 'greeting', durationMs: 6000, characterId: 'c1', modelId: 'gemini-test',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('gemini-test:generateContent')
    const payload = JSON.parse(init.body)
    expect(payload.systemInstruction.parts[0].text).toContain('Allowed expression ids')
    expect(payload.contents[0].parts[0].text).toContain('"name": "Pip"')
    expect(payload.contents[0].parts[0].text).not.toContain('wave_greeting')

    expect(script.meta.source).toBe('llm')
    expect(script.meta.scene).toBe('greeting')
    expect(script.characterId).toBe('c1')
    expect(script.rigProfileId).toBe(headOnly.id)
    expect(script.events.map((e) => e.id)).toEqual(['neutral', 'idle_sway', 'curious_tilt', 'nod'])
    expect(script.events[2].intensity).toBe(1)
    expect(warnings.some((w) => w.includes('wave_greeting'))).toBe(true)
  })

  it('throws on an empty or malformed reply so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiReply('{"events": []}')))
    await expect(generateMotionScript('key', {}, null)).rejects.toThrow(/usable motion script/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiReply('Sorry, I cannot help with that.')))
    await expect(generateMotionScript('key', {}, null)).rejects.toThrow()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiReply('{"events": [{"tMs": 0, "track": "gesture", "id": "moonwalk"}]}')))
    await expect(generateMotionScript('key', {}, null)).rejects.toThrow(/usable motion script/)
  })

  it('surfaces Gemini API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: 'quota' } }) }))
    await expect(generateMotionScript('key', {}, null)).rejects.toThrow(/Gemini Error: quota/)
  })

  it('uses the reference rig id when no rig is passed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiReply('{"events":[{"tMs":0,"track":"expression","id":"neutral"}]}')))
    const { script } = await generateMotionScript('key', {}, null)
    expect(script.rigProfileId).toBe(DEFAULT_RIG_PROFILE_ID)
  })
})
