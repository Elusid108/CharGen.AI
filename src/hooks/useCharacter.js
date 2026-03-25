import { create } from 'zustand'
import { getDefaultCharacter, CHARACTER_SECTIONS } from '../data/schemas'
import { randomFrom, randomRange, randomName } from '../data/randomPools'
import { generateId } from '../utils/imageUtils'
import { getSetting, saveSetting } from '../utils/db'
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from '../utils/modelConstants'
import { fetchGeminiModels } from '../utils/models'
import { generateCustomFields } from '../utils/api'
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
  return randomFrom(field.options)
}

function pickLockedFromCharacter(character, lockedFields) {
  const out = {}
  Object.keys(lockedFields).forEach((id) => {
    if (lockedFields[id]) out[id] = character[id]
  })
  return out
}

/**
 * Random value for one schema field; returns undefined if this field is not auto-randomized.
 * @param {{ skipLocalTextForLlm?: boolean }} [opts] — when true, leave `name` empty for hybrid LLM fill
 */
function randomValueForField(field, opts = {}) {
  const { skipLocalTextForLlm = false } = opts
  switch (field.type) {
    case 'select':
      return randomSelectValue(field)
    case 'range':
      return randomRange(field.min ?? 0, field.max ?? 100)
    case 'number':
      if (field.id === 'age') return randomRange(18, 80)
      if (field.id === 'aging') {
        const lo = field.min ?? 1
        const hi = field.max ?? 120
        return randomRange(lo, hi)
      }
      return undefined
    case 'text':
      if (field.id === 'name') {
        if (skipLocalTextForLlm) return undefined
        return randomName()
      }
      return undefined
    default:
      return undefined
  }
}

function fieldSkippedForRandomize(field, lockedFields) {
  if (field.conditional) return true
  if (lockedFields[field.id]) return true
  return false
}

/** Pool-based full randomize; respects lockedFields by copying values from `character`. */
function buildLocalRandomizedCharacter(lockedFields, character, options = {}) {
  const { skipLocalTextForLlm = false } = options
  const nextCharacter = { ...getDefaultCharacter() }

  Object.keys(lockedFields).forEach((id) => {
    if (lockedFields[id]) nextCharacter[id] = character[id]
  })

  Object.entries(CHARACTER_SECTIONS).forEach(([_sectionId, section]) => {
    section.fields.forEach((field) => {
      if (fieldSkippedForRandomize(field, lockedFields)) return
      const val = randomValueForField(field, { skipLocalTextForLlm })
      if (val !== undefined) nextCharacter[field.id] = val
    })
  })

  return nextCharacter
}

/** Merge section updates and clear `*_custom` when a rolled select is no longer Custom. */
function mergeCharacterWithSelectCleanup(prev, updates) {
  const merged = { ...prev, ...updates }
  for (const [id, val] of Object.entries(updates)) {
    const f = FIELD_BY_ID[id]
    if (f?.type !== 'select' || val === 'Custom') continue
    const cid = `${id}_custom`
    if (FIELD_BY_ID[cid]) merged[cid] = ''
  }
  return merged
}

/** After a full local build, drop orphan `*_custom` strings when the parent select is not Custom. */
function clearStaleCustomTexts(merged) {
  const out = { ...merged }
  Object.values(CHARACTER_SECTIONS).forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type !== 'select') return
      const customId = `${field.id}_custom`
      if (!FIELD_BY_ID[customId]) return
      if (out[field.id] !== 'Custom') out[customId] = ''
    })
  })
  return out
}

function textFieldVisibleForMerged(merged, field) {
  if (!field.conditional) return true
  return merged[field.conditional.field] === field.conditional.value
}

/**
 * @param {Record<string, unknown>} mergedCharacter
 * @param {Record<string, true>} lockedFields
 * @param {{ mode: 'all' | 'section', sectionKey?: string, rolledFieldIds?: string[] }} context
 */
function collectLlmTextFieldIds(mergedCharacter, lockedFields, context) {
  const { mode, sectionKey, rolledFieldIds } = context
  const rolledSet = rolledFieldIds ? new Set(rolledFieldIds) : null
  const targets = []

  for (const [secKey, section] of Object.entries(CHARACTER_SECTIONS)) {
    if (mode === 'section' && secKey !== sectionKey) continue
    for (const field of section.fields) {
      if (field.type !== 'text') continue
      if (lockedFields[field.id]) continue
      if (!textFieldVisibleForMerged(mergedCharacter, field)) continue

      if (mode === 'all') {
        if (field.conditional) {
          if (mergedCharacter[field.conditional.field] === 'Custom') targets.push(field.id)
        } else {
          targets.push(field.id)
        }
      } else {
        const parentId = field.conditional?.field
        if (field.conditional) {
          if (mergedCharacter[parentId] !== 'Custom') continue
          if (!rolledSet.has(parentId)) continue
          targets.push(field.id)
        } else {
          if (!rolledSet.has(field.id)) continue
          targets.push(field.id)
        }
      }
    }
  }

  return [...new Set(targets)]
}

