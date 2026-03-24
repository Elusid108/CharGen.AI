import { create } from 'zustand'
import { getDefaultCharacter, CHARACTER_SECTIONS, getAllFieldIds } from '../data/schemas'
import { randomFrom, randomRange, randomName } from '../data/randomPools'
import { generateId } from '../utils/imageUtils'
import { getSetting, saveSetting } from '../utils/db'
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from '../utils/modelConstants'
import { fetchGeminiModels } from '../utils/models'
import { generateCharacterProfile } from '../utils/api'
import { useToastStore } from './useToast'

function buildFieldById() {
  const map = {}
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      map[field.id] = field
    })
  })
  return map
}

const FIELD_BY_ID = buildFieldById()

function randomSelectValue(field) {
  const opts = field.options.includes('Custom')
    ? field.options.filter((o) => o !== 'Custom')
    : field.options
  return randomFrom(opts)
}

function pickLockedFromCharacter(character, lockedFields) {
  const out = {}
  Object.keys(lockedFields).forEach((id) => {
    if (lockedFields[id]) out[id] = character[id]
  })
  return out
}

/** Pool-based full randomize; respects lockedFields by copying values from `character`. */
function buildLocalRandomizedCharacter(lockedFields, character) {
  const nextCharacter = { ...getDefaultCharacter() }

  Object.keys(lockedFields).forEach((id) => {
    if (lockedFields[id]) nextCharacter[id] = character[id]
  })

  Object.keys(CHARACTER_SECTIONS).forEach((sectionKey) => {
    const section = CHARACTER_SECTIONS[sectionKey]
    section.fields.forEach((field) => {
      if (field.conditional) return
      if (lockedFields[field.id]) return

      switch (field.type) {
        case 'select':
          nextCharacter[field.id] = randomSelectValue(field)
          break
        case 'range':
          nextCharacter[field.id] = randomRange(field.min ?? 0, field.max ?? 100)
          break
        case 'number':
          if (field.id === 'age') nextCharacter[field.id] = randomRange(18, 80)
          break
        case 'text':
          if (field.id === 'name') nextCharacter[field.id] = randomName()
          break
      }
    })
  })

  return nextCharacter
}

