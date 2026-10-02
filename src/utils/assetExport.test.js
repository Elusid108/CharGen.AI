import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { planBundle, targetStatus, estimateBundleGap, buildExportManifest, readmeText, buildAssetBundle, relocateArchive, isZip, libraryBlobPath, TARGET_IDS } from './assetExport'
import { emptyModelRecord, fileEntry } from './tripoModels'

function rec(keys, extra = {}) {
  const files = {}
  for (const k of keys) files[k] = fileEntry(k, { stored: true, bytes: 10, taskId: 't1' })
  return emptyModelRecord({ id: 'abcdef123', slot: 'lock', status: 'success', taskId: 't1', files, ...extra })
}

const full = rec(['mesh.glb', 'preview.jpg', 'rig.glb', 'anim.idle.glb', 'anim.walk.glb', 'lod.4000.glb', 'lod.1000.glb', 'convert.FBX.zip', 'convert.GLTF.zip', 'convert.USDZ.usdz', 'convert.STL.stl', 'convert.3MF.3mf'], {
  rig: { taskId: 'r1', checkTaskId: 'c1', type: 'biped', spec: 'mixamo', outFormat: 'glb', riggable: true },
  animations: [{ preset: 'preset:idle', id: 'idle', taskId: 'a1', fileKey: 'anim.idle.glb' }, { preset: 'preset:walk', id: 'walk', taskId: 'a1', fileKey: 'anim.walk.glb' }],
  lods: [{ faceLimit: 4000, quad: false, taskId: 'l1', fileKey: 'lod.4000.glb' }, { faceLimit: 1000, quad: false, taskId: 'l2', fileKey: 'lod.1000.glb' }],
  printSpec: { heightMm: 150, flattenBottom: true, pivotCenterBottom: true },
  jobs: { j1: { id: 'j1', kind: 'mesh', status: 'success', creditsConsumed: 20 }, j2: { id: 'j2', kind: 'rig', status: 'success', creditsConsumed: 25 } },
})

