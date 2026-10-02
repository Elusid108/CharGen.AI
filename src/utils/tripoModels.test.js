import { describe, it, expect } from 'vitest'
import {
  isValidFileKey, parseFileKey, LEGACY_FILE_KEYS, normalizeModelRecord, normalizeGeneratedModels, emptyModelRecord,
  findInFlightJobs, patchAssetRecord, archiveCurrentAndSet, modelBlobId, assetBlobPrefix, assetFileName, assetBaseName,
  listAllAssets, hasUnstoredFiles, RECORD_VERSION, mimeForFileKey,
} from './tripoModels'

const legacyRecord = {
  id: 'abc123def',
  slot: 'lock',
  source: 'multiview',
  engine: 'p1',
  texture: true,
  faceLimit: 5000,
  taskId: 'mesh-task',
  rigTaskId: 'rig-task',
  convertTasks: { stl: 'stl-task' },
  status: 'success',
  progress: 100,
  creditsConsumed: 95,
  previewUrl: 'https://cdn.tripo3d.ai/p.jpg',
  remoteUrls: { fbx: 'https://cdn.tripo3d.ai/f.fbx' },
  corsBlocked: true,
  files: { glb: true, riggedGlb: true, stl: true, fbx: false, preview: false, animIdle: true, animWalk: false, animRun: true },
  createdAt: 1000,
  completedAt: 2000,
}

describe('file-key grammar', () => {
  it('accepts valid keys and rejects everything else', () => {
    const good = ['mesh.glb', 'preview.jpg', 'preview.png', 'rig.glb', 'rig.fbx', 'anim.idle.glb', 'anim.quadruped-walk.glb', 'convert.STL.stl', 'convert.FBX.zip', 'convert.FBX.fbx', 'convert.3MF.3mf', 'convert.USDZ.usdz', 'lod.4000.glb', 'texture.ab12.glb', 'segment.x.glb', 'complete.x.glb']
    const bad = ['', 'glb', 'mesh.fbx', 'mesh.x.glb', 'anim.glb', 'anim.moonwalk.glb', 'convert.PLY.ply', 'convert.STL.jpg', 'lod.abc.glb', 'rig.x.glb', 'preview.glb', 'texture.glb', 'bogus.glb', 'mesh.glb.zip', 'a::b']
    for (const k of good) expect(isValidFileKey(k), k).toBe(true)
    for (const k of bad) expect(isValidFileKey(k), k).toBe(false)
    expect(parseFileKey('anim.idle.glb')).toEqual({ family: 'anim', arg: 'idle', ext: 'glb' })
    for (const key of Object.values(LEGACY_FILE_KEYS)) expect(isValidFileKey(key), key).toBe(true)
    expect(mimeForFileKey('convert.STL.stl')).toBe('model/stl')
  })
})

describe('normalizeModelRecord', () => {
  it('migrates a v1 record into v2 entries, rig, animations and remote urls', () => {
    const r = normalizeModelRecord(legacyRecord)
    expect(r.recordVersion).toBe(RECORD_VERSION)
    expect(r.modelVersion).toBe('P1-20260311')
    expect(r.engine).toBe('p1')
    expect(Object.keys(r.files).sort()).toEqual(['anim.idle.glb', 'anim.run.glb', 'convert.FBX.fbx', 'convert.STL.stl', 'mesh.glb', 'preview.jpg', 'rig.glb'])
    expect(r.files['mesh.glb'].stored).toBe(true)
    expect(r.files['mesh.glb'].taskId).toBe('mesh-task')
    expect(r.files['preview.jpg']).toMatchObject({ stored: false, remoteUrl: 'https://cdn.tripo3d.ai/p.jpg' })
    expect(r.files['convert.FBX.fbx']).toMatchObject({ stored: false, remoteUrl: 'https://cdn.tripo3d.ai/f.fbx' })
    expect(r.files['convert.STL.stl'].taskId).toBe('stl-task')
    expect(r.rig).toEqual({ taskId: 'rig-task', checkTaskId: null, type: 'biped', spec: 'mixamo', outFormat: 'glb', riggable: true })
    expect(r.animations.map((a) => a.id)).toEqual(['idle', 'run'])
    expect(r.animations[0]).toMatchObject({ preset: 'preset:idle', fileKey: 'anim.idle.glb', taskId: 'rig-task' })
    expect(hasUnstoredFiles(r)).toBe(true)
    expect(r.transform).toEqual({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 })
    expect(r.printSpec.heightMm).toBe(100)
    expect(r.creditsConsumed).toBe(95)
    expect(r).not.toHaveProperty('rigTaskId')
    expect(normalizeModelRecord(r)).toEqual(r)
  })

  it('normalizes garbage in a v2 record', () => {
    const r = normalizeModelRecord({
      recordVersion: 2, id: 'x', slot: 'nope', profile: 'nope', modelVersion: 'nope', status: 'weird',
      files: { 'mesh.glb': { stored: 'yes' }, 'bogus.key': { stored: true }, 'anim.idle.glb': 'str' },
      animations: [{ id: 'idle', fileKey: 'anim.idle.glb' }, { id: 'walk', fileKey: 'anim.walk.glb' }],
      transform: { position: [1, 'x', 3], scale: 999 }, printSpec: { heightMm: 5 },
      jobs: { j1: { kind: 'rig', status: 'running', progress: 150 }, bad: null },
      activeJobId: 'j1', rig: { taskId: 't', spec: 'weird', outFormat: 'obj' },
    })
    expect(r.slot).toBe('lock')
    expect(r.profile).toBe('animation')
    expect(r.modelVersion).toBe('v3.1-20260211')
    expect(r.status).toBe('idle')
    expect(Object.keys(r.files)).toEqual(['mesh.glb'])
    expect(r.animations).toEqual([])
    expect(r.transform).toEqual({ position: [1, 0, 3], rotation: [0, 0, 0], scale: 100 })
    expect(r.printSpec.heightMm).toBe(10)
    expect(r.jobs.j1).toMatchObject({ id: 'j1', kind: 'rig', status: 'running', progress: 100 })
    expect(r.activeJobId).toBe('j1')
    expect(r.rig).toMatchObject({ spec: 'mixamo', outFormat: 'glb' })
    expect(normalizeModelRecord(null)).toBeNull()
    expect(normalizeModelRecord({ current: null, archive: [] })).toBeNull()
  })

  it('clears activeJobId when the job is terminal', () => {
    const r = normalizeModelRecord({ recordVersion: 2, id: 'x', jobs: { j: { id: 'j', kind: 'mesh', status: 'success' } }, activeJobId: 'j' })
    expect(r.activeJobId).toBeNull()
  })
})

