import { create } from 'zustand'
import { getDefaultCharacter, CHARACTER_SECTIONS, CHARACTER_SCHEMA_VERSION, emptyGeneratedImages } from '../data/schemas'
import { randomRange, randomName } from '../data/randomPools'
import { normalizeSelectOptions, pickWeightedFrom } from '../data/options'
import {
  genreWeightMultiplier,
  SILHOUETTE_TEMPLATES,
  extraversionToBattery,
  correlateChestAnatomy,
  correlateGenderExpression,
  correlateTransitionNote,
  correlateRomanticFromSexual,
  speciesSpecialFeatureWeight,
  HAIRLESS_SPECIES,
  OFTEN_HAIRLESS_SPECIES,
  apparentAgeFromChronological,
} from '../data/options/priors'
import { generateId } from '../utils/imageUtils'
import { getSetting, saveSetting } from '../utils/db'
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from '../utils/modelConstants'
import { fetchGeminiModels } from '../utils/models'
import { generateCustomFields } from '../utils/api'
import { useToastStore } from './useToast'
import { emptyChatState, normalizeChatState } from '../utils/chatPrompt'

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

function optionWeightForField(field, option, character) {
  const genre = character?.genre || 'Mixed'
  const species = character?.species
  let w = option.weight ?? 1
  w *= genreWeightMultiplier(genre, field.id, option.id)
  if (field.id === 'special_features' && species) {
    w *= speciesSpecialFeatureWeight(species, option.id)
  }
  if (species === 'Human' || species === 'Elf' || species === 'Dwarf') {
    if (field.id === 'skin_tone' && (option.id === 'Scaled' || option.id === 'Furred')) w *= 0.08
    if (
      field.id === 'skin_texture'
      && (option.id === 'Scaled' || option.id === 'Furred' || option.id === 'Chitin' || option.id === 'Crystalline' || option.id === 'Bark-like')
    ) {
      w *= 0.1
    }
  }
  return w
}

function randomSelectValue(field, character = {}) {
  const options = normalizeSelectOptions(field.options)
  return pickWeightedFrom(options, (o) => optionWeightForField(field, o, character))
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
  const { skipLocalTextForLlm = false, character = {} } = opts
  switch (field.type) {
    case 'select':
      return randomSelectValue(field, character)
    case 'range':
      return randomRange(field.min ?? 0, field.max ?? 100)
    case 'number':
      if (field.id === 'age') return randomRange(18, 80)
      if (field.id === 'aging') {
        if (character.age !== '' && character.age != null) {
          return apparentAgeFromChronological(character.age, character.species)
        }
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

const REGION_FIELD_IDS = [
  'forearms', 'upper_arms', 'shoulders', 'neck', 'chest_size',
  'abs', 'back', 'glutes', 'upper_legs', 'lower_legs',
]

function applyRandomizeCorrelations(next, lockedFields, hints = {}) {
  const locked = (id) => !!lockedFields[id]
  const out = { ...next }
  const rolledSet = hints.rolled ? new Set(hints.rolled) : null
  const touched = (...ids) => !rolledSet || ids.some((id) => rolledSet.has(id))

  if (touched('aging', 'age') && !locked('aging') && out.age !== '' && out.age != null) {
    out.aging = apparentAgeFromChronological(out.age, out.species)
  }

  if (touched('battery', 'ocean_e') && !locked('battery') && out.ocean_e != null && out.ocean_e !== '') {
    out.battery = extraversionToBattery(out.ocean_e)
  }

  const template = SILHOUETTE_TEMPLATES[out.silhouette]
  if (
    template
    && touched('silhouette', ...REGION_FIELD_IDS, 'muscle_def', 'body_softness')
  ) {
    for (const [id, val] of Object.entries(template)) {
      if (locked(id)) continue
      if (id === 'muscle_def' || id === 'body_softness') {
        const [lo, hi] = val
        out[id] = randomRange(lo, hi)
      } else {
        out[id] = val
      }
    }
    if (Math.random() < 0.3) {
      const pick = REGION_FIELD_IDS[Math.floor(Math.random() * REGION_FIELD_IDS.length)]
      const field = FIELD_BY_ID[pick]
      if (field && !locked(pick)) {
        out[pick] = randomSelectValue(field, out)
      }
    }
  }

  const species = out.species
  const forceNa = HAIRLESS_SPECIES.has(species)
    || (OFTEN_HAIRLESS_SPECIES.has(species) && Math.random() < 0.55)
  if (forceNa && touched('body_hair', 'mustache', 'beard', 'species')) {
    if (!locked('body_hair')) out.body_hair = 'N/A (Non-Human)'
    if (!locked('mustache')) out.mustache = 'N/A (Non-Human)'
    if (!locked('beard')) out.beard = 'N/A (Non-Human)'
  }

  if (touched('chest_anatomy', 'sex') && !locked('chest_anatomy') && out.sex) {
    out.chest_anatomy = correlateChestAnatomy(out.sex)
  }

  if (touched('gender_expression', 'gender') && !locked('gender_expression') && out.gender && Math.random() < 0.7) {
    const expr = correlateGenderExpression(out.gender)
    if (expr) out.gender_expression = expr
  }

  if (touched('transition_note', 'gender') && !locked('transition_note') && out.gender) {
    out.transition_note = correlateTransitionNote(out.gender)
  }

  if (touched('romantic_orientation', 'orientation') && !locked('romantic_orientation') && out.orientation && Math.random() < 0.75) {
    const rom = correlateRomanticFromSexual(out.orientation)
    if (rom) out.romantic_orientation = rom
  }

  if (touched('sexual_role', 'sex') && !locked('sexual_role') && (out.sex === 'None/Construct' || out.sex === 'Non-Applicable')) {
    if (Math.random() < 0.75) out.sexual_role = 'N/A'
  }

  if (touched('special_features', 'species') && !locked('special_features') && species === 'Human' && Math.random() < 0.82) {
    out.special_features = 'Fully humanoid baseline'
  }

  return out
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
      const val = randomValueForField(field, { skipLocalTextForLlm, character: nextCharacter })
      if (val !== undefined) nextCharacter[field.id] = val
    })
  })

  return applyRandomizeCorrelations(nextCharacter, lockedFields)
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

