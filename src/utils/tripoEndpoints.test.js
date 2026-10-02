import { describe, it, expect } from 'vitest'
import {
  TRIPO_ROUTES, TRIPO_MODELS, DEFAULT_MODEL, RIG_TYPES, ANIMATION_PRESETS, CONVERT_FORMATS, PRESET_BY_ID,
  buildGenerationPayload, buildImageToModelPayload, buildMultiviewPayload, buildTextToModelPayload,
  buildTexturePayload, buildConvertPayload, buildRigPayload, buildRetargetPayload, buildDecimatePayload,
  buildSegmentPayload, buildCompletePayload, presetsForRigType, normalizeRetargetOutput, modelForEngine, clampFaceLimit,
} from './tripoEndpoints'
import { generationPayload } from './tripo'

describe('registry integrity', () => {
  it('routes and enums are complete', () => {
    expect(TRIPO_ROUTES.task('abc')).toBe('/tasks/abc')
    expect(Object.keys(TRIPO_MODELS)).toContain(DEFAULT_MODEL)
    expect(ANIMATION_PRESETS.length).toBe(16)
    expect(new Set(ANIMATION_PRESETS.map((p) => p.id)).size).toBe(16)
    for (const p of ANIMATION_PRESETS) {
      expect(p.preset.startsWith('preset:')).toBe(true)
      for (const t of p.rigTypes) expect(RIG_TYPES).toContain(t)
    }
    for (const t of RIG_TYPES) {
      if (t === 'avian' || t === 'others') continue
      expect(presetsForRigType(t).length, t).toBeGreaterThan(0)
    }
    expect(presetsForRigType('biped').length).toBe(11)
    expect(Object.keys(CONVERT_FORMATS).sort()).toEqual(['3MF', 'FBX', 'GLTF', 'OBJ', 'STL', 'USDZ'])
  })
})

describe('generation payloads', () => {
  it('matches the legacy generationPayload for H3 and P1', () => {
    expect(generationPayload({ engineId: 'h3', texture: true })).toEqual({ model: 'v3.1-20260211', texture: true, pbr: true })
    expect(generationPayload({ engineId: 'h3', texture: true, textureQuality: 'detailed', geometryQuality: 'detailed' }))
      .toEqual({ model: 'v3.1-20260211', texture: true, pbr: true, texture_quality: 'detailed', geometry_quality: 'detailed' })
    expect(generationPayload({ engineId: 'h3', texture: false, textureQuality: 'detailed' })).toEqual({ model: 'v3.1-20260211', texture: false, pbr: false })
    expect(generationPayload({ engineId: 'p1', texture: true, faceLimit: 99999 })).toEqual({ model: 'P1-20260311', texture: true, pbr: true, face_limit: 20000, auto_size: true })
    expect(generationPayload({ engineId: 'p1', texture: false })).toEqual({ model: 'P1-20260311', texture: false, pbr: false, face_limit: 5000, auto_size: true })
  })

  it('adds optional fields only when set and drops undefined', () => {
    const p = buildGenerationPayload({ model: DEFAULT_MODEL, quad: true, orientation: 'align_image', textureAlignment: 'geometry', seeds: { model: 7.4, texture: null }, style: 'cartoon' })
    expect(p).toEqual({ model: DEFAULT_MODEL, texture: true, pbr: true, quad: true, texture_alignment: 'geometry', orientation: 'align_image', style: 'cartoon', model_seed: 7 })
    expect(buildGenerationPayload({ model: 'bogus' }).model).toBe(DEFAULT_MODEL)
    expect(buildGenerationPayload({ orientation: 'default' })).not.toHaveProperty('orientation')
    expect(modelForEngine('p1')).toBe('P1-20260311')
    expect(clampFaceLimit('P2-20260801', 10)).toBe(1000)
    expect(clampFaceLimit(DEFAULT_MODEL, undefined)).toBeUndefined()
  })

  it('image / multiview / text wrappers', () => {
    expect(buildImageToModelPayload({ model: DEFAULT_MODEL }, 'tok').input).toBe('tok')
    expect(() => buildImageToModelPayload({}, '')).toThrow()
    const mv = buildMultiviewPayload({ orientation: 'align_image' }, { back: 'b', front: 'f', right: 'r' })
    expect(mv.inputs).toEqual([{ front: 'f' }, { back: 'b' }, { right: 'r' }])
    expect(mv).not.toHaveProperty('orientation')
    expect(() => buildMultiviewPayload({}, { left: 'l' })).toThrow()
    const t = buildTextToModelPayload({ model: 'P1-20260311' }, '  a knight  ', '')
    expect(t.prompt).toBe('a knight')
    expect(t).not.toHaveProperty('negative_prompt')
    expect(t.face_limit).toBe(5000)
    expect(() => buildTextToModelPayload({}, ' ')).toThrow()
  })
})

