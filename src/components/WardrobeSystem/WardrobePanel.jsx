import React, { useState } from 'react'
import {
  Shirt, Plus, Trash2, Wand2, Download, Shuffle, X, Maximize2, Lock, Unlock,
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
  NONE_ID,
  STYLE_TAG_IDS,
  WARDROBE_SLOT_CATALOGS,
} from '../../data/options/wardrobe'
import {
  customFieldKey,
  emptyOutfitDraft,
  migrateOutfit,
  compileOutfitPrompt,
  outfitSlotLabel,
  randomizeOutfitDraft,
  randomizeOutfitTrait,
} from '../../utils/wardrobe'

function TraitRow({ label, traitId, lockedFields, onToggleLock, onDice, children }) {
  const locked = !!lockedFields[traitId]
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={() => onToggleLock(traitId)}
          aria-pressed={locked}
          aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
          className="shrink-0 p-1 rounded-md hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          {locked ? (
            <Lock size={14} className="text-amber-400" strokeWidth={2.25} />
          ) : (
            <Unlock size={14} className="text-slate-500" strokeWidth={2} />
          )}
        </button>
        <span className="section-heading flex-1 min-w-0">{label}</span>
        <button
          type="button"
          disabled={locked}
          onClick={() => onDice(traitId)}
          aria-label={`Randomize ${label}`}
          className="shrink-0 p-1 rounded-md text-slate-500 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          <Shuffle size={14} />
        </button>
      </div>
      {children}
    </div>
  )
}

function SlotSelect({ value, options, onChange, placeholder = 'Select...' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input-field w-full">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label || o.id}
        </option>
      ))}
    </select>
  )
}

function CustomText({ slot, draft, onChange, placeholder }) {
  if (draft[slot] !== CUSTOM_ID) return null
  const key = customFieldKey(slot)
  return (
    <input
      type="text"
      value={draft[key] || ''}
      onChange={(e) => onChange(key, e.target.value)}
      placeholder={placeholder}
      className="input-field w-full mt-2"
    />
  )
}

