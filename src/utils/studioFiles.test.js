import { describe, it, expect } from 'vitest'
import { viewableFiles, defaultViewKey, fileKeyLabel, isPreviewableKey, formatLength, formatBytes, assetCreditsSpent, assetStatusLabel } from './studioFiles'
import { emptyModelRecord, fileEntry } from './tripoModels'

function rec(keys, extra = {}) {
  const files = {}
  for (const k of keys) files[k] = fileEntry(k, { stored: true, bytes: 100 })
  return emptyModelRecord({ files, status: 'success', ...extra })
}

describe('studioFiles', () => {
  it('labels and orders files by family', () => {
    const r = rec(['convert.STL.stl', 'anim.walk.glb', 'mesh.glb', 'rig.glb', 'lod.4000.glb', 'preview.jpg', 'convert.FBX.zip'])
    const rows = viewableFiles(r)
    expect(rows.map((x) => x.key)).toEqual(['mesh.glb', 'rig.glb', 'anim.walk.glb', 'lod.4000.glb', 'convert.FBX.zip', 'convert.STL.stl'])
    expect(rows.find((x) => x.key === 'anim.walk.glb').label).toBe('Walk')
    expect(rows.find((x) => x.key === 'convert.FBX.zip').previewable).toBe(false)
    expect(rows.find((x) => x.key === 'convert.STL.stl').previewable).toBe(true)
    expect(fileKeyLabel('lod.4000.glb')).toBe('LOD 4000')
    expect(isPreviewableKey('convert.GLTF.zip')).toBe(false)
    expect(isPreviewableKey('convert.USDZ.usdz')).toBe(true)
  })

  it('prefers the rig, then the mesh, then anything previewable', () => {
    expect(defaultViewKey(rec(['mesh.glb', 'rig.glb']))).toBe('rig.glb')
    expect(defaultViewKey(rec(['mesh.glb']))).toBe('mesh.glb')
    expect(defaultViewKey(rec(['convert.STL.stl']))).toBe('convert.STL.stl')
    expect(defaultViewKey(rec(['convert.FBX.zip']))).toBeNull()
    expect(defaultViewKey(rec(['mesh.glb', 'anim.idle.glb']), 'anim.idle.glb')).toBe('anim.idle.glb')
    expect(defaultViewKey(rec(['mesh.glb']), 'anim.idle.glb')).toBe('mesh.glb')
  })

  it('formats lengths and sizes', () => {
    expect(formatLength(1.8)).toBe('1.80 m')
    expect(formatLength(0.25)).toBe('25.0 cm')
    expect(formatLength(0.004)).toBe('4.0 mm')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(null)).toBe('—')
  })

  it('sums credits and reports status', () => {
    const r = rec(['mesh.glb'], { creditsConsumed: 99, jobs: { a: { id: 'a', kind: 'mesh', status: 'success', creditsConsumed: 20 }, b: { id: 'b', kind: 'rig', status: 'success', creditsConsumed: 25 } } })
    expect(assetCreditsSpent(r)).toBe(45)
    expect(assetStatusLabel(r)).toBe('Ready')
    const busy = emptyModelRecord({ status: 'success', activeJobId: 'j', jobs: { j: { id: 'j', kind: 'rig', label: 'Rigging mesh', status: 'running', progress: 40 } } })
    expect(assetStatusLabel(busy)).toBe('Rigging mesh · running 40%')
    expect(assetStatusLabel(null)).toBe('Empty')
  })
})
