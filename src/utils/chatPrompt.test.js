import { describe, it, expect } from 'vitest'
import { composeChatSystemPrompt } from './chatPrompt'
import { getDefaultCharacter } from '../data/schemas'

describe('composeChatSystemPrompt history block', () => {
  const character = { ...getDefaultCharacter(), name: 'Vex' }
  it('has no history block without a ledger', () => {
    const p = composeChatSystemPrompt({ character, settings: {} })
    expect(p).not.toContain('[HISTORY — SUBTEXT]')
    expect(p).toContain('[CANON — YOUR OWN WORDS]')
  })
  it('places history between interior and canon', () => {
    const ledger = { events: [{ age: 12, title: 'The crossing', summary: 'They learned to pass.' }] }
    const p = composeChatSystemPrompt({ character, settings: {}, ledger })
    const h = p.indexOf('[HISTORY — SUBTEXT]')
    expect(h).toBeGreaterThan(p.indexOf('[INTERIOR — SUBTEXT]'))
    expect(h).toBeLessThan(p.indexOf('[CANON — YOUR OWN WORDS]'))
    expect(p).toContain('Age 12 — The crossing: They learned to pass.')
  })
})
