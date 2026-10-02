import { describe, it, expect } from 'vitest'
import {
  JOB_OPTION_SCHEMAS,
  defaultJobValues,
  applyJobValue,
  visibleFields,
  fieldOptions,
  jobEstimate,
  jobCallArgs,
  jobValuesError,
  convertOptionsFromValues,
} from './tripoJobSchemas'

describe('tripoJobSchemas', () => {
  it('has a schema for every job kind', () => {
    expect(Object.keys(JOB_OPTION_SCHEMAS).sort()).toEqual(['complete', 'convert', 'decimate', 'mesh', 'print', 'retarget', 'rig', 'segment', 'texture'])
  })

  it('mesh defaults follow the profile and cascade on profile change', () => {
    const anim = defaultJobValues('mesh', { slot: 'lock', source: 'multiview' })
    expect(anim.profile).toBe('animation')
    expect(anim.texture).toBe(true)
    expect(anim.textureQuality).toBe('detailed')
    const print = applyJobValue('mesh', { ...anim, prompt: 'keep me' }, 'profile', 'print')
    expect(print.texture).toBe(false)
    expect(print.geometryQuality).toBe('detailed')
    expect(print.prompt).toBe('keep me')
    const p1 = applyJobValue('mesh', anim, 'model', 'P1-20260311')
    expect(p1.faceLimit).toBe(5000)
    const ids = visibleFields('mesh', p1, { slot: 'lock', source: 'multiview' }).map((f) => f.id)
    expect(ids).toContain('faceLimit')
    expect(ids).not.toContain('textureQuality')
    expect(ids).not.toContain('orientation')
    expect(visibleFields('mesh', anim, { slot: 'mannequin', source: 'image' }).map((f) => f.id)).toContain('orientation')
    expect(visibleFields('mesh', anim, { slot: 'concept', source: 'text' }).map((f) => f.id)).toContain('prompt')
  })

  it('estimates mesh and retarget costs', () => {
    const anim = defaultJobValues('mesh', {})
    expect(jobEstimate('mesh', anim).credits).toBeGreaterThan(0)
    expect(jobEstimate('retarget', { presets: ['idle', 'walk', 'run'] }).credits).toBe(30)
    expect(jobEstimate('retarget', { presets: [] }).notes.length).toBe(1)
    expect(jobValuesError('retarget', { presets: [] })).toMatch(/at least one/)
    expect(jobValuesError('retarget', { presets: ['a', 'b', 'c', 'd', 'e', 'f'] })).toMatch(/At most 5/)
  })

  it('filters retarget presets by rig type', () => {
    const field = JOB_OPTION_SCHEMAS.retarget.fields[0]
    expect(fieldOptions(field, { rigType: 'quadruped' }).map((o) => o.id)).toEqual(['quadruped-walk'])
    expect(fieldOptions(field, { rigType: 'biped' }).length).toBe(11)
  })

  it('builds convert options, applies print scale, and prices paid flags', () => {
    const ctx = { hasRig: true, stats: { bounds: [0.5, 1.8, 0.4] } }
    const v = applyJobValue('convert', defaultJobValues('convert', ctx), 'format', 'STL')
    expect(v.flattenBottom).toBe(true)
    const opts = convertOptionsFromValues({ ...v, heightMm: 180 }, ctx)
    expect(opts.scaleFactor).toBeCloseTo(0.1, 6)
    expect(opts.withAnimation).toBe(false)
    expect(jobEstimate('convert', { ...v, heightMm: 180 }, ctx).credits).toBe(15)
    const fbx = defaultJobValues('convert', ctx)
    expect(fbx.withAnimation).toBe(true)
    const args = jobCallArgs('convert', fbx, ctx)
    expect(args.format).toBe('FBX')
    expect(args.options.withAnimation).toBe(true)
    expect(args.options.fbxPreset).toBe('mixamo')
    expect(args.options.textureSize).toBe(2048)
    expect(jobEstimate('convert', fbx, ctx).credits).toBe(5)
    expect(jobEstimate('convert', { ...v, heightMm: 180 }, { hasRig: false }).notes.length).toBe(1)
  })

  it('prices a print version as two flagged converts', () => {
    const est = jobEstimate('print', defaultJobValues('print', { record: { printSpec: { heightMm: 120 } } }), { stats: { bounds: [1, 1, 1] } })
    expect(est.credits).toBe(30)
    expect(est.notes).toEqual([])
    expect(jobCallArgs('print', { heightMm: '150', formats: ['STL'] }).heightMm).toBe(150)
  })

  it('maps mesh values to start-job args', () => {
    const v = { ...defaultJobValues('mesh', {}), modelSeed: '42', model: 'P1-20260311', faceLimit: 3000 }
    const args = jobCallArgs('mesh', v)
    expect(args.options.seeds).toEqual({ model: 42 })
    expect(args.options.faceLimit).toBe(3000)
    expect(jobCallArgs('complete', { partNames: 'a, b ,,c' }).partNames).toEqual(['a', 'b', 'c'])
    expect(jobValuesError('mesh', { prompt: ' ' }, { slot: 'concept' })).toMatch(/prompt/)
  })
})
