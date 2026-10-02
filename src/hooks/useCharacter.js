import { create } from 'zustand'
import { getDefaultCharacter, CHARACTER_SECTIONS, CHARACTER_SCHEMA_VERSION, emptyGeneratedImages, emptyImagePrefs, normalizeImagePrefs } from '../data/schemas'
import { correlateGenderExpression, correlateRomanticFromSexual } from '../data/options/priors'
import {
  buildLocalRandomizedCharacter,
  rollSection,
  mergeCharacterWithSelectCleanup,
  clearStaleCustomTexts,
  collectLlmTextFieldIds,
  mergeLlmTextPatch,
  pickLockedFromCharacter,
  effectiveLockedFields,
} from '../utils/characterRoll'
import { createRng, hashSeed, randomSeed, clampSeed, SEED_MAX } from '../utils/rng'
import { deriveFromOcean } from '../data/options/oceanDerivation'
import {
  emptyLedger,
  normalizeLedger,
  buildLedger,
  applyLedgerEffects,
  rerollLedgerEvent as rerollLedgerEventPure,
  addLedgerEvent as addLedgerEventPure,
} from '../utils/ledger'
import { generateId } from '../utils/imageUtils'
import { migrateOutfit } from '../utils/wardrobe'
import { deleteSlotModels, getSetting, saveSetting, getRigProfile } from '../utils/db'
import { emptyGeneratedModels, normalizeGeneratedModels } from '../utils/tripoModels'
import { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL } from '../utils/modelConstants'
import { fetchGeminiModels } from '../utils/models'
import { generateCustomFields, generateMotionScript } from '../utils/api'
import { useToastStore } from './useToast'
import { emptyChatState, normalizeChatState } from '../utils/chatPrompt'
import { migrateProfileSlots, syncActiveProfileAlias } from '../utils/imageGeneration'
import {
  emptyMotionState,
  normalizeMotionState,
  buildLocalMotionScript,
  validateAndClampMotionScript,
  MAX_SAVED_SCRIPTS,
} from '../utils/motionScript'
import { findBuiltinRigProfile, normalizeRigProfile } from '../data/rigProfiles'

function emptyGeneratedImagesState() {
  return emptyGeneratedImages()
}

/** Wipe identity-bound extras so Randomize All cannot keep the previous person's thread or art. */
function newCharacterSessionFields({ imageSeed } = {}) {
  return {
    characterId: null,
    generatedImages: emptyGeneratedImagesState(),
    generatedModels: emptyGeneratedModels(),
    backstory: '',
    chatCanon: '',
    wardrobe: [],
    chat: emptyChatState(),
    imagePrefs: emptyImagePrefs(Number.isFinite(imageSeed) ? { seed: imageSeed } : {}),
    motion: emptyMotionState(),
    ledger: emptyLedger(),
  }
}

function normalizeCharacterSeed(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? clampSeed(n) : null
}

/** Sub-stream for a given seed so sheet / ledger / image / section rolls never shift each other. */
function streamRng(seed, ...parts) {
  return createRng(hashSeed(seed, ...parts))
}

/**
 * Normalize a library record (v1 lock migrate, v3 chat, v4 front/side/back slots, v10 motion, v11 ledger + seed).
 * @param {Record<string, unknown>} saved
 */
export function migrateSavedCharacter(saved) {
  if (!saved || typeof saved !== 'object') {
    return {
      generatedImages: emptyGeneratedImagesState(),
      generatedModels: emptyGeneratedModels(),
      presentationMode: 'canonical',
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      attributes: getDefaultCharacter(),
      chatCanon: '',
      chat: emptyChatState(),
      imagePrefs: emptyImagePrefs({ randomizeSeed: false }),
      motion: emptyMotionState(),
      ledger: emptyLedger(),
      characterSeed: null,
      rollCount: 0,
      seedLocked: false,
    }
  }

  const version = Number(saved.schemaVersion) || 1
  const presentationMode = saved.presentationMode === 'thirst' ? 'thirst' : 'canonical'
  const images = migrateProfileSlots(
    { ...emptyGeneratedImagesState(), ...(saved.generatedImages || {}) },
    presentationMode,
  )

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

  const wardrobe = Array.isArray(saved.wardrobe)
    ? saved.wardrobe.map((row) => migrateOutfit(row))
    : []

  const outfitIds = new Set(wardrobe.map((row) => row.id).filter(Boolean))
  const generatedModels = normalizeGeneratedModels(saved.generatedModels)
  generatedModels.outfits = Object.fromEntries(
    Object.entries(generatedModels.outfits).filter(([id]) => outfitIds.has(id)),
  )

  return {
    ...saved,
    generatedImages: images,
    generatedModels,
    presentationMode,
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    attributes,
    wardrobe,
    chatCanon: typeof saved.chatCanon === 'string' ? saved.chatCanon : '',
    chat: normalizeChatState(saved.chat),
    imagePrefs: normalizeImagePrefs(saved.imagePrefs),
    motion: normalizeMotionState(saved.motion),
    ledger: normalizeLedger(saved.ledger),
    characterSeed: normalizeCharacterSeed(saved.characterSeed),
    rollCount: Math.max(0, Math.round(Number(saved.rollCount)) || 0),
    seedLocked: !!saved.seedLocked,
  }
}