function emptyGeneratedImagesState() {
  return emptyGeneratedImages()
}

/** Wipe identity-bound extras so Randomize All cannot keep the previous person's thread or art. */
function newCharacterSessionFields() {
  return {
    characterId: null,
    generatedImages: emptyGeneratedImagesState(),
    backstory: '',
    chatCanon: '',
    wardrobe: [],
    chat: emptyChatState(),
  }
}

/**
 * Normalize a library record (v1 lock migrate, v3 chat, v4 front/side/back slots).
 * @param {Record<string, unknown>} saved
 */
export function migrateSavedCharacter(saved) {
  if (!saved || typeof saved !== 'object') {
    return {
      generatedImages: emptyGeneratedImagesState(),
      presentationMode: 'canonical',
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      attributes: getDefaultCharacter(),
      chatCanon: '',
      chat: emptyChatState(),
    }
  }

  const version = Number(saved.schemaVersion) || 1
  const images = { ...emptyGeneratedImagesState(), ...(saved.generatedImages || {}) }

  if (version < 2 && images.tpose && !images.turnaround) {
    images.turnaround = images.tpose
    images.tpose = null
  }

  const attributes = { ...getDefaultCharacter(), ...(saved.attributes || {}) }
  if (version < 5) {
    if (!attributes.gender_expression) {
      attributes.gender_expression = correlateGenderExpression(attributes.gender) || ''
    }
    if (!attributes.transition_note) {
      attributes.transition_note =
        attributes.gender === 'Transgender Man' || attributes.gender === 'Transgender Woman'
          ? 'Post-transition'
          : 'None noted'
    }
    if (!attributes.romantic_orientation && attributes.orientation && attributes.orientation !== 'Asexual') {
      attributes.romantic_orientation = correlateRomanticFromSexual(attributes.orientation) || ''
    }
  }

  return {
    ...saved,
    generatedImages: images,
    presentationMode: saved.presentationMode === 'thirst' ? 'thirst' : 'canonical',
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    attributes,
    chatCanon: typeof saved.chatCanon === 'string' ? saved.chatCanon : '',
    chat: normalizeChatState(saved.chat),
  }
}