function mergeLlmTextPatch(baseCharacter, patch, allowedIds) {
  const out = { ...baseCharacter }
  const allow = new Set(allowedIds)
  for (const id of allow) {
    if (!Object.prototype.hasOwnProperty.call(patch, id)) continue
    const v = patch[id]
    out[id] = v === null || v === undefined ? '' : String(v)
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
      wardrobe: [
        ...state.wardrobe,
        {
          ...outfit,
          id: outfit.id || generateId(),
          timestamp: outfit.timestamp ?? Date.now(),
        },
      ],
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

  /**
   * Randomize one section: local dice first, then targeted LLM for name / Custom follow-ups when an API key is set.
   * @returns {Promise<{ source: 'llm' | 'local', reason?: string }>}
   */
  randomizeSection: async (sectionKey) => {
    const section = CHARACTER_SECTIONS[sectionKey]
    if (!section) return { source: 'local' }

    const { lockedFields: lf, character, apiKey, selectedTextModel } = get()
    const hasKey = !!apiKey?.trim()
    const toast = useToastStore.getState().addToast

    const updates = {}
    section.fields.forEach((field) => {
      if (fieldSkippedForRandomize(field, lf)) return
      const val = randomValueForField(field, { skipLocalTextForLlm: hasKey })
      if (val !== undefined) updates[field.id] = val
      else if (hasKey && field.type === 'text' && field.id === 'name') {
        updates.name = ''
      }
    })

    const merged = mergeCharacterWithSelectCleanup(character, updates)
    const rolledFieldIds = Object.keys(updates)

    const targets = collectLlmTextFieldIds(merged, lf, {
      mode: 'section',
      sectionKey,
      rolledFieldIds,
    })

    if (!hasKey || targets.length === 0) {
      set({ character: merged })
      return { source: 'local' }
    }

    set({ isGenerating: true })
    try {
      let patch
      try {
        patch = await generateCustomFields(
          CHARACTER_SECTIONS,
          selectedTextModel,
          apiKey.trim(),
          merged,
          targets
        )
      } catch (e) {
        console.error('generateCustomFields failed:', e)
        toast(
          `AI randomization failed (${e instanceof Error ? e.message : 'unknown error'}). Custom text fields left blank.`,
          'error'
        )
        set({ character: merged })
        return { source: 'local', reason: 'api_error' }
      }

      const filled = mergeLlmTextPatch(merged, patch, targets)
      set({ character: filled })
      return { source: 'llm' }
    } finally {
      set({ isGenerating: false })
    }
  },

  /**
   * Randomize all sections: local dice first (including Custom), then targeted LLM for text / *_custom when an API key is set.
   * On API failure, keeps the local dice result and shows an error toast.
   * @returns {Promise<{ source: 'llm' | 'local', reason?: string }>}
   */
  randomizeAll: async () => {
    const { lockedFields, character, apiKey, selectedTextModel } = get()
    const toast = useToastStore.getState().addToast
    const hasKey = !!apiKey?.trim()
    const lockedSlice = pickLockedFromCharacter(character, lockedFields)

    let next = buildLocalRandomizedCharacter(lockedFields, character, {
      skipLocalTextForLlm: hasKey,
    })
    next = clearStaleCustomTexts(next)

    if (!hasKey) {
      set({ character: next })
      toast('Add an API key in Settings to use AI randomization.', 'info')
      return { source: 'local', reason: 'no_api_key' }
    }

    const targets = collectLlmTextFieldIds(next, lockedFields, { mode: 'all' })
    if (targets.length === 0) {
      set({ character: { ...next, ...lockedSlice } })
      return { source: 'local' }
    }

    set({ isGenerating: true })
    try {
      let patch
      try {
        patch = await generateCustomFields(
          CHARACTER_SECTIONS,
          selectedTextModel,
          apiKey.trim(),
          next,
          targets
        )
      } catch (e) {
        console.error('generateCustomFields failed:', e)
        toast(
          `AI randomization failed (${e instanceof Error ? e.message : 'unknown error'}). Used local dice; custom text left blank.`,
          'error'
        )
        set({ character: { ...next, ...lockedSlice } })
        return { source: 'local', reason: 'api_error' }
      }

      const filled = mergeLlmTextPatch(next, patch, targets)
      set({ character: { ...filled, ...lockedSlice } })
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
