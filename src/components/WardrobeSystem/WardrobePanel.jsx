import React, { useState } from 'react'
import {
  Shirt, Plus, Trash2, Wand2, Download, Shuffle, X, Maximize2,
} from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { generateImage as callGenerateImage, buildImagePrompt } from '../../utils/api'
import { getImageEndpointForModel } from '../../utils/models'
import { DEFAULT_IMAGE_MODEL } from '../../utils/modelConstants'
import {
  resolveWardrobeReference,
  modelSupportsReferenceImages,
  mergeNegativePrompt,
} from '../../utils/imageGeneration'
import {
  downloadImage,
  base64ToDataUrl,
  generateId,
  compressImageBase64,
  inferImageMime,
  extensionForImageMime,
  aspectClassForRatio,
} from '../../utils/imageUtils'
import {
  CUSTOM_ID,
  STYLE_TAG_IDS,
  WARDROBE_SLOT_CATALOGS,
  WARDROBE_ITEM_TYPES,
  WARDROBE_LOCATIONS,
  defaultLocationForType,
} from '../../data/options/wardrobe'
import {
  emptyOutfitDraft,
  emptyOutfitItem,
  migrateOutfit,
  compileOutfitPrompt,
  outfitItemLabel,
  randomizeOutfitDraft,
  randomizeOutfitItem,
  garmentOptionsForType,
} from '../../utils/wardrobe'
import SeedControl from '../shared/SeedControl'
import Model3DSlot from '../ImageGeneration/Model3DSlot'
import { useTripoConfirm } from '../../hooks/useTripoConfirm'

function SlotSelect({ value, options, onChange, placeholder = 'Select...' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input-field w-full text-xs">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label || o.id}
        </option>
      ))}
    </select>
  )
}

