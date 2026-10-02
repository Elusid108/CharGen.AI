import React, { useState, useEffect } from 'react'
import {
  User, RotateCcw, Shirt, Camera, Download, Maximize2,
  PenLine, BookOpen, X, Layers, ArrowLeftRight, Redo,
} from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { generateImage as callGenerateImage, buildImagePrompt, generateBackstory as callGenerateBackstory, generateNarrativeHooks } from '../../utils/api'
import { getImageEndpointForModel } from '../../utils/models'
import { DEFAULT_IMAGE_MODEL } from '../../utils/modelConstants'
import {
  resolveViewReference,
  characterHasDorsalExtras,
  modelSupportsReferenceImages,
  mergeNegativePrompt,
} from '../../utils/imageGeneration'
import {
  ART_STYLES,
  LIGHTING_OPTIONS,
  MOOD_OPTIONS,
} from '../../data/schemas'
import { NARRATIVE_LENSES, guessGenreFromCharacter, pickNarrativeLens } from '../../utils/storyBible'
import { downloadImage, base64ToDataUrl, compressImageBase64, inferImageMime, extensionForImageMime, aspectClassForRatio } from '../../utils/imageUtils'
import SeedControl from '../shared/SeedControl'
import Model3DPanel from './Model3DPanel'

const IMAGE_TYPES = [
  { id: 'tpose', label: 'T-Pose Lock', icon: RotateCcw, ratio: '3:4', description: 'Front identity lock', lockBadge: true },
  { id: 'side', label: 'Side View', icon: ArrowLeftRight, ratio: '3:4', description: 'T-pose from the left' },
  { id: 'back', label: 'Back View', icon: Redo, ratio: '3:4', description: 'T-pose from behind' },
  { id: 'profile', label: 'Profile (1:1)', icon: User, ratio: '1:1', description: 'Head & shoulders portrait' },
  { id: 'mannequin', label: 'Mannequin Base', icon: Shirt, ratio: '3:4', description: 'Relaxed underwear pose' },
]

const GENERATE_ALL_ORDER = ['tpose', 'side', 'back', 'profile', 'mannequin']
const BODY_SHEET_ORDER = ['tpose', 'side', 'back', 'mannequin']

const STORY_LENGTHS = [
  { label: 'Short Vignette (1 paragraph)', value: 'Short Vignette' },
  { label: 'Standard Bio (3 paragraphs)', value: 'Standard Bio' },
  { label: 'Detailed Story (1 page)', value: 'Detailed Story' },
]

const STORY_TONES = [
  { label: 'Simple & Direct', value: 'Simple' },
  { label: 'Mysterious & Vague', value: 'Mysterious' },
  { label: 'Dark & Gritty', value: 'Dark' },
  { label: 'High Fantasy Flowery', value: 'High Fantasy' },
  { label: 'Romance Novel', value: 'Romance' },
  { label: 'Cyberpunk/Noir', value: 'Cyberpunk Noir' },
  { label: 'Locker Room Talk', value: 'Locker Room' },
]

