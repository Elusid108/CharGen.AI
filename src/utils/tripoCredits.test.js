import { describe, it, expect } from 'vitest'
import { estimateMeshCredits, estimateConvertCredits, estimateJobCredits, estimateStlCredits, estimateFbxCredits, estimateRetargetCredits } from './tripoCredits'

describe('tripo credit estimates', () => {
  it('mesh pricing by engine or model id', () => {
    expect(estimateMeshCredits('h3', true)).toBe(30)
    expect(estimateMeshCredits('h3', false)).toBe(20)
    expect(estimateMeshCredits('v3.1-20260211', true, { textureQuality: 'detailed' })).toBe(50)
    expect(estimateMeshCredits('v3.1-20260211', true, { textureQuality: 'extreme', geometryQuality: 'detailed' })).toBe(80)
    expect(estimateMeshCredits('v3.1-20260211', false, { textureQuality: 'extreme' })).toBe(20)
    expect(estimateMeshCredits('P1-20260311', true, { textureQuality: 'extreme' })).toBe(50)
    expect(estimateMeshCredits('p1', false)).toBe(40)
  })

  it('convert = base + 5 per paid flag; legacy STL/FBX helpers agree', () => {
    expect(estimateConvertCredits({ format: 'STL', flatten_bottom: true, pivot_to_center_bottom: true })).toBe(estimateStlCredits())
    expect(estimateConvertCredits({ format: 'FBX', pivot_to_center_bottom: true, with_animation: true, fbx_preset: 'mixamo' })).toBe(estimateFbxCredits())
    expect(estimateConvertCredits({ format: 'GLTF' })).toBe(5)
    expect(estimateConvertCredits({ quad: true, pack_uv: true, force_symmetry: true, bake: true })).toBe(25)
  })

  it('estimateJobCredits covers every kind and flags approximations', () => {
    expect(estimateJobCredits('mesh', { model: 'P1-20260311', texture: true })).toEqual({ credits: 50, approx: false })
    expect(estimateJobCredits('mesh', { model: 'P2-20260801', texture: true }).approx).toBe(true)
    expect(estimateJobCredits('rig')).toEqual({ credits: 25, approx: false })
    expect(estimateJobCredits('retarget', { presets: ['idle', 'walk', 'run'] })).toEqual({ credits: 30, approx: false })
    expect(estimateRetargetCredits(0)).toBe(10)
    expect(estimateJobCredits('convert', { payload: { flatten_bottom: true } })).toEqual({ credits: 10, approx: false })
    for (const k of ['texture', 'decimate', 'segment', 'complete']) expect(estimateJobCredits(k).approx).toBe(true)
    expect(estimateJobCredits('bogus')).toEqual({ credits: 0, approx: true })
  })
})