export const useCharacterStore = create((set, get) => ({
  // Character data
  character: getDefaultCharacter(),
  characterId: null,

  // Generated content
  generatedImages: emptyGeneratedImagesState(),
  generatedModels: emptyGeneratedModels(),
  backstory: '',
  chatCanon: '',
  wardrobe: [],
  presentationMode: 'canonical',
  imagePrefs: emptyImagePrefs(),
  chat: emptyChatState(),
  motion: emptyMotionState(),
  /** Resolved rig profile object for motion.rigProfileId (null = reference rig). */
  rigProfile: null,
  isGeneratingMotion: false,

  /** Life ledger + the recipe that produced this sheet (seed null = unknown / imported). */
  ledger: emptyLedger(),
  characterSeed: null,
  rollCount: 0,
  seedLocked: false,

  // API Key
  apiKey: '',
  tripoApiKey: '',
  tripoBalance: null,
  tripoBusy: false,
  tripoBusyLabel: null,
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
      const [key, tripoKey, textModel, imageModel] = await Promise.all([
        getSetting('apiKey'),
        getSetting('tripoApiKey'),
        getSetting('selectedTextModel'),
        getSetting('selectedImageModel'),
      ])
      const updates = { settingsReady: true }
      if (key) updates.apiKey = key
      if (tripoKey) updates.tripoApiKey = tripoKey
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

  setTripoApiKey: async (key) => {
    const next = String(key || '').trim()
    set({ tripoApiKey: next, tripoBalance: next ? get().tripoBalance : null })
    try {
      await saveSetting('tripoApiKey', next)
    } catch (e) {
      console.error('Failed to save Tripo API key:', e)
    }
  },

  setTripoBalance: (balance) => set({ tripoBalance: balance }),

  setTripoBusy: (busy, label = null) => set({
    tripoBusy: !!busy,
    tripoBusyLabel: busy ? label : null,
  }),

  setGeneratedModels: (models) => set({ generatedModels: normalizeGeneratedModels(models) }),

  ensureCharacterId: () => {
    const existing = get().characterId
    if (existing) return existing
    const id = generateId()
    set({ characterId: id })
    return id
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
    set((state) => {
      const generatedImages = { ...state.generatedImages, [type]: base64 }
      if (type === 'profile') {
        const slot = state.presentationMode === 'thirst' ? 'profileThirst' : 'profileCanonical'
        generatedImages[slot] = base64
        const other = slot === 'profileThirst' ? 'profileCanonical' : 'profileThirst'
        if (!generatedImages[other]) generatedImages[other] = base64
      }
      return {
        generatedImages: syncActiveProfileAlias(generatedImages, state.presentationMode),
      }
    })
  },

  setPresentationMode: (mode) => {
    set((state) => {
      const presentationMode = mode === 'thirst' ? 'thirst' : 'canonical'
      return {
        presentationMode,
        generatedImages: syncActiveProfileAlias(state.generatedImages, presentationMode),
      }
    })
  },

  setImagePrefs: (prefs) => {
    set({ imagePrefs: normalizeImagePrefs(prefs) })
  },

  patchImagePrefs: (patch) => {
    set((state) => ({
      imagePrefs: normalizeImagePrefs({ ...state.imagePrefs, ...(patch || {}) }),
    }))
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

  replaceChatApiAndUi: ({ ui, api, photos }) => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      return {
        chat: {
          ...current,
          ui: ui ?? current.ui,
          api: api ?? current.api,
          photos: photos ?? current.photos,
        },
      }
    })
  },

  clearChat: () => {
    set((state) => {
      const current = normalizeChatState(state.chat)
      return { chat: { ...emptyChatState(), settings: current.settings, photos: current.photos } }
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
    const { characterId } = get()
    set((state) => {
      const outfits = { ...(state.generatedModels?.outfits || {}) }
      delete outfits[outfitId]
      return {
        wardrobe: state.wardrobe.filter((o) => o.id !== outfitId),
        generatedModels: { ...normalizeGeneratedModels(state.generatedModels), outfits },
      }
    })
    if (characterId) void deleteSlotModels(characterId, 'outfit', outfitId)
  },

  /**
   * Randomize one section locally with a seeded sub-stream. Never calls an LLM.
   * @returns {{ source: 'local' }}
   */
  randomizeSection: (sectionKey) => {
    const section = CHARACTER_SECTIONS[sectionKey]
    if (!section) return { source: 'local' }
    const { lockedFields, character, characterSeed, rollCount } = get()
    const seed = characterSeed == null ? randomSeed() : characterSeed
    const nextCount = (rollCount || 0) + 1
    const locked = effectiveLockedFields(lockedFields, character)
    const rng = streamRng(seed, 'section', sectionKey, nextCount)
    const { updates } = rollSection(sectionKey, character, locked, rng)
    const merged = mergeCharacterWithSelectCleanup(character, updates, locked)
    set({ character: merged, characterSeed: seed, rollCount: nextCount })
    return { source: 'local' }
  },

  /**
   * Randomize the whole sheet + life ledger from one seed. Same (seed, locks, locked values)
   * reproduces the same character. Never calls an LLM.
   * @returns {{ source: 'local', seed: number }}
   */
  randomizeAll: () => {
    const { lockedFields, character, characterSeed, seedLocked } = get()
    const seed = seedLocked && characterSeed != null ? characterSeed : randomSeed()
    const locked = effectiveLockedFields(lockedFields, character)
    const lockedSlice = pickLockedFromCharacter(character, locked)

    let next = buildLocalRandomizedCharacter(locked, character, streamRng(seed, 'sheet'))
    next = { ...clearStaleCustomTexts(next, locked), ...lockedSlice }
    const ledger = buildLedger(next, streamRng(seed, 'ledger'), { lockedFields: locked })
    next = applyLedgerEffects(next, ledger.events, locked, { mode: 'overwrite' })

    set({
      character: next,
      ...newCharacterSessionFields({ imageSeed: hashSeed(seed, 'image') % (SEED_MAX + 1) }),
      ledger,
      characterSeed: seed,
      rollCount: 0,
    })
    return { source: 'local', seed }
  },

  /**
   * Fill blank visible text fields (name, *_custom) with Gemini on demand.
   * @param {{ scope?: 'all' | string }} [opts] — a section key limits the pass to that section
   * @returns {Promise<{ source: 'llm' | 'local', reason?: string, filled: number }>}
   */
  enrichWithAi: async ({ scope = 'all' } = {}) => {
    const { apiKey, selectedTextModel, character, lockedFields } = get()
    const toast = useToastStore.getState().addToast
    if (!apiKey?.trim()) {
      toast('Add a Google AI key in Settings to enrich with AI.', 'info')
      return { source: 'local', reason: 'no_api_key', filled: 0 }
    }
    const locked = effectiveLockedFields(lockedFields, character)
    const targets = scope === 'all'
      ? collectLlmTextFieldIds(character, locked, { mode: 'all', onlyBlank: true })
      : collectLlmTextFieldIds(character, locked, { mode: 'section', sectionKey: scope, onlyBlank: true })
    if (!targets.length) {
      toast('Nothing to enrich — visible text fields are already filled.', 'info')
      return { source: 'local', reason: 'nothing_to_fill', filled: 0 }
    }

    set({ isGenerating: true })
    try {
      const patch = await generateCustomFields(CHARACTER_SECTIONS, selectedTextModel, apiKey.trim(), character, targets)
      const current = get().character
      const stillBlank = targets.filter((id) => !String(current[id] ?? '').trim())
      set({ character: mergeLlmTextPatch(current, patch, stillBlank) })
      toast(`Filled ${stillBlank.length} field${stillBlank.length === 1 ? '' : 's'} with AI.`, 'success')
      return { source: 'llm', filled: stillBlank.length }
    } catch (e) {
      console.error('enrichWithAi failed:', e)
      toast(`AI enrichment failed (${e instanceof Error ? e.message : 'unknown error'}). Fields left blank.`, 'error')
      return { source: 'local', reason: 'api_error', filled: 0 }
    } finally {
      set({ isGenerating: false })
    }
  },

  setCharacterSeed: (seed) => set({ characterSeed: normalizeCharacterSeed(seed) }),
  toggleSeedLock: () => set((state) => ({ seedLocked: !state.seedLocked })),

  /** Recompute MBTI / Enneagram / alignment from the current OCEAN sliders (unlocked fields only). */
  rederiveFromOcean: () => {
    const { character, lockedFields, characterSeed, rollCount } = get()
    const seed = characterSeed == null ? randomSeed() : characterSeed
    const nextCount = (rollCount || 0) + 1
    const locked = effectiveLockedFields(lockedFields, character)
    const patch = deriveFromOcean(character, streamRng(seed, 'derive', nextCount), { locked: (id) => !!locked[id] })
    set({ character: { ...character, ...patch }, characterSeed: seed, rollCount: nextCount })
    return patch
  },

  // --- Life ledger ---

  /**
   * Rebuild unlocked events; locked events are kept. Effects of NEW events are applied to the sheet.
   * @param {{ mode?: 'overwrite' | 'fill' }} [opts] — 'fill' never clobbers a filled field (old saves)
   */
  regenerateLedger: ({ mode = 'overwrite' } = {}) => {
    const { character, lockedFields, ledger, characterSeed, rollCount } = get()
    const seed = characterSeed == null ? randomSeed() : characterSeed
    const nextCount = (rollCount || 0) + 1
    const locked = effectiveLockedFields(lockedFields, character)
    const keep = normalizeLedger(ledger).events.filter((e) => e.locked)
    const next = buildLedger(character, streamRng(seed, 'ledger', 'regen', nextCount), { keep, lockedFields: locked })
    const keptIds = new Set(keep.map((e) => e.id))
    const fresh = next.events.filter((e) => !keptIds.has(e.id))
    set({
      ledger: next,
      character: applyLedgerEffects(character, fresh, locked, { mode }),
      characterSeed: seed,
      rollCount: nextCount,
    })
  },

  generateLedgerForCurrent: () => get().regenerateLedger({ mode: 'fill' }),

  rerollLedgerEvent: (index) => {
    const { character, lockedFields, ledger, characterSeed, rollCount } = get()
    const seed = characterSeed == null ? randomSeed() : characterSeed
    const nextCount = (rollCount || 0) + 1
    const locked = effectiveLockedFields(lockedFields, character)
    const res = rerollLedgerEventPure(normalizeLedger(ledger), index, character, locked, streamRng(seed, 'ledger', 'reroll', index, nextCount))
    set({ ledger: res.ledger, character: res.character, characterSeed: seed, rollCount: nextCount })
  },

  addLedgerEvent: () => {
    const { character, lockedFields, ledger, characterSeed, rollCount } = get()
    const seed = characterSeed == null ? randomSeed() : characterSeed
    const nextCount = (rollCount || 0) + 1
    const locked = effectiveLockedFields(lockedFields, character)
    const res = addLedgerEventPure(normalizeLedger(ledger), character, locked, streamRng(seed, 'ledger', 'add', nextCount))
    set({ ledger: res.ledger, character: res.character, characterSeed: seed, rollCount: nextCount })
  },

  removeLedgerEvent: (index) =>
    set((state) => {
      const current = normalizeLedger(state.ledger)
      return { ledger: { ...current, events: current.events.filter((_, i) => i !== index) } }
    }),

  toggleLedgerEventLock: (index) =>
    set((state) => {
      const current = normalizeLedger(state.ledger)
      const events = current.events.map((e, i) => (i === index ? { ...e, locked: !e.locked } : e))
      return { ledger: { ...current, events } }
    }),

  /** Manual edits (title / summary / age / tone); re-sorts when the age changes. */
  setLedgerEvent: (index, patch) =>
    set((state) => {
      const current = normalizeLedger(state.ledger)
      if (!current.events[index]) return {}
      const events = current.events.map((e, i) => (i === index ? { ...e, ...patch } : e))
      return { ledger: normalizeLedger({ ...current, events }) }
    }),

  // --- Motion Studio ---

  setRigProfile: (profile) => {
    const normalized = profile ? normalizeRigProfile(profile) : null
    set((state) => ({
      rigProfile: normalized,
      motion: { ...normalizeMotionState(state.motion), rigProfileId: normalized?.id || '' },
    }))
  },

  /** Resolve a rig id to a profile: built-in first, then the IndexedDB store. */
  resolveRigProfile: async (rigProfileId) => {
    const id = String(rigProfileId || '')
    if (!id) { set({ rigProfile: null }); return null }
    const builtin = findBuiltinRigProfile(id)
    if (builtin) { set({ rigProfile: builtin }); return builtin }
    try {
      const row = await getRigProfile(id)
      const profile = row ? normalizeRigProfile(row) : null
      set({ rigProfile: profile })
      return profile
    } catch (e) {
      console.error('resolveRigProfile failed:', e)
      set({ rigProfile: null })
      return null
    }
  },

  /**
   * Generate a motion script: Gemini when a key is present, local dice otherwise or on error.
   * @param {{ scene?: string, sceneDirection?: string, sourceLine?: string, durationMs?: number, forceLocal?: boolean }} [opts]
   */
  generateMotion: async (opts = {}) => {
    const { apiKey, selectedTextModel, character, characterId, rigProfile } = get()
    const toast = useToastStore.getState().addToast
    const hasKey = !!apiKey?.trim() && !opts.forceLocal
    const base = { ...opts, characterId: characterId || '' }

    const push = (script, warnings, source) => {
      set((state) => {
        const current = normalizeMotionState(state.motion)
        return { motion: { ...current, scripts: [script, ...current.scripts].slice(0, MAX_SAVED_SCRIPTS) } }
      })
      return { script, warnings, source }
    }

    if (!hasKey) {
      const script = buildLocalMotionScript(character, rigProfile, base)
      return push(script, [], 'local')
    }

    set({ isGeneratingMotion: true })
    try {
      const { script, warnings } = await generateMotionScript(apiKey.trim(), character, rigProfile, {
        ...base,
        modelId: selectedTextModel,
      })
      return push(script, warnings, 'llm')
    } catch (e) {
      console.error('generateMotionScript failed:', e)
      toast(`AI motion failed (${e instanceof Error ? e.message : 'unknown error'}). Used local generator.`, 'error')
      const script = buildLocalMotionScript(character, rigProfile, base)
      return push(script, [], 'local')
    } finally {
      set({ isGeneratingMotion: false })
    }
  },

  setMotionScript: (index, script) =>
    set((state) => {
      const current = normalizeMotionState(state.motion)
      const { script: clean } = validateAndClampMotionScript(script, state.rigProfile, { characterId: state.characterId || '' })
      const scripts = [...current.scripts]
      if (index >= 0 && index < scripts.length) scripts[index] = clean
      else scripts.unshift(clean)
      return { motion: { ...current, scripts: scripts.slice(0, MAX_SAVED_SCRIPTS) } }
    }),

  deleteMotionScript: (index) =>
    set((state) => {
      const current = normalizeMotionState(state.motion)
      return { motion: { ...current, scripts: current.scripts.filter((_, i) => i !== index) } }
    }),

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
      generatedModels: normalizeGeneratedModels(migrated.generatedModels),
      backstory: migrated.backstory || '',
      chatCanon: migrated.chatCanon || '',
      wardrobe: migrated.wardrobe || [],
      presentationMode: migrated.presentationMode,
      imagePrefs: migrated.imagePrefs || emptyImagePrefs({ randomizeSeed: false }),
      chat: migrated.chat,
      motion: migrated.motion,
      ledger: migrated.ledger,
      characterSeed: migrated.characterSeed,
      rollCount: migrated.rollCount,
      seedLocked: migrated.seedLocked,
      lockedFields,
    })
    void get().resolveRigProfile(migrated.motion?.rigProfileId)
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
      generatedModels: normalizeGeneratedModels(state.generatedModels),
      backstory: state.backstory,
      chatCanon: state.chatCanon || '',
      wardrobe: [...state.wardrobe],
      presentationMode: state.presentationMode === 'thirst' ? 'thirst' : 'canonical',
      imagePrefs: normalizeImagePrefs(state.imagePrefs),
      chat: normalizeChatState(state.chat),
      motion: normalizeMotionState(state.motion),
      ledger: normalizeLedger(state.ledger),
      characterSeed: normalizeCharacterSeed(state.characterSeed),
      rollCount: Math.max(0, Math.round(Number(state.rollCount)) || 0),
      seedLocked: !!state.seedLocked,
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
      generatedModels: emptyGeneratedModels(),
      backstory: '',
      chatCanon: '',
      wardrobe: [],
      presentationMode: 'canonical',
      imagePrefs: emptyImagePrefs(),
      chat: emptyChatState(),
      motion: emptyMotionState(),
      rigProfile: null,
      ledger: emptyLedger(),
      characterSeed: null,
      rollCount: 0,
      seedLocked: false,
      lockedFields: {},
    })
  },
}))

// Initialize on import
useCharacterStore.getState().initialize()