export const useCharacterStore = create((set, get) => ({
  // Character data
  character: getDefaultCharacter(),
  characterId: null,

  // Generated content
  generatedImages: emptyGeneratedImagesState(),
  backstory: '',
  chatCanon: '',
  wardrobe: [],
  presentationMode: 'canonical',
  chat: emptyChatState(),

  // API Key
  apiKey: '',
  settingsReady: false,

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
      const updates = { settingsReady: true }
      if (key) updates.apiKey = key
      if (textModel) updates.selectedTextModel = textModel
      if (imageModel) updates.selectedImageModel = imageModel
      set(updates)
    } catch (e) {
      console.error('Failed to load settings:', e)
      set({ settingsReady: true })
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

  setPresentationMode: (mode) => {
    set({ presentationMode: mode === 'thirst' ? 'thirst' : 'canonical' })
  },

  setCharacterId: (id) => {
    set({ characterId: id || null })
  },

  // Set backstory
  setBackstory: (text) => set({ backstory: text }),

  setChatCanon: (text) => set({ chatCanon: typeof text === 'string' ? text : '' }),

  setChat: (chat) => set({ chat: normalizeChatState(chat) }),

  updateChatSettings: (patch) => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      const nextSettings = { ...current.settings, ...(patch || {}) }
      if (patch?.userPersona) {
        nextSettings.userPersona = {
          ...current.settings.userPersona,
          ...patch.userPersona,
        }
      }
      return { chat: { ...current, settings: nextSettings } }
    })
  },

  appendChatTurn: ({ uiMessages, apiMessage }) => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      return {
        chat: {
          ...current,
          ui: uiMessages?.length ? [...current.ui, ...uiMessages] : current.ui,
          api: apiMessage ? [...current.api, apiMessage] : current.api,
        },
      }
    })
  },

  replaceChatApiAndUi: ({ ui, api }) => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      return {
        chat: {
          ...current,
          ui: ui ?? current.ui,
          api: api ?? current.api,
        },
      }
    })
  },

  clearChat: () => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      return { chat: { ...emptyChatState(), settings: current.settings } }
    })
  },

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
    const draft = { ...character }
    section.fields.forEach((field) => {
      if (fieldSkippedForRandomize(field, lf)) return
      const val = randomValueForField(field, { skipLocalTextForLlm: hasKey, character: draft })
      if (val !== undefined) {
        updates[field.id] = val
        draft[field.id] = val
      } else if (hasKey && field.type === 'text' && field.id === 'name') {
        updates.name = ''
        draft.name = ''
      }
    })

    const correlated = applyRandomizeCorrelations({ ...character, ...updates }, lf, {
      rolled: Object.keys(updates),
    })
    Object.keys(correlated).forEach((id) => {
      if (lf[id]) return
      if (correlated[id] !== character[id]) updates[id] = correlated[id]
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
      set({ character: next, ...newCharacterSessionFields() })
      toast('Add an API key in Settings to use AI randomization.', 'info')
      return { source: 'local', reason: 'no_api_key' }
    }

    const targets = collectLlmTextFieldIds(next, lockedFields, { mode: 'all' })
    if (targets.length === 0) {
      set({ character: { ...next, ...lockedSlice }, ...newCharacterSessionFields() })
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
        set({ character: { ...next, ...lockedSlice }, ...newCharacterSessionFields() })
        return { source: 'local', reason: 'api_error' }
      }

      const filled = mergeLlmTextPatch(next, patch, targets)
      set({ character: { ...filled, ...lockedSlice }, ...newCharacterSessionFields() })
      return { source: 'llm' }
    } finally {
      set({ isGenerating: false })
    }
  },

  // Load a saved character
  loadCharacter: (saved) => {
    const migrated = migrateSavedCharacter(saved)
    const lf = migrated.lockedFields
    const lockedFields =
      lf && typeof lf === 'object' && !Array.isArray(lf) ? { ...lf } : {}
    set({
      characterId: migrated.id,
      character: migrated.attributes || getDefaultCharacter(),
      generatedImages: migrated.generatedImages,
      backstory: migrated.backstory || '',
      chatCanon: migrated.chatCanon || '',
      wardrobe: migrated.wardrobe || [],
      presentationMode: migrated.presentationMode,
      chat: migrated.chat,
      lockedFields,
    })
  },

  // Get current character as saveable object
  getSaveData: () => {
    const state = get()
    return {
      id: state.characterId || generateId(),
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      timestamp: Date.now(),
      name: state.character.name || 'Unnamed Character',
      attributes: { ...state.character },
      generatedImages: { ...state.generatedImages },
      backstory: state.backstory,
      chatCanon: state.chatCanon || '',
      wardrobe: [...state.wardrobe],
      presentationMode: state.presentationMode === 'thirst' ? 'thirst' : 'canonical',
      chat: normalizeChatState(state.chat),
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
      generatedImages: emptyGeneratedImagesState(),
      backstory: '',
      chatCanon: '',
      wardrobe: [],
      presentationMode: 'canonical',
      chat: emptyChatState(),
      lockedFields: {},
    })
  },
}))

// Initialize on import
useCharacterStore.getState().initialize()