describe('assetExport planner', () => {
  it('lays out every target by convention', () => {
    const plan = planBundle(full, { characterName: 'Zoë Vane', targets: TARGET_IDS })
    expect(plan.base).toBe('Zoe_Vane_lock_abcdef')
    const paths = plan.entries.map((e) => e.path)
    expect(paths).toContain('Zoe_Vane_lock_abcdef/source/preview.jpg')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/model/glb/Zoe_Vane_lock_abcdef.glb')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/model/glb/Zoe_Vane_lock_abcdef_rigged.glb')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/animations/Zoe_Vane_lock_abcdef@walk.glb')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/lod/Zoe_Vane_lock_abcdef_lod1_4000.glb')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/lod/Zoe_Vane_lock_abcdef_lod2_1000.glb')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/model/usdz/Zoe_Vane_lock_abcdef.usdz')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/print/Zoe_Vane_lock_abcdef_150mm.stl')
    expect(paths).toContain('Zoe_Vane_lock_abcdef/print/Zoe_Vane_lock_abcdef_150mm.3mf')
    expect(plan.entries.find((e) => e.fileKey === 'convert.FBX.zip')).toMatchObject({ kind: 'archive', path: 'Zoe_Vane_lock_abcdef/model/fbx' })
    expect(plan.entries.find((e) => e.fileKey === 'convert.GLTF.zip')).toMatchObject({ kind: 'archive', path: 'Zoe_Vane_lock_abcdef/model/gltf' })
    expect(plan.missing).toEqual([])
  })

  it('filters entries by target', () => {
    const plan = planBundle(full, { targets: ['print'] })
    expect(plan.entries.every((e) => e.path.includes('/print/') || e.path.includes('/source/'))).toBe(true)
    const gltfOnly = planBundle(full, { targets: ['gltf'] })
    expect(gltfOnly.entries.some((e) => e.fileKey === 'convert.FBX.zip')).toBe(false)
    expect(gltfOnly.entries.some((e) => e.fileKey === 'mesh.glb')).toBe(true)
  })

  it('reports missing files and the credits to fill them', () => {
    const bare = rec(['mesh.glb', 'preview.jpg'])
    expect(targetStatus(bare, 'usdz').missing[0]).toMatchObject({ fileKey: 'convert.USDZ.usdz', estimatedCredits: 5, optional: false })
    expect(targetStatus(bare, 'unity_unreal').missing.map((m) => m.fileKey)).toEqual(['rig.glb', 'convert.FBX.zip'])
    expect(targetStatus(bare, 'unity_unreal').missing[0].optional).toBe(true)
    expect(targetStatus(bare, 'print').missing.map((m) => m.fileKey)).toEqual(['convert.STL.stl', 'convert.3MF.3mf'])
    const gap = estimateBundleGap(bare, TARGET_IDS)
    // FBX 5 + USDZ 5 + print 30 (one job for both files); rig/gltf are optional
    expect(gap.credits).toBe(40)
    expect(gap.jobs.map((j) => j.kind)).toEqual(['convert', 'convert', 'print'])
    expect(estimateBundleGap(full).credits).toBe(0)
  })

  it('writes a manifest and README that describe the bundle', () => {
    const plan = planBundle(full, { characterName: 'Zoe Vane' })
    const manifest = buildExportManifest(full, { characterName: 'Zoe Vane', characterId: 'char1', plan, appVersion: '1.12.0', now: 0 })
    expect(manifest.schema).toBe('chargen.asset-bundle/1')
    expect(manifest.exportedAt).toBe('1970-01-01T00:00:00.000Z')
    expect(manifest.animations.map((a) => a.file)).toEqual(['Zoe_Vane_lock_abcdef/animations/Zoe_Vane_lock_abcdef@idle.glb', 'Zoe_Vane_lock_abcdef/animations/Zoe_Vane_lock_abcdef@walk.glb'])
    expect(manifest.credits.total).toBe(45)
    expect(manifest.rig.spec).toBe('mixamo')
    expect(manifest.formats.sort()).toEqual(['FBX', 'GLTF', 'USDZ'])
    const readme = readmeText(manifest)
    expect(readme).toMatch(/Unity/)
    expect(readme).toMatch(/Clips: Idle, Walk/)
    const bare = buildExportManifest(rec(['mesh.glb']), { targets: ['usdz'] })
    expect(bare.missing[0].fileKey).toBe('convert.USDZ.usdz')
    expect(readmeText(bare)).toMatch(/Not included/)
  })

  it('builds a real ZIP with relocated archives and skips unstored files', async () => {
    const inner = new JSZip()
    inner.file('tripo_out/model.fbx', new Uint8Array([1, 2, 3]))
    inner.file('tripo_out/albedo.png', new Uint8Array([9]))
    const fbxZip = await inner.generateAsync({ type: 'uint8array' })
    expect(isZip(fbxZip)).toBe(true)
    expect(isZip(new Uint8Array([1, 2, 3, 4]))).toBe(false)

    const record = rec(['mesh.glb', 'convert.FBX.zip', 'convert.USDZ.usdz'])
    const plan = planBundle(record, { characterName: 'Zoe', targets: ['unity_unreal', 'usdz'] })
    const manifest = buildExportManifest(record, { characterName: 'Zoe', plan })
    const { zip, included, skipped } = await buildAssetBundle({
      plan,
      manifest,
      readme: readmeText(manifest),
      getBytes: async (key) => (key === 'convert.FBX.zip' ? fbxZip : key === 'mesh.glb' ? new Uint8Array([7]) : null),
    })
    expect(skipped).toEqual([{ fileKey: 'convert.USDZ.usdz', reason: 'not stored in this browser' }])
    expect(included).toContain('Zoe_lock_abcdef/model/fbx/Zoe_lock_abcdef.fbx')
    expect(included).toContain('Zoe_lock_abcdef/model/fbx/albedo.png')
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort()
    expect(names).toEqual([
      'Zoe_lock_abcdef/README.txt',
      'Zoe_lock_abcdef/manifest.json',
      'Zoe_lock_abcdef/model/fbx/Zoe_lock_abcdef.fbx',
      'Zoe_lock_abcdef/model/fbx/albedo.png',
      'Zoe_lock_abcdef/model/glb/Zoe_lock_abcdef.glb',
    ])
    const rows = await relocateArchive(fbxZip, { destDir: 'x', mainName: 'main' })
    expect(rows.map((r) => r.path).sort()).toEqual(['x/albedo.png', 'x/main.fbx'])
    expect(rows.find((r) => r.path === 'x/albedo.png').isImage).toBe(true)
  })

  it('maps library blob rows to per-character folders', () => {
    expect(libraryBlobPath('Zoe_ab12', 'Zoe', { id: 'char::lock::asset123456::mesh.glb', filename: 'Zoe_lock_asset1.glb' })).toBe('Zoe_ab12/models/lock/asset123/Zoe_lock_asset1.glb')
    expect(libraryBlobPath('Zoe_ab12', 'Zoe', { id: 'char::outfit_o1::glb', kind: 'glb', filename: 'glb' })).toBe('Zoe_ab12/models/outfit_o1/legacy/Zoe_outfit_o1_glb')
  })
})