export default function WardrobePanel() {
  const character = useCharacterStore((s) => s.character)
  const apiKey = useCharacterStore((s) => s.apiKey)
  const availableImageModels = useCharacterStore((s) => s.availableImageModels)
  const presentationMode = useCharacterStore((s) => s.presentationMode)
  const imagePrefs = useCharacterStore((s) => s.imagePrefs)
  const patchImagePrefs = useCharacterStore((s) => s.patchImagePrefs)
  const wardrobe = useCharacterStore((s) => s.wardrobe)
  const addOutfit = useCharacterStore((s) => s.addOutfit)
  const updateOutfit = useCharacterStore((s) => s.updateOutfit)
  const removeOutfit = useCharacterStore((s) => s.removeOutfit)
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const addToast = useToastStore((s) => s.addToast)
  const {
    tripoBusy,
    openMeshConfirm,
    openPaidConfirm,
    openViewer,
    overlays,
  } = useTripoConfirm()

  const [showForm, setShowForm] = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const [draft, setDraft] = useState(emptyOutfitDraft)

  const diceCtx = () => ({
    presentationMode,
    genre: character.genre || 'Mixed',
    wardrobe,
  })

  const patchDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const closeForm = () => {
    setShowForm(false)
    setDraft(emptyOutfitDraft())
  }

  const handleHeaderRandomize = () => {
    setDraft((prev) =>
      randomizeOutfitDraft(showForm ? prev : emptyOutfitDraft(), {}, {
        ...diceCtx(),
        assignName: true,
      }),
    )
    setShowForm(true)
  }

  const handleNewOutfit = () => {
    setDraft(emptyOutfitDraft())
    setShowForm(true)
  }

  const addItem = () => {
    setDraft((prev) => ({
      ...migrateOutfit(prev),
      items: [...(migrateOutfit(prev).items || []), emptyOutfitItem({ style: prev.styleTag || 'Casual' })],
    }))
  }

  const patchItem = (itemId, patch) => {
    setDraft((prev) => {
      const next = migrateOutfit(prev)
      return {
        ...next,
        items: (next.items || []).map((item) => {
          if (item.id !== itemId) return item
          const merged = { ...item, ...patch }
          if (patch.type && patch.type !== item.type) {
            merged.garment = ''
            merged.customGarment = ''
            merged.location = defaultLocationForType(patch.type, '')
          }
          if (patch.garment && patch.garment !== item.garment) {
            merged.location = defaultLocationForType(merged.type, patch.garment)
            if (patch.garment !== CUSTOM_ID) merged.customGarment = ''
          }
          return merged
        }),
      }
    })
  }

  const removeItem = (itemId) => {
    setDraft((prev) => {
      const next = migrateOutfit(prev)
      return { ...next, items: (next.items || []).filter((item) => item.id !== itemId) }
    })
  }

  const diceItem = (itemId, field) => {
    setDraft((prev) => {
      const next = migrateOutfit(prev)
      return {
        ...next,
        items: (next.items || []).map((item) => (
          item.id === itemId
            ? randomizeOutfitItem(item, field, { ...diceCtx(), styleTag: next.styleTag })
            : item
        )),
      }
    })
  }

  const handleAddOutfit = () => {
    if (!draft.name?.trim()) {
      addToast('Please name the outfit', 'warning')
      return
    }
    const migrated = migrateOutfit(draft)
    if (!(migrated.items || []).length) {
      addToast('Add at least one item to the outfit', 'warning')
      return
    }

    const outfitToAdd = {
      ...migrated,
      name: draft.name.trim(),
      image: null,
      id: generateId(),
    }

    addOutfit(outfitToAdd)
    closeForm()
    addToast('Outfit added to wardrobe!', 'success')
    void handleGenerateOutfit(outfitToAdd)
  }

  const handleGenerateOutfit = async (outfit) => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    setGeneratingId(outfit.id)

    try {
      const fullAttire = compileOutfitPrompt(outfit)
      const prefs = useCharacterStore.getState().imagePrefs || {}
      const { selectedImageModel: storeImageModel, generatedImages } = useCharacterStore.getState()
      const modelId = storeImageModel || DEFAULT_IMAGE_MODEL
      const canRef = modelSupportsReferenceImages(availableImageModels, modelId)
      const { image: lockImage, source: poseSource } = resolveWardrobeReference(generatedImages)
      const referenceImageBase64 = canRef && lockImage ? lockImage : null
      if (canRef && poseSource === 'lock') {
        addToast(
          'No mannequin yet — using the identity lock. Pose may stay T-pose-like. Generate a mannequin in Studio for a natural stance.',
          'info',
          5000,
        )
      }
      const extraNegative = mergeNegativePrompt('outfit', presentationMode, prefs.exclude || '')

      const prompt = buildImagePrompt(character, 'outfit', {
        artStyle: prefs.artStyle,
        lighting: prefs.lighting,
        mood: prefs.mood,
        presentationMode,
        hasReferenceImage: !!referenceImageBase64,
        poseReference: poseSource,
        outfitOverride: fullAttire,
        extraNegative,
      })

      const rawBase64 = await callGenerateImage(apiKey, prompt, {
        aspectRatio: '3:4',
        modelId,
        seed: prefs.seed,
        negativePrompt: extraNegative,
        imageEndpoint:
          availableImageModels.length > 0
            ? getImageEndpointForModel(availableImageModels, storeImageModel)
            : 'generateContent',
        ...(referenceImageBase64 ? { referenceImageBase64 } : {}),
      })

      const base64 = await compressImageBase64(rawBase64)
      updateOutfit(outfit.id, { image: base64 })
      addToast(`"${outfit.name}" outfit generated!`, 'success')
    } catch (e) {
      addToast('Outfit generation failed: ' + e.message, 'error', 5000)
    } finally {
      setGeneratingId(null)
    }
  }

  const formDraft = migrateOutfit(draft)

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Wardrobe</h2>
          <p className="text-slate-400 text-sm">
            Stack named looks from individual items — type, material, color, and where it sits.
            {' '}
            <span className="text-slate-500">
              Uses the mannequin pose when one exists. Presentation is {presentationMode === 'thirst' ? 'Thirst' : 'Canonical'} (set on the Profile card).
              3D models are a separate button on each look — adding or generating a 2D outfit never spends Tripo credits.
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={handleHeaderRandomize} className="btn-secondary text-sm flex items-center gap-2">
            <Shuffle size={14} /> Random Outfit
          </button>
          <button type="button" onClick={handleNewOutfit} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> New Outfit
          </button>
        </div>
      </div>

      <div className="glass-panel p-4">
        <SeedControl
          seed={imagePrefs?.seed ?? 0}
          onChange={(next) => patchImagePrefs({ seed: next })}
        />
        <p className="text-[11px] text-slate-500 mt-2">
          Same seed as Generation Studio. Saved with the character.
        </p>
      </div>

      {showForm && (
        <div className="glass-panel p-6 border-l-4 border-amber-500 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">New Outfit</h3>
            <button type="button" onClick={closeForm} className="text-slate-400 hover:text-white" aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="section-heading mb-1 block">Outfit Name</label>
              <input
                value={formDraft.name}
                onChange={(e) => patchDraft('name', e.target.value)}
                placeholder="E.g., Battle Armor, Shop clothes..."
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="section-heading mb-1 block">Look style</label>
              <select
                value={formDraft.styleTag}
                onChange={(e) => patchDraft('styleTag', e.target.value)}
                className="input-field w-full"
              >
                {STYLE_TAG_IDS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <label className="section-heading">Items</label>
            <button type="button" onClick={addItem} className="btn-secondary text-xs flex items-center gap-1">
              <Plus size={12} /> Add item
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {(formDraft.items || []).length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-700 rounded-lg">
                Click + to stack garments, accessories, and where they sit.
              </p>
            )}
            {(formDraft.items || []).map((item, index) => (
              <OutfitItemRow
                key={item.id}
                index={index}
                item={item}
                onChange={(patch) => patchItem(item.id, patch)}
                onDice={(field) => diceItem(item.id, field)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>

          <button type="button" onClick={handleAddOutfit} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={14} /> Add Outfit
          </button>
        </div>
      )}

      {wardrobe.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Shirt size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg">No outfits yet</p>
          <p className="text-slate-600 text-sm mt-1">
            Hit Random Outfit, or build a look from stacked items
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wardrobe.map((outfit) => {
            const migrated = migrateOutfit(outfit)
            return (
              <OutfitCard
                key={outfit.id}
                outfit={{ ...migrated, id: outfit.id, image: outfit.image, name: outfit.name }}
                isGenerating={generatingId === outfit.id}
                onGenerate={() => handleGenerateOutfit({ ...migrated, id: outfit.id, image: outfit.image, name: outfit.name })}
                onDelete={() => {
                  removeOutfit(outfit.id)
                  addToast('Outfit removed', 'info')
                }}
                onDownload={() => {
                  if (outfit.image) {
                    const name = character.name?.replace(/\s+/g, '_') || 'character'
                    const ext = extensionForImageMime(inferImageMime(outfit.image))
                    downloadImage(
                      base64ToDataUrl(outfit.image),
                      `${name}_${String(outfit.name || 'outfit').replace(/\s+/g, '_')}.${ext}`,
                    )
                  }
                }}
                onFullscreen={() => outfit.image && setFullscreenImage(outfit.image)}
                threeD={(
                  <Model3DSlot
                    compact
                    title={outfit.name}
                    description="3D from this look's 2D image. Never auto-runs when you add a look."
                    slot="outfit"
                    outfitId={outfit.id}
                    generatedModels={generatedModels}
                    canGenerate={!!outfit.image && !tripoBusy}
                    generateHint={outfit.image ? '' : 'Generate the 2D look first.'}
                    tripoBusy={tripoBusy}
                    onGenerate={() => openMeshConfirm('outfit', outfit.id, false)}
                    onRetry={() => openMeshConfirm('outfit', outfit.id, true)}
                    onView={() => openViewer('outfit', outfit.id, 'mesh')}
                    onRig={() => openPaidConfirm('rig', 'outfit', outfit.id)}
                    onStl={() => openPaidConfirm('stl', 'outfit', outfit.id)}
                    onFbx={() => openPaidConfirm('fbx', 'outfit', outfit.id)}
                  />
                )}
              />
            )
          })}
        </div>
      )}

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={base64ToDataUrl(fullscreenImage)}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
            alt=""
          />
          <p className="absolute bottom-8 text-slate-500 text-sm">Click anywhere to close</p>
        </div>
      )}

      {overlays}
    </div>
  )
}

function DiceButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Randomize ${label}`}
      className="shrink-0 p-1 rounded-md text-slate-500 hover:text-indigo-300 hover:bg-slate-800/80"
    >
      <Shuffle size={12} />
    </button>
  )
}

function OutfitItemRow({ index, item, onChange, onDice, onRemove }) {
  const garments = garmentOptionsForType(item.type)
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase">Item {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-slate-500 hover:text-red-400" aria-label="Remove item">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Style</span>
            <DiceButton label="style" onClick={() => onDice('style')} />
          </div>
          <select value={item.style || 'Casual'} onChange={(e) => onChange({ style: e.target.value })} className="input-field w-full text-xs">
            {STYLE_TAG_IDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Type</span>
            <DiceButton label="type" onClick={() => onDice('type')} />
          </div>
          <select value={item.type} onChange={(e) => onChange({ type: e.target.value })} className="input-field w-full text-xs">
            {WARDROBE_ITEM_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Garment</span>
            <DiceButton label="garment" onClick={() => onDice('garment')} />
          </div>
          <SlotSelect
            value={item.garment}
            options={garments}
            onChange={(v) => onChange({ garment: v })}
            placeholder="Pick garment..."
          />
          {item.garment === CUSTOM_ID && (
            <input
              value={item.customGarment || ''}
              onChange={(e) => onChange({ customGarment: e.target.value })}
              placeholder="Describe the garment..."
              className="input-field w-full text-xs mt-1"
            />
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Material</span>
            <DiceButton label="material" onClick={() => onDice('material')} />
          </div>
          <SlotSelect
            value={item.material}
            options={WARDROBE_SLOT_CATALOGS.fabric}
            onChange={(v) => onChange({ material: v })}
          />
          {item.material === CUSTOM_ID && (
            <input
              value={item.customMaterial || ''}
              onChange={(e) => onChange({ customMaterial: e.target.value })}
              placeholder="Describe the material..."
              className="input-field w-full text-xs mt-1"
            />
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Condition</span>
            <DiceButton label="condition" onClick={() => onDice('condition')} />
          </div>
          <SlotSelect
            value={item.condition}
            options={WARDROBE_SLOT_CATALOGS.condition}
            onChange={(v) => onChange({ condition: v })}
          />
          {item.condition === CUSTOM_ID && (
            <input
              value={item.customCondition || ''}
              onChange={(e) => onChange({ customCondition: e.target.value })}
              placeholder="Describe the condition..."
              className="input-field w-full text-xs mt-1"
            />
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Color</span>
            <DiceButton label="color" onClick={() => onDice('color')} />
          </div>
          <SlotSelect
            value={item.color}
            options={WARDROBE_SLOT_CATALOGS.palette}
            onChange={(v) => onChange({ color: v })}
          />
          {item.color === CUSTOM_ID && (
            <input
              value={item.customColor || ''}
              onChange={(e) => onChange({ customColor: e.target.value })}
              placeholder="Describe the color..."
              className="input-field w-full text-xs mt-1"
            />
          )}
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <span className="section-heading">Location</span>
            <DiceButton label="location" onClick={() => onDice('location')} />
          </div>
          <SlotSelect
            value={item.location}
            options={WARDROBE_LOCATIONS}
            onChange={(v) => onChange({ location: v })}
          />
          {item.location === CUSTOM_ID && (
            <input
              value={item.customLocation || ''}
              onChange={(e) => onChange({ customLocation: e.target.value })}
              placeholder="Where is it worn?"
              className="input-field w-full text-xs mt-1"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function OutfitCard({ outfit, isGenerating, onGenerate, onDelete, onDownload, onFullscreen, threeD }) {
  const items = outfit.items || []

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden group">
      <div
        className={`relative w-full bg-slate-950 overflow-hidden ${aspectClassForRatio('3:4')} ${outfit.image ? 'cursor-pointer' : ''}`}
        onClick={outfit.image ? onFullscreen : undefined}
      >
        {outfit.image ? (
          <>
            <img
              src={base64ToDataUrl(outfit.image)}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFullscreen() }}
                className="p-2 bg-black/60 rounded-lg text-white"
              >
                <Maximize2 size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDownload() }}
                className="p-2 bg-black/60 rounded-lg text-white"
              >
                <Download size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
            <Shirt size={32} className="mb-2" />
            <p className="text-xs">Not generated</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="loader" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <h4 className="font-bold text-white truncate">{outfit.name}</h4>
          <span className="text-[10px] bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full border border-amber-900/50 shrink-0">
            {outfit.styleTag}
          </span>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          {items.length === 0 ? (
            <p>No items</p>
          ) : (
            items.slice(0, 6).map((item) => (
              <p key={item.id} className="truncate">{outfitItemLabel(item)}</p>
            ))
          )}
          {items.length > 6 ? <p>+{items.length - 6} more</p> : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Wand2 size={12} /> {outfit.image ? 'Regen' : 'Generate'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="py-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-xs transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {threeD}
      </div>
    </div>
  )
}
