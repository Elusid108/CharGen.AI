import { describe, it, expect } from 'vitest'
import { buildStoryBible } from './storyBible'
import { getDefaultCharacter } from '../data/schemas'

describe('buildStoryBible ledger', () => {
  const c = { ...getDefaultCharacter(), name: 'Vex', goal: 'Buy freedom', trauma: 'Former captivity' }
  it('omits life_ledger without events', () => {
    expect(buildStoryBible(c)).not.toHaveProperty('life_ledger')
    expect(buildStoryBible(c, { ledger: { events: [] } })).not.toHaveProperty('life_ledger')
  })
  it('renders life_ledger when events exist', () => {
    const bible = buildStoryBible(c, { ledger: { events: [{ age: 9, title: 'Taken', summary: 'Held for a season.' }] } })
    expect(bible.life_ledger).toBe('Age 9 — Taken: Held for a season.')
    expect(bible.wound).toBe('Former captivity')
  })
})
