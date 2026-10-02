import { describe, it, expect } from 'vitest'
import { MESH_PROFILES, profileGenerationOptions, printScaleFactor } from './meshProfiles'
import { buildGenerationPayload } from './tripoEndpoints'

describe('mesh profiles', () => {
  it('animation profile keeps image-only fields for image sources and drops them otherwise', () => {
    const img = profileGenerationOptions('animation', {}, { source: 'image' })
    expect(img.orientation).toBe('align_image')
    expect(img.textureQuality).toBe('detailed')
    const mv = profileGenerationOptions('animation', {}, { source: 'multiview' })
    expect(mv).not.toHaveProperty('orientation')
    expect(mv).not.toHaveProperty('textureAlignment')
    const payload = buildGenerationPayload(mv)
    expect(payload).toEqual({ model: 'v3.1-20260211', texture: true, pbr: true, texture_quality: 'detailed', auto_size: true })
  })

  it('print profile is untextured and detailed; overrides win; low-poly models clamp face limit', () => {
    const p = profileGenerationOptions('print', { model: 'P1-20260311', faceLimit: 1 }, { source: 'text' })
    expect(p.texture).toBe(false)
    expect(p).not.toHaveProperty('textureQuality')
    expect(p.faceLimit).toBe(1000)
    expect(buildGenerationPayload(p)).toEqual({ model: 'P1-20260311', texture: false, pbr: false, face_limit: 1000, auto_size: true })
    expect(profileGenerationOptions('bogus', { texture: undefined }).texture).toBe(true)
    expect(MESH_PROFILES.print.convert.formats).toEqual(['STL', '3MF'])
  })

  it('printScaleFactor converts metres to a target height in mm', () => {
    expect(printScaleFactor({ bounds: [0.5, 1.8, 0.3] }, 180)).toBeCloseTo(0.1, 6)
    expect(printScaleFactor({ bounds: [0, 0, 0] }, 100)).toBeNull()
    expect(printScaleFactor(null, 100)).toBeNull()
  })
})
