import { create } from 'zustand'
import { getDefaultCharacter, CHARACTER_SECTIONS } from '../data/schemas'
import { randomFrom, randomRange, randomName, randomGoals, randomFears, randomDesires, randomTrauma, randomQuirks, randomMoralCodes, randomPrejudices } from '../data/randomPools'
import { generateId } from '../utils/imageUtils'
import { getSetting, saveSetting } from '../utils/db'

export const useCharacterStore = create((set, get) => ({
  // Character data
  character: getDefaultCharacter(),
  characterId: null,

  // Generated content
  generatedImages: {
    profile: null,
    fullbody: null,
    tpose: null,
    mannequin: null,
  },
  backstory: '',
  wardrobe: [],

  // API Key
  apiKey: '',

  // Initialize - load API key from IndexedDB
  initialize: async () => {
    try {
      const key = await getSetting('apiKey')
      if (key) set({ apiKey: key })
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  },

  // Set API key
  setApiKey: async (key) => {
    set({ apiKey: key })
    try {
      await saveSetting('apiKey', key)
    } catch (e) {
      console.error('Failed to save API key:', e)
    }
  },

  // Update a single field
  updateField: (fieldId, value) => {
    set(state => ({
      character: { ...state.character, [fieldId]: value }
    }))
  },

  // Update multiple fields at once
  updateFields: (updates) => {
    set(state => ({
      character: { ...state.character, ...updates }
    }))
  },

  // Set generated image
  setGeneratedImage: (type, base64) => {
    set(state => ({
      generatedImages: { ...state.generatedImages, [type]: base64 }
    }))
  },

  // Set backstory
  setBackstory: (text) => set({ backstory: text }),

  // Wardrobe management
  addOutfit: (outfit) => {
    set(state => ({
      wardrobe: [...state.wardrobe, { ...outfit, id: generateId(), timestamp: Date.now() }]
    }))
  },

  updateOutfit: (outfitId, updates) => {
    set(state => ({
      wardrobe: state.wardrobe.map(o => o.id === outfitId ? { ...o, ...updates } : o)
    }))
  },

  removeOutfit: (outfitId) => {
    set(state => ({
      wardrobe: state.wardrobe.filter(o => o.id !== outfitId)
    }))
  },

  // Randomize a section
  randomizeSection: (sectionKey) => {
    const section = CHARACTER_SECTIONS[sectionKey]
    if (!section) return

    const updates = {}

    section.fields.forEach(field => {
      if (field.conditional) return // Skip conditional fields

      switch (field.type) {
        case 'select':
          updates[field.id] = randomFrom(field.options)
          break
        case 'range':
          updates[field.id] = randomRange(field.min ?? 0, field.max ?? 100)
          break
        case 'number':
          if (field.id === 'age') updates[field.id] = randomRange(18, 80)
          break
        case 'text':
          // Handle specific text fields with pools
          if (field.id === 'name') updates[field.id] = randomName()
          else if (field.id === 'goal') updates[field.id] = randomFrom(randomGoals)
          else if (field.id === 'fear') updates[field.id] = randomFrom(randomFears)
          else if (field.id === 'desire') updates[field.id] = randomFrom(randomDesires)
          else if (field.id === 'trauma') updates[field.id] = randomFrom(randomTrauma)
          else if (field.id === 'quirk') updates[field.id] = randomFrom(randomQuirks)
          else if (field.id === 'moral_code') updates[field.id] = randomFrom(randomMoralCodes)
          else if (field.id === 'prejudice') updates[field.id] = randomFrom(randomPrejudices)
          break
      }
    })

    set(state => ({
      character: { ...state.character, ...updates }
    }))
  },

  // Randomize ALL sections
  randomizeAll: () => {
    const allUpdates = {}

    Object.keys(CHARACTER_SECTIONS).forEach(sectionKey => {
      const section = CHARACTER_SECTIONS[sectionKey]
      section.fields.forEach(field => {
        if (field.conditional) return

        switch (field.type) {
          case 'select':
            allUpdates[field.id] = randomFrom(field.options)
            break
          case 'range':
            allUpdates[field.id] = randomRange(field.min ?? 0, field.max ?? 100)
            break
          case 'number':
            if (field.id === 'age') allUpdates[field.id] = randomRange(18, 80)
            break
          case 'text':
            if (field.id === 'name') allUpdates[field.id] = randomName()
            else if (field.id === 'goal') allUpdates[field.id] = randomFrom(randomGoals)
            else if (field.id === 'fear') allUpdates[field.id] = randomFrom(randomFears)
            else if (field.id === 'desire') allUpdates[field.id] = randomFrom(randomDesires)
            else if (field.id === 'trauma') allUpdates[field.id] = randomFrom(randomTrauma)
            else if (field.id === 'quirk') allUpdates[field.id] = randomFrom(randomQuirks)
            else if (field.id === 'moral_code') allUpdates[field.id] = randomFrom(randomMoralCodes)
            else if (field.id === 'prejudice') allUpdates[field.id] = randomFrom(randomPrejudices)
            break
        }
      })
    })

    set({ character: { ...getDefaultCharacter(), ...allUpdates } })
  },

  // Load a saved character
  loadCharacter: (saved) => {
    set({
      characterId: saved.id,
      character: saved.attributes || getDefaultCharacter(),
      generatedImages: saved.generatedImages || { profile: null, fullbody: null, tpose: null, mannequin: null },
      backstory: saved.backstory || '',
      wardrobe: saved.wardrobe || [],
    })
  },

  // Get current character as saveable object
  getSaveData: () => {
    const state = get()
    return {
      id: state.characterId || generateId(),
      timestamp: Date.now(),
      name: state.character.name || 'Unnamed Character',
      attributes: { ...state.character },
      generatedImages: { ...state.generatedImages },
      backstory: state.backstory,
      wardrobe: [...state.wardrobe],
      metadata: {
        tags: [],
        favorite: false,
        lastModified: Date.now(),
      }
    }
  },

  // Reset to new character
  resetCharacter: () => {
    set({
      character: getDefaultCharacter(),
      characterId: null,
      generatedImages: { profile: null, fullbody: null, tpose: null, mannequin: null },
      backstory: '',
      wardrobe: [],
    })
  },
}))

// Initialize on import
useCharacterStore.getState().initialize()