describe('generatedModels helpers', () => {
  it('adds the concept slot and lists every asset incl. archive', () => {
    const models = normalizeGeneratedModels({ lock: { current: legacyRecord, archive: [{ ...legacyRecord, id: 'old' }] }, outfits: { o1: legacyRecord } })
    expect(models.concept).toEqual({ current: null, archive: [] })
    const all = listAllAssets(models)
    expect(all.map((a) => `${a.slot}:${a.record.id}:${a.archived}`)).toEqual(['lock:abc123def:false', 'lock:old:true', 'outfit:abc123def:false'])
  })

  it('finds in-flight jobs on archived records too', () => {
    const rec = emptyModelRecord({ id: 'a', status: 'success', jobs: { j: { id: 'j', kind: 'convert', status: 'running' } }, activeJobId: 'j' })
    const models = normalizeGeneratedModels({ lock: { current: emptyModelRecord({ id: 'b', status: 'uploading' }), archive: [rec] } })
    const jobs = findInFlightJobs(models)
    expect(jobs.map((j) => `${j.assetId}:${j.job?.kind || 'mesh-legacy'}`)).toEqual(['b:mesh-legacy', 'a:convert'])
  })

  it('patchAssetRecord reaches archived records; archiveCurrentAndSet keeps meshes', () => {
    const cur = emptyModelRecord({ id: 'cur', status: 'success', files: { 'mesh.glb': { stored: true } } })
    const old = emptyModelRecord({ id: 'old', status: 'failed' })
    let models = normalizeGeneratedModels({ lock: { current: cur, archive: [old] } })
    models = patchAssetRecord(models, 'lock', null, 'old', { lastError: 'nope' })
    expect(models.lock.archive[0].lastError).toBe('nope')
    models = archiveCurrentAndSet(models, 'lock', null, emptyModelRecord({ id: 'new', status: 'uploading' }))
    expect(models.lock.current.id).toBe('new')
    expect(models.lock.archive.map((r) => r.id)).toEqual(['cur', 'old'])
  })

  it('blob ids and file names are stable and ASCII', () => {
    expect(modelBlobId('c', 'outfit', 'o1', 'mesh.glb', 'a')).toBe('c::outfit_o1::a::mesh.glb')
    expect(assetBlobPrefix('c', 'lock', null, 'a')).toBe('c::lock::a::')
    const rec = emptyModelRecord({ id: 'abcdef123', slot: 'outfit', outfitId: 'o' })
    expect(assetBaseName('Zoë Vane', rec, 'Night Market')).toBe('Zoe_Vane_outfit-night_market_abcdef')
    expect(assetFileName('Pip', emptyModelRecord({ id: 'xyz987' }), '', 'mesh.glb')).toBe('Pip_lock_xyz987.glb')
    expect(assetFileName('Pip', emptyModelRecord({ id: 'xyz987' }), '', 'anim.walk.glb')).toBe('Pip_lock_xyz987@walk.glb')
    expect(assetFileName('Pip', emptyModelRecord({ id: 'xyz987' }), '', 'convert.STL.stl')).toBe('Pip_lock_xyz987_convert-STL.stl')
    expect(assetFileName('Pip', emptyModelRecord({ id: 'xyz987' }), '', 'rig.glb')).toBe('Pip_lock_xyz987_rig.glb')
  })
})