describe('post-processing payloads', () => {
  it('texture', () => {
    expect(buildTexturePayload({ taskId: 't1', textPrompt: ' rust ', textureQuality: 'detailed', textureAlignment: 'geometry' }))
      .toEqual({ input: 't1', texture: true, pbr: true, text_prompt: 'rust', texture_quality: 'detailed', texture_alignment: 'geometry' })
    expect(buildTexturePayload({ taskId: 't1', textureQuality: 'standard' })).toEqual({ input: 't1', texture: true, pbr: true })
    expect(() => buildTexturePayload({})).toThrow()
  })

  it('convert validates format and emits only set flags', () => {
    expect(buildConvertPayload({ taskId: 't', format: 'stl', flattenBottom: true, flattenBottomThreshold: 0.02, pivotToCenterBottom: true, scaleFactor: 1.5 }))
      .toEqual({ input: 't', format: 'STL', flatten_bottom: true, flatten_bottom_threshold: 0.02, pivot_to_center_bottom: true, scale_factor: 1.5 })
    expect(buildConvertPayload({ taskId: 't', format: 'FBX', fbxPreset: 'mixamo', withAnimation: true, textureSize: 99999, textureFormat: 'PNG' }))
      .toEqual({ input: 't', format: 'FBX', texture_size: 8192, texture_format: 'PNG', with_animation: true, fbx_preset: 'mixamo' })
    expect(buildConvertPayload({ taskId: 't', format: 'GLTF', fbxPreset: 'mixamo', flattenBottomThreshold: 0.5 })).toEqual({ input: 't', format: 'GLTF' })
    expect(() => buildConvertPayload({ taskId: 't', format: 'PLY' })).toThrow(/Unsupported/)
  })

  it('rig / retarget', () => {
    expect(buildRigPayload({ taskId: 'm', rigType: 'quadruped', spec: 'tripo', outFormat: 'fbx' }))
      .toEqual({ input: 'm', model: 'v2.5-20260210', rig_type: 'quadruped', spec: 'tripo', out_format: 'fbx' })
    expect(buildRigPayload({ taskId: 'm', rigType: 'nope', spec: 'nope', outFormat: 'nope' }))
      .toEqual({ input: 'm', model: 'v1.0-20240301', rig_type: 'biped', spec: 'mixamo', out_format: 'glb' })
    expect(buildRetargetPayload({ rigTaskId: 'r', presets: ['idle'] }))
      .toEqual({ input: 'r', animations: ['preset:idle'], out_format: 'glb', bake_animation: true, export_with_geometry: true, animate_in_place: true })
    expect(buildRetargetPayload({ rigTaskId: 'r', presets: ['idle', 'preset:walk', 'idle', 'bogus'] }).animations).toEqual(['preset:idle', 'preset:walk'])
    expect(() => buildRetargetPayload({ rigTaskId: 'r', presets: ['idle', 'walk', 'run', 'jump', 'dive', 'turn'] })).toThrow(/At most 5/)
    expect(() => buildRetargetPayload({ rigTaskId: 'r', presets: ['bogus'] })).toThrow(/at least one/)
  })

  it('mesh ops', () => {
    expect(buildDecimatePayload({ taskId: 't', faceLimit: 50, quad: true })).toEqual({ input: 't', model: 'P-v2.0-20251226', face_limit: 200, quad: true })
    expect(buildSegmentPayload({ taskId: 't' })).toEqual({ input: 't', model: 'v1.0-20250506' })
    expect(buildCompletePayload({ taskId: 't', partNames: ['arm'] })).toEqual({ input: 't', model: 'v1.0-20250506', part_names: ['arm'] })
  })
})

describe('normalizeRetargetOutput', () => {
  it('handles keyed-with-prefix, keyed-without-prefix, array, and single outputs', () => {
    expect(normalizeRetargetOutput({ model_urls: { 'preset:idle': 'u1', 'preset:walk': 'u2' } }, ['idle', 'walk']))
      .toEqual([{ preset: 'preset:idle', id: 'idle', url: 'u1' }, { preset: 'preset:walk', id: 'walk', url: 'u2' }])
    expect(normalizeRetargetOutput({ model_urls: { idle: 'u1', 'quadruped:walk': 'u3' } }, []))
      .toEqual([{ preset: 'preset:idle', id: 'idle', url: 'u1' }, { preset: 'preset:quadruped:walk', id: 'quadruped-walk', url: 'u3' }])
    expect(normalizeRetargetOutput({ model_urls: ['a', 'b'] }, ['run', 'jump']).map((r) => r.id)).toEqual(['run', 'jump'])
    expect(normalizeRetargetOutput({ pbr_model: 'single' }, ['hurt'])).toEqual([{ preset: 'preset:hurt', id: 'hurt', url: 'single' }])
    expect(normalizeRetargetOutput(null, ['idle'])).toEqual([])
    expect(PRESET_BY_ID['serpentine-march'].preset).toBe('preset:serpentine:march')
  })
})