function sanitizeLlmCharacter(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid character payload')
  }
  const defaults = getDefaultCharacter()
  const out = { ...defaults }
  const allowed = getAllFieldIds()

  for (const id of allowed) {
    if (!Object.prototype.hasOwnProperty.call(parsed, id)) continue
    const field = FIELD_BY_ID[id]
    if (!field) continue
    const v = parsed[id]

    if (field.type === 'range') {
      const n = Number(v)
      out[id] = Number.isFinite(n)
        ? Math.min(field.max ?? 100, Math.max(field.min ?? 0, Math.round(n)))
        : defaults[id]
    } else if (field.type === 'number' && id === 'age') {
      const n = parseInt(v, 10)
      out[id] = Number.isFinite(n) ? Math.min(80, Math.max(18, n)) : defaults[id]
    } else if (field.type === 'select') {
      const s = String(v)
      out[id] = field.options.includes(s) ? s : defaults[id]
    } else {
      out[id] = v === null || v === undefined ? '' : String(v)
    }
  }

  return out
}

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

  availableTextModels: [],
  availableImageModels: [],
  selectedTextModel: DEFAULT_TEXT_MODEL,
  selectedImageModel: DEFAULT_IMAGE_MODEL,

  isGenerating: false,

  /** @type {Record<string, true>} field ids that stay fixed on randomize */
  lockedFields: {},

  toggleLock: (fieldId) =>
    set((state) => {
      const next = { ...state.lockedFields }
      if (next[fieldId]) delete next[fieldId]
      else next[fieldId] = true
      return { lockedFields: next }
    }),

  // Initialize - load API key and model prefs from IndexedDB
  initialize: async () => {
    try {
      const [key, textModel, imageModel] = await Promise.all([
        getSetting('apiKey'),
        getSetting('selectedTextModel'),
        getSetting('selectedImageModel'),
      ])
      const updates = {}
      if (key) updates.apiKey = key
      if (textModel) updates.selectedTextModel = textModel
      if (imageModel) updates.selectedImageModel = imageModel
      if (Object.keys(updates).length) set(updates)
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

  setSelectedTextModel: async (model) => {
    set({ selectedTextModel: model })
    try {
      await saveSetting('selectedTextModel', model)
    } catch (e) {
      console.error('Failed to save text model:', e)
    }
  },

  setSelectedImageModel: async (model) => {
    set({ selectedImageModel: model })
    try {
      await saveSetting('selectedImageModel', model)
    } catch (e) {
      console.error('Failed to save image model:', e)
    }
  },

  refreshModels: async (key) => {
    const trimmed = key?.trim()
    if (!trimmed) return
    const { selectedTextModel, selectedImageModel } = get()
    const result = await fetchGeminiModels(trimmed, { selectedTextModel, selectedImageModel })
    if (!result) return
    set({
      availableTextModels: result.availableTextModels,
      availableImageModels: result.availableImageModels,
      selectedTextModel: result.selectedTextModel,
      selectedImageModel: result.selectedImageModel,
    })
    try {
      await saveSetting('selectedTextModel', result.selectedTextModel)
      await saveSetting('selectedImageModel', result.selectedImageModel)
    } catch (e) {
      console.error('Failed to save model selection:', e)
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
      if (get().lockedFields[field.id]) return

      switch (field.type) {
        case 'select':
          updates[field.id] = randomSelectValue(field)
          break
        case 'range':
          updates[field.id] = randomRange(field.min ?? 0, field.max ?? 100)
          break
        case 'number':
          if (field.id === 'age') updates[field.id] = randomRange(18, 80)
          break
        case 'text':
          if (field.id === 'name') updates[field.id] = randomName()
          break
      }
    })

    set(state => ({
      character: { ...state.character, ...updates }
    }))
  },

  /**
   * Randomize all sections via Gemini when an API key is set; otherwise local pools.
   * On API/JSON failure, falls back to local randomization and shows an error toast.
   * @returns {Promise<{ source: 'llm' | 'local', reason?: string }>}
   */
  randomizeAll: async () => {
    const { lockedFields, character, apiKey, selectedTextModel } = get()
    const toast = useToastStore.getState().addToast

    const applyLocal = (reason) => {
      const next = buildLocalRandomizedCharacter(lockedFields, character)
      set({ character: next })
      return reason ? { source: 'local', reason } : { source: 'local' }
    }

    if (!apiKey?.trim()) {
      const r = applyLocal('no_api_key')
      toast('Add an API key in Settings to use AI randomization.', 'info')
      return r
    }

    set({ isGenerating: true })
    try {
      let parsed
      try {
        parsed = await generateCharacterProfile(
          CHARACTER_SECTIONS,
          selectedTextModel,
          apiKey.trim(),
          character
        )
      } catch (e) {
        console.error('generateCharacterProfile failed:', e)
        toast(
          `AI randomization failed (${e instanceof Error ? e.message : 'unknown error'}). Used local random values.`,
          'error'
        )
        return applyLocal('api_error')
      }

      let sanitized
      try {
        sanitized = sanitizeLlmCharacter(parsed)
      } catch (e) {
        console.error('sanitizeLlmCharacter failed:', e)
        toast('Invalid AI response. Used local random values.', 'error')
        return applyLocal('parse_error')
      }

      const lockedSlice = pickLockedFromCharacter(character, lockedFields)
      set({ character: { ...sanitized, ...lockedSlice } })
      return { source: 'llm' }
    } finally {
      set({ isGenerating: false })
    }
  },

  // Load a saved character
  loadCharacter: (saved) => {
    const lf = saved.lockedFields
    const lockedFields =
      lf && typeof lf === 'object' && !Array.isArray(lf) ? { ...lf } : {}
    set({
      characterId: saved.id,
      character: saved.attributes || getDefaultCharacter(),
      generatedImages: saved.generatedImages || { profile: null, fullbody: null, tpose: null, mannequin: null },
      backstory: saved.backstory || '',
      wardrobe: saved.wardrobe || [],
      lockedFields,
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
      },
      lockedFields: { ...state.lockedFields },
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
      lockedFields: {},
    })
  },
}))

// Initialize on import
useCharacterStore.getState().initialize()