export default function GenerationPanel() {
  const character = useCharacterStore(s => s.character)
  const apiKey = useCharacterStore(s => s.apiKey)
  const selectedTextModel = useCharacterStore(s => s.selectedTextModel)
  const selectedImageModel = useCharacterStore(s => s.selectedImageModel)
  const availableImageModels = useCharacterStore(s => s.availableImageModels)
  const generatedImages = useCharacterStore(s => s.generatedImages)
  const setGeneratedImage = useCharacterStore(s => s.setGeneratedImage)
  const presentationMode = useCharacterStore(s => s.presentationMode)
  const setPresentationMode = useCharacterStore(s => s.setPresentationMode)
  const imagePrefs = useCharacterStore(s => s.imagePrefs)
  const patchImagePrefs = useCharacterStore(s => s.patchImagePrefs)
  const backstory = useCharacterStore(s => s.backstory)
  const setBackstory = useCharacterStore(s => s.setBackstory)
  const chatCanon = useCharacterStore(s => s.chatCanon)
  const setChatCanon = useCharacterStore(s => s.setChatCanon)
  const ledger = useCharacterStore(s => s.ledger)
  const addToast = useToastStore(s => s.addToast)

  const artStyle = imagePrefs?.artStyle ?? ''
  const lighting = imagePrefs?.lighting ?? ''
  const mood = imagePrefs?.mood ?? ''
  const negativePrompt = imagePrefs?.exclude ?? ''
  const seed = imagePrefs?.seed ?? 0
  const [generatingTypes, setGeneratingTypes] = useState(new Set())
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  // Story generation state
  const [storyLength, setStoryLength] = useState('Standard Bio')
  const [storyTone, setStoryTone] = useState('Simple')
  const [storyGenre, setStoryGenre] = useState(() => guessGenreFromCharacter(useCharacterStore.getState().character))
  const [genreTouched, setGenreTouched] = useState(false)
  const [storyLens, setStoryLens] = useState('random')
  const [hooksFirst, setHooksFirst] = useState(false)
  const [storyHooks, setStoryHooks] = useState([])
  const [lastLensUsed, setLastLensUsed] = useState('')
  const [generatingStory, setGeneratingStory] = useState(false)
  const [generatingHooks, setGeneratingHooks] = useState(false)

  const isAnyGenerating = generatingTypes.size > 0
  const hasIdentityLock = !!generatedImages?.tpose
  const canRegenIndividual = hasIdentityLock && !isGeneratingAll

  useEffect(() => {
    if (genreTouched) return
    setStoryGenre(guessGenreFromCharacter(character))
  }, [character.species, character.origin, character.origin_custom, genreTouched])

  const imageModelOptions = (extra = {}) => ({
    modelId: selectedImageModel || DEFAULT_IMAGE_MODEL,
    imageEndpoint:
      availableImageModels.length > 0
        ? getImageEndpointForModel(availableImageModels, selectedImageModel)
        : 'generateContent',
    ...extra,
  })

  /**
   * @param {string} imageType
   * @param {{
   *   batchFrontLock?: string | null,
   *   fromBatch?: boolean,
   *   presentationMode?: 'canonical' | 'thirst',
   *   persist?: boolean,
   * }} [options]
   * @returns {Promise<string | null>}
   */
  const generateSingleShot = async (imageType, options = {}) => {
    const {
      batchFrontLock = null,
      presentationMode: modeOverride,
      persist = true,
    } = options
    const mode = modeOverride === 'thirst' ? 'thirst' : (modeOverride === 'canonical' ? 'canonical' : presentationMode)
    const prefs = useCharacterStore.getState().imagePrefs || {}
    const typeConfig = IMAGE_TYPES.find(t => t.id === imageType)
    const canRef = modelSupportsReferenceImages(availableImageModels, selectedImageModel || DEFAULT_IMAGE_MODEL)

    let referenceImageBase64 = null
    let referenceView = null
    if (imageType !== 'tpose' && canRef) {
      const latestImages = useCharacterStore.getState().generatedImages
      const resolved = resolveViewReference(latestImages, imageType, batchFrontLock)
      referenceImageBase64 = resolved.image
      referenceView = resolved.source
    }

    const extraNegative = mergeNegativePrompt(imageType, mode, prefs.exclude || '', {
      dorsalExtras: characterHasDorsalExtras(character),
    })
    const prompt = buildImagePrompt(character, imageType, {
      artStyle: prefs.artStyle,
      lighting: prefs.lighting,
      mood: prefs.mood,
      presentationMode: mode,
      hasReferenceImage: !!referenceImageBase64,
      referenceView,
      extraNegative,
    })

    const rawBase64 = await callGenerateImage(apiKey, prompt, imageModelOptions({
      aspectRatio: typeConfig.ratio,
      negativePrompt: extraNegative,
      seed: prefs.seed,
      ...(referenceImageBase64 ? { referenceImageBase64 } : {}),
    }))
    const base64 = await compressImageBase64(rawBase64)
    if (persist) setGeneratedImage(imageType, base64)
    return base64
  }

  const handleGenerateProfilePair = async (options = {}) => {
    const { fromBatch = false } = options
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return null
    }
    if (!fromBatch && !useCharacterStore.getState().generatedImages?.tpose) {
      addToast('Use Generate All first so the T-pose lock is created.', 'warning')
      return null
    }

    setGeneratingTypes((prev) => new Set([...prev, 'profile']))
    try {
      const results = await Promise.allSettled([
        generateSingleShot('profile', { ...options, presentationMode: 'canonical', persist: false }),
        generateSingleShot('profile', { ...options, presentationMode: 'thirst', persist: false }),
      ])
      const canonical = results[0].status === 'fulfilled' ? results[0].value : null
      const thirst = results[1].status === 'fulfilled' ? results[1].value : null
      if (results[0].status === 'rejected') {
        addToast(`Canonical profile: ${results[0].reason?.message || results[0].reason}`, 'error', 5000)
      }
      if (results[1].status === 'rejected') {
        addToast(`Thirst profile: ${results[1].reason?.message || results[1].reason}`, 'error', 5000)
      }
      if (canonical) setGeneratedImage('profileCanonical', canonical)
      if (thirst) setGeneratedImage('profileThirst', thirst)
      if (canonical || thirst) addToast('Profile (Canonical + Thirst) generated!', 'success')
      const mode = useCharacterStore.getState().presentationMode
      return mode === 'thirst' ? thirst : canonical
    } finally {
      setGeneratingTypes((prev) => {
        const next = new Set(prev)
        next.delete('profile')
        return next
      })
    }
  }

  /**
   * @param {string} imageType
   * @param {{ batchFrontLock?: string | null, fromBatch?: boolean }} [options]
   * @returns {Promise<string | null>}
   */
  const handleGenerateImage = async (imageType, options = {}) => {
    const { fromBatch = false } = options
    if (imageType === 'profile') return handleGenerateProfilePair(options)
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return null
    }
    if (!fromBatch && !useCharacterStore.getState().generatedImages?.tpose) {
      addToast('Use Generate All first so the T-pose lock is created.', 'warning')
      return null
    }

    setGeneratingTypes((prev) => new Set([...prev, imageType]))
    try {
      const typeConfig = IMAGE_TYPES.find((t) => t.id === imageType)
      const base64 = await generateSingleShot(imageType, options)
      addToast(`${typeConfig.label} generated successfully!`, 'success')
      if (imageType === 'tpose' && !fromBatch) {
        addToast('Identity lock updated. Regenerate other images to match.', 'info')
      }
      return base64
    } catch (e) {
      addToast(`${imageType}: ${e.message}`, 'error', 5000)
      return null
    } finally {
      setGeneratingTypes((prev) => {
        const next = new Set(prev)
        next.delete(imageType)
        return next
      })
    }
  }

  const handleGenerateAll = async () => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    setIsGeneratingAll(true)
    try {
      const lockImage = await handleGenerateImage('tpose', { fromBatch: true })
      const refOpts = { batchFrontLock: lockImage || null, fromBatch: true }
      for (const type of GENERATE_ALL_ORDER.slice(1)) {
        await handleGenerateImage(type, refOpts)
      }
    } finally {
      setIsGeneratingAll(false)
    }
  }

  const writeBackstory = async (selectedHook = '') => {
    const lensId = pickNarrativeLens(storyLens)
    setLastLensUsed(lensId)
    const result = await callGenerateBackstory(apiKey, character, {
      length: storyLength,
      tone: storyTone,
      genre: storyGenre,
      lensId,
      selectedHook,
      modelId: selectedTextModel,
      ledger,
    })
    setBackstory(result.backstory)
    if (result.chatCanon) setChatCanon(result.chatCanon)
    addToast('Backstory generated!', 'success')
  }

  const handleGenerateStory = async () => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    if (hooksFirst && storyHooks.length === 0) {
      setGeneratingHooks(true)
      try {
        const lensId = pickNarrativeLens(storyLens)
        setLastLensUsed(lensId)
        const { hooks } = await generateNarrativeHooks(apiKey, character, {
          tone: storyTone,
          genre: storyGenre,
          lensId,
          modelId: selectedTextModel,
          ledger,
        })
        setStoryHooks(hooks)
        addToast('Pick a hook, then we write from it.', 'info')
      } catch (e) {
        addToast('Hook generation failed: ' + e.message, 'error', 5000)
      } finally {
        setGeneratingHooks(false)
      }
      return
    }

    setGeneratingStory(true)
    try {
      await writeBackstory()
      setStoryHooks([])
    } catch (e) {
      addToast('Story generation failed: ' + e.message, 'error', 5000)
    } finally {
      setGeneratingStory(false)
    }
  }

  const handleWriteFromHook = async (hook) => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }
    setGeneratingStory(true)
    try {
      await writeBackstory(hook)
      setStoryHooks([])
    } catch (e) {
      addToast('Story generation failed: ' + e.message, 'error', 5000)
    } finally {
      setGeneratingStory(false)
    }
  }

  const handleDownload = (imageType) => {
    const base64 = generatedImages[imageType]
    if (!base64) return
    const name = character.name?.replace(/\s+/g, '_') || 'character'
    const ext = extensionForImageMime(inferImageMime(base64))
    downloadImage(base64ToDataUrl(base64), `${name}_${imageType}.${ext}`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Character Sheet Summary */}
      <CharacterSummary character={character} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] gap-6 items-stretch">
        <div className="glass-panel p-6 flex flex-col h-full min-h-0">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 shrink-0">
            <Camera size={18} className="text-purple-400" />
            Image Generation Controls
          </h3>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="section-heading mb-1 block">Art Style</label>
                <select
                  value={artStyle}
                  onChange={(e) => patchImagePrefs({ artStyle: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  {ART_STYLES.map((s, i) => <option key={i} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="section-heading mb-1 block">Lighting</label>
                <select
                  value={lighting}
                  onChange={(e) => patchImagePrefs({ lighting: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  {LIGHTING_OPTIONS.map((l, i) => <option key={i} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="section-heading mb-1 block">Mood</label>
                <select
                  value={mood}
                  onChange={(e) => patchImagePrefs({ mood: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  {MOOD_OPTIONS.map((m, i) => <option key={i} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="section-heading mb-1 block">Exclude</label>
                <input
                  value={negativePrompt}
                  onChange={(e) => patchImagePrefs({ exclude: e.target.value })}
                  placeholder="Blurry, low quality..."
                  className="input-field w-full text-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {presentationMode === 'thirst'
                ? 'Thirst profile uses Intimate Attire from the Mature sheet and full body detail. '
                : 'Canonical profile uses Default Outfit (Identity) and keeps garments closed. '}
              Switch Canonical / Thirst on the Profile card. Generate Profile creates both. First pass is Generate All (T-pose lock first). Wardrobe uses the mannequin pose. Style, lighting, mood, exclude, and seed save with the character.
            </p>
          </div>

          <div className="mt-auto pt-4 space-y-3 shrink-0">
            <SeedControl seed={seed} onChange={(next) => patchImagePrefs({ seed: next })} />
            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || isAnyGenerating}
              className="btn-generate w-full flex items-center justify-center gap-2"
            >
              {isGeneratingAll || isAnyGenerating ? (
                <><div className="loader" /> Generating {generatingTypes.size} image{generatingTypes.size !== 1 ? 's' : ''}...</>
              ) : (
                <><Layers size={18} /> Generate All Images</>
              )}
            </button>
          </div>
        </div>

        {IMAGE_TYPES.filter((t) => t.id === 'profile').map((type) => (
          <ImageCard
            key={type.id}
            type={type}
            image={generatedImages.profile}
            isGenerating={generatingTypes.has(type.id)}
            canGenerate={canRegenIndividual}
            onGenerate={() => handleGenerateImage(type.id)}
            onDownload={() => handleDownload('profile')}
            onFullscreen={() => setFullscreenImage(generatedImages.profile)}
            headerExtra={(
              <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setPresentationMode('canonical')}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                    presentationMode !== 'thirst'
                      ? 'bg-blue-600/30 text-blue-200'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Canonical
                </button>
                <button
                  type="button"
                  onClick={() => setPresentationMode('thirst')}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                    presentationMode === 'thirst'
                      ? 'bg-amber-600/30 text-amber-200'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Thirst
                </button>
              </div>
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {BODY_SHEET_ORDER.map((id) => {
          const type = IMAGE_TYPES.find((t) => t.id === id)
          return (
            <ImageCard
              key={type.id}
              type={type}
              image={generatedImages[type.id]}
              isGenerating={generatingTypes.has(type.id)}
              canGenerate={canRegenIndividual}
              onGenerate={() => handleGenerateImage(type.id)}
              onDownload={() => handleDownload(type.id)}
              onFullscreen={() => setFullscreenImage(generatedImages[type.id])}
              lockBadge={type.lockBadge}
            />
          )
        })}
      </div>

      <Model3DPanel />

      {/* Narrative Engine */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <PenLine size={18} className="text-purple-400" />
          Narrative Engine
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="section-heading mb-1 block">Length</label>
            <select value={storyLength} onChange={e => setStoryLength(e.target.value)} className="input-field w-full text-xs">
              {STORY_LENGTHS.map((s, i) => <option key={i} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Tone</label>
            <select value={storyTone} onChange={e => setStoryTone(e.target.value)} className="input-field w-full text-xs">
              {STORY_TONES.map((s, i) => <option key={i} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Genre</label>
            <select
              value={storyGenre}
              onChange={e => {
                setGenreTouched(true)
                setStoryGenre(e.target.value)
              }}
              className="input-field w-full text-xs"
            >
              <option value="High Fantasy">High Fantasy</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Cyberpunk">Cyberpunk</option>
              <option value="Modern">Modern/Contemporary</option>
              <option value="Horror">Horror</option>
              <option value="Post-Apocalyptic">Post-Apocalyptic</option>
              <option value="Romance">Romance</option>
              <option value="Noir">Noir/Crime</option>
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Lens</label>
            <select value={storyLens} onChange={e => setStoryLens(e.target.value)} className="input-field w-full text-xs">
              {NARRATIVE_LENSES.map((lens) => (
                <option key={lens.id} value={lens.id}>{lens.label}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={hooksFirst}
            onChange={(e) => {
              setHooksFirst(e.target.checked)
              if (!e.target.checked) setStoryHooks([])
            }}
          />
          Generate hooks first (pick one, then write)
        </label>

        {lastLensUsed && (
          <p className="text-[11px] text-slate-500 mb-3">
            Last lens: {NARRATIVE_LENSES.find((l) => l.id === lastLensUsed)?.label || lastLensUsed}
          </p>
        )}

        {storyHooks.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-slate-400">Pick a hook to write from:</p>
            {storyHooks.map((hook, i) => (
              <button
                key={i}
                type="button"
                disabled={generatingStory}
                onClick={() => void handleWriteFromHook(hook)}
                className="w-full text-left text-sm p-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:border-purple-500/50 hover:bg-slate-900 disabled:opacity-50"
              >
                {hook}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerateStory}
          disabled={generatingStory || generatingHooks}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generatingStory || generatingHooks ? (
            <><div className="loader" /> {generatingHooks ? 'Inventing hooks...' : 'Writing...'}</>
          ) : hooksFirst && storyHooks.length === 0 ? (
            <><BookOpen size={16} /> Generate Hooks</>
          ) : (
            <><BookOpen size={16} /> Generate Backstory</>
          )}
        </button>

        <label className="section-heading mb-1 block">Backstory</label>
        <textarea
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="Backstory will appear here. You can also type directly..."
          className="input-field w-full min-h-[200px] text-sm text-slate-300 leading-relaxed mb-4 resize-y"
        />

        <label className="section-heading mb-1 block">Chat canon</label>
        <p className="text-[11px] text-slate-500 mb-1">Three sentences in their voice. Used by the Chat tab.</p>
        <textarea
          value={chatCanon}
          onChange={(e) => setChatCanon(e.target.value)}
          placeholder="Short first-person canon for chat..."
          className="input-field w-full min-h-[88px] text-sm text-slate-300 leading-relaxed resize-y"
        />
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={base64ToDataUrl(fullscreenImage)}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
          />
          <button className="absolute top-6 right-6 text-white/50 hover:text-white">
            <X size={24} />
          </button>
          <p className="absolute bottom-8 text-slate-500 text-sm">Click anywhere to close</p>
        </div>
      )}
    </div>
  )
}

function CharacterSummary({ character }) {
  const filledFields = Object.entries(character).filter(([_, v]) => v !== '' && v !== null && v !== undefined)

  if (filledFields.length === 0) {
    return (
      <div className="glass-panel p-6 border-l-4 border-blue-500">
        <p className="text-slate-400 italic text-center py-4">
          No traits configured yet. Fill out the character sheets or use Randomize All to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6 border-l-4 border-blue-500">
      <h3 className="text-lg font-bold text-white mb-4">Character Sheet Summary</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
        {filledFields.map(([key, value]) => (
          <div key={key} className="flex justify-between border-b border-slate-700/50 pb-1 hover:bg-slate-800/30 px-2 rounded">
            <span className="text-slate-500 capitalize text-xs pt-0.5">
              {key.replace(/_/g, ' ').replace('ocean ', 'OCEAN: ')}
            </span>
            <span className="text-white font-medium text-right text-xs">
              {typeof value === 'number' && key.includes('ocean') ? `${value}%` : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ImageCard({ type, image, isGenerating, onGenerate, onDownload, onFullscreen, lockBadge, canGenerate = true, headerExtra = null }) {
  const aspectClass = aspectClassForRatio(type.ratio)
  const generateBlocked = !canGenerate && !isGenerating
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden h-full flex flex-col">
      <div className="p-3 flex flex-col gap-1.5 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <type.icon size={16} className="text-purple-400 shrink-0" />
            <span className="text-sm font-bold text-white truncate">{type.label}</span>
            {lockBadge && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/60 shrink-0">
                Identity lock
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 uppercase shrink-0 ml-auto text-right">{type.description}</span>
        </div>
        {headerExtra}
      </div>

      <div
        className={`relative w-full bg-slate-950 overflow-hidden ${aspectClass} ${image ? 'cursor-pointer group' : ''}`}
        onClick={image ? onFullscreen : undefined}
      >
        {image ? (
          <>
            <img
              src={base64ToDataUrl(image)}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); onFullscreen() }}
                className="p-2 bg-black/60 rounded-lg text-white hover:bg-black/80"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload() }}
                className="p-2 bg-black/60 rounded-lg text-white hover:bg-black/80"
              >
                <Download size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
            <type.icon size={40} className="mb-2" />
            <p className="text-xs">Not generated yet</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="text-center">
              <div className="loader mx-auto mb-2" />
              <p className="text-xs text-purple-400">Generating...</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 mt-auto">
        <button
          onClick={onGenerate}
          disabled={isGenerating || generateBlocked}
          title={generateBlocked ? 'Use Generate All first so the T-pose lock is created.' : undefined}
          className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:hover:bg-purple-600/20 border border-purple-900/30"
        >
          {isGenerating ? 'Generating...' : generateBlocked ? 'Generate All first' : image ? 'Regenerate' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
