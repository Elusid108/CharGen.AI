import { describe, it, expect } from 'vitest'
import { migrateSavedCharacter } from './useCharacter'
import { CHARACTER_SCHEMA_VERSION } from '../data/schemas'

const schema11 = {
  id: 'c1', schemaVersion: 11, name: 'Legacy', timestamp: 1,
  attributes: { name: 'Legacy', species: 'Human' },
  generatedImages: {}, wardrobe: [], chat: null,
  generatedModels: {
    lock: { current: { id: 'a1', slot: 'lock', engine: 'h3', status: 'success', taskId: 't', rigTaskId: 'r', files: { glb: true, riggedGlb: true, preview: true, animIdle: true }, remoteUrls: {} }, archive: [] },
    mannequin: { current: null, archive: [] },
    outfits: {},
  },
  motion: { rigProfileId: '', scripts: [] }, ledger: { events: [] }, characterSeed: 5, rollCount: 0, seedLocked: false,
}

describe('migrateSavedCharacter (schema 11 → 12)', () => {
  it('upgrades 3D records to v2 without losing files', () => {
    const out = migrateSavedCharacter(schema11)
    expect(out.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION)
    expect(CHARACTER_SCHEMA_VERSION).toBe(12)
    const rec = out.generatedModels.lock.current
    expect(rec.recordVersion).toBe(2)
    expect(rec.files['mesh.glb'].stored).toBe(true)
    expect(rec.files['rig.glb'].taskId).toBe('r')
    expect(rec.animations.map((a) => a.id)).toEqual(['idle'])
    expect(out.generatedModels.concept).toEqual({ current: null, archive: [] })
    expect(out.characterSeed).toBe(5)
    expect(out.ledger.events).toEqual([])
  })

  it('never throws on garbage', () => {
    expect(() => migrateSavedCharacter(null)).not.toThrow()
    expect(() => migrateSavedCharacter({ generatedModels: 'junk', attributes: 7 })).not.toThrow()
  })
})