export default function WardrobePanel() {
  const character = useCharacterStore((s) => s.character)
  const apiKey = useCharacterStore((s) => s.apiKey)
  const availableImageModels = useCharacterStore((s) => s.availableImageModels)
  const presentationMode = useCharacterStore((s) => s.presentationMode)
  const wardrobe = useCharacterStore((s) => s.wardrobe)
  const addOutfit = useCharacterStore((s) => s.addOutfit)
  const updateOutfit = useCharacterStore((s) => s.updateOutfit)
  const removeOutfit = useCharacterStore((s) => s.removeOutfit)
  const addToast = useToastStore((s) => s.addToast)

  const [showForm, setShowForm] = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const [draft, setDraft] = useState(emptyOutfitDraft)
  const [lockedFields, setLockedFields] = useState({})

  const diceCtx = () => ({
    presentationMode,
    genre: character.genre || 'Mixed',
    wardrobe,
  })

  const patchDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const toggleLock = (traitId) => {
    setLockedFields((prev) => {
      const next = { ...prev }
      if (next[traitId]) delete next[traitId]
      else next[traitId] = true
      return next
    })
  }

  const closeForm = () => {
    setShowForm(false)
    setDraft(emptyOutfitDraft())
    setLockedFields({})
  }

  const handleHeaderRandomize = () => {
    setDraft((prev) =>
      randomizeOutfitDraft(showForm ? prev : emptyOutfitDraft(), showForm ? lockedFields : {}, {
        ...diceCtx(),
        assignName: true,
      }),
    )
    setShowForm(true)
  }

  const handleNewOutfit = () => {
    setDraft(emptyOutfitDraft())
    setLockedFields({})
    setShowForm(true)
  }

  const handleTraitDice = (traitId) => {
    setDraft((prev) => randomizeOutfitTrait(prev, traitId, lockedFields, diceCtx()))
  }

  const handleAddOutfit = () => {
    if (!draft.name?.trim()) {
      addToast('Please name the outfit', 'warning')
      return
    }

    const outfitToAdd = {
      ...migrateOutfit(draft),
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
      const extraNegative = mergeNegativePrompt('outfit', presentationMode, '')

      const prompt = buildImagePrompt(character, 'outfit', {
        presentationMode,
        hasReferenceImage: !!referenceImageBase64,
        poseReference: poseSource,
        outfitOverride: fullAttire,
        extraNegative,
      })

      const rawBase64 = await callGenerateImage(apiKey, prompt, {
        aspectRatio: '3:4',
        modelId,
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

  const accessoryOptions = WARDROBE_SLOT_CATALOGS.accessories.filter(
    (o) => !(draft.accessories || []).includes(o.id),
  )

  const addAccessory = (id) => {
    if (!id) return
    setDraft((prev) => ({
      ...prev,
      accessories: [...(prev.accessories || []), id],
    }))
  }

  const removeAccessory = (id) => {
    setDraft((prev) => ({
      ...prev,
      accessories: (prev.accessories || []).filter((a) => a !== id),
      ...(id === CUSTOM_ID ? { customAccessories: '' } : {}),
    }))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Wardrobe</h2>
          <p className="text-slate-400 text-sm">
            Build looks with lockable traits and dice. Random names stay Look #1, Look #2, and so on.
            {' '}
            <span className="text-slate-500">
              Uses the mannequin pose when one exists, otherwise the T-pose lock.
              Presentation is {presentationMode === 'thirst' ? 'Thirst' : 'Canonical'} (set in Generation Studio).
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleHeaderRandomize} className="btn-secondary text-sm flex items-center gap-2">
            <Shuffle size={14} /> Random Outfit
          </button>
          <button type="button" onClick={handleNewOutfit} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> New Outfit
          </button>
        </div>
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
                value={draft.name}
                onChange={(e) => patchDraft('name', e.target.value)}
                placeholder="E.g., Battle Armor, Date Night..."
                className="input-field w-full"
              />
            </div>

            <TraitRow
              label="Style Tag"
              traitId="styleTag"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <select
                value={draft.styleTag}
                onChange={(e) => patchDraft('styleTag', e.target.value)}
                className="input-field w-full"
              >
                {STYLE_TAG_IDS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </TraitRow>

            <TraitRow
              label="Occupancy"
              traitId="occupancy"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <select
                value={draft.occupancy}
                onChange={(e) => patchDraft('occupancy', e.target.value)}
                className="input-field w-full"
              >
                <option value="separates">Separates (top + bottom)</option>
                <option value="one-piece">One-piece</option>
              </select>
            </TraitRow>

            {draft.occupancy === 'one-piece' ? (
              <TraitRow
                label="One-Piece"
                traitId="onePiece"
                lockedFields={lockedFields}
                onToggleLock={toggleLock}
                onDice={handleTraitDice}
              >
                <SlotSelect
                  value={draft.onePiece}
                  options={WARDROBE_SLOT_CATALOGS.onePiece}
                  onChange={(v) => patchDraft('onePiece', v)}
                />
                <CustomText slot="onePiece" draft={draft} onChange={patchDraft} placeholder="Describe the one-piece..." />
              </TraitRow>
            ) : (
              <>
                <TraitRow
                  label="Top"
                  traitId="top"
                  lockedFields={lockedFields}
                  onToggleLock={toggleLock}
                  onDice={handleTraitDice}
                >
                  <SlotSelect
                    value={draft.top}
                    options={WARDROBE_SLOT_CATALOGS.top}
                    onChange={(v) => patchDraft('top', v)}
                  />
                  <CustomText slot="top" draft={draft} onChange={patchDraft} placeholder="Describe the top..." />
                </TraitRow>
                <TraitRow
                  label="Bottom"
                  traitId="bottom"
                  lockedFields={lockedFields}
                  onToggleLock={toggleLock}
                  onDice={handleTraitDice}
                >
                  <SlotSelect
                    value={draft.bottom}
                    options={WARDROBE_SLOT_CATALOGS.bottom}
                    onChange={(v) => patchDraft('bottom', v)}
                  />
                  <CustomText slot="bottom" draft={draft} onChange={patchDraft} placeholder="Describe the bottom..." />
                </TraitRow>
              </>
            )}

            <TraitRow
              label="Outerwear"
              traitId="outerwear"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <SlotSelect
                value={draft.outerwear}
                options={WARDROBE_SLOT_CATALOGS.outerwear}
                onChange={(v) => patchDraft('outerwear', v)}
                placeholder="None"
              />
              <CustomText slot="outerwear" draft={draft} onChange={patchDraft} placeholder="Describe the outerwear..." />
            </TraitRow>

            <TraitRow
              label="Footwear"
              traitId="footwear"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <SlotSelect
                value={draft.footwear}
                options={WARDROBE_SLOT_CATALOGS.footwear}
                onChange={(v) => patchDraft('footwear', v)}
              />
              <CustomText slot="footwear" draft={draft} onChange={patchDraft} placeholder="Describe the footwear..." />
            </TraitRow>

            <TraitRow
              label="Accessories"
              traitId="accessories"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <div className="flex flex-wrap gap-2 mb-2">
                {(draft.accessories || []).map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-600"
                  >
                    {id === CUSTOM_ID ? (draft.customAccessories || 'Custom') : id}
                    <button
                      type="button"
                      onClick={() => removeAccessory(id)}
                      className="text-slate-500 hover:text-white"
                      aria-label={`Remove ${id}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => addAccessory(e.target.value)}
                className="input-field w-full"
                disabled={!!lockedFields.accessories || accessoryOptions.length === 0}
              >
                <option value="">Add accessory...</option>
                {accessoryOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label || o.id}</option>
                ))}
              </select>
              {(draft.accessories || []).includes(CUSTOM_ID) && (
                <input
                  type="text"
                  value={draft.customAccessories || ''}
                  onChange={(e) => patchDraft('customAccessories', e.target.value)}
                  placeholder="Describe custom accessories..."
                  className="input-field w-full mt-2"
                />
              )}
            </TraitRow>

            <TraitRow
              label="Palette"
              traitId="palette"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <SlotSelect
                value={draft.palette}
                options={WARDROBE_SLOT_CATALOGS.palette}
                onChange={(v) => patchDraft('palette', v)}
              />
              <CustomText slot="palette" draft={draft} onChange={patchDraft} placeholder="Describe the color palette..." />
            </TraitRow>

            <TraitRow
              label="Fabric"
              traitId="fabric"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <SlotSelect
                value={draft.fabric}
                options={WARDROBE_SLOT_CATALOGS.fabric}
                onChange={(v) => patchDraft('fabric', v)}
              />
              <CustomText slot="fabric" draft={draft} onChange={patchDraft} placeholder="Describe the fabric..." />
            </TraitRow>

            <TraitRow
              label="Condition"
              traitId="condition"
              lockedFields={lockedFields}
              onToggleLock={toggleLock}
              onDice={handleTraitDice}
            >
              <SlotSelect
                value={draft.condition}
                options={WARDROBE_SLOT_CATALOGS.condition}
                onChange={(v) => patchDraft('condition', v)}
              />
              <CustomText slot="condition" draft={draft} onChange={patchDraft} placeholder="Describe wear and condition..." />
            </TraitRow>
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
            Lock a style and hit Random Outfit, or build a look by hand
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
    </div>
  )
}

function OutfitCard({ outfit, isGenerating, onGenerate, onDelete, onDownload, onFullscreen }) {
  const accessories = outfit.accessories || []
  const extras = [
    outfitSlotLabel(outfit, 'palette'),
    outfitSlotLabel(outfit, 'fabric'),
    outfitSlotLabel(outfit, 'condition'),
  ].filter(Boolean)

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
          <p className="capitalize text-slate-400">{outfit.occupancy}</p>
          {outfit.occupancy === 'one-piece' ? (
            outfit.onePiece ? <p>One-piece: {outfitSlotLabel(outfit, 'onePiece')}</p> : null
          ) : (
            <>
              {outfit.top ? <p>Top: {outfitSlotLabel(outfit, 'top')}</p> : null}
              {outfit.bottom ? <p>Bottom: {outfitSlotLabel(outfit, 'bottom')}</p> : null}
            </>
          )}
          {outfit.outerwear && outfit.outerwear !== NONE_ID ? (
            <p>Outer: {outfitSlotLabel(outfit, 'outerwear')}</p>
          ) : null}
          {outfit.footwear ? <p>Feet: {outfitSlotLabel(outfit, 'footwear')}</p> : null}
          {accessories.length > 0 ? (
            <p>
              Acc:{' '}
              {accessories
                .map((id) => (id === CUSTOM_ID ? (outfit.customAccessories || 'Custom') : id))
                .join(', ')}
            </p>
          ) : null}
          {extras.length > 0 ? <p>{extras.join(' · ')}</p> : null}
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
      </div>
    </div>
  )
}
