import React, { useState } from 'react'
import {
  Shirt, Plus, Trash2, Wand2, Download, Shuffle, ChevronDown, X, Maximize2
} from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { generateImage as callGenerateImage, buildImagePrompt } from '../../utils/api'
import { ART_STYLES, LIGHTING_OPTIONS } from '../../data/schemas'
import { downloadImage, base64ToDataUrl, generateId } from '../../utils/imageUtils'

const OUTFIT_CATEGORIES = {
  top: ['None/Shirtless', 'T-Shirt', 'Button-Up Shirt', 'Hoodie', 'Tank Top', 'Leather Jacket', 'Blazer', 'Sweater', 'Crop Top', 'Vest', 'Tactical Vest', 'Armor Plate', 'Robe', 'Flannel (Unbuttoned)', 'Corset', 'Cape/Cloak'],
  bottom: ['Jeans', 'Cargo Pants', 'Sweatpants', 'Shorts', 'Leather Pants', 'Dress Pants', 'Skirt', 'Kilt', 'Armor Greaves', 'Daisy Dukes', 'Compression Shorts', 'Loincloth', 'Sarong'],
  footwear: ['Barefoot', 'Boots (Combat)', 'Boots (Cowboy)', 'Sneakers', 'Dress Shoes', 'Sandals', 'Armored Boots', 'High Heels', 'Platform Boots'],
  accessories: ['None', 'Dog Tags', 'Sword/Weapon', 'Backpack', 'Glasses/Goggles', 'Hat/Helmet', 'Belt & Holster', 'Jewelry/Rings', 'Scarf/Bandana', 'Watch', 'Piercings', 'Crown/Tiara', 'Wrist Guards'],
}

const STYLE_TAGS = ['Casual', 'Formal', 'Combat', 'Fantasy', 'Cyberpunk', 'Fetish/Leather', 'Athletic', 'Punk/Goth', 'Military', 'Western', 'Business', 'Swimwear', 'Sleepwear', 'Ceremonial']

export default function WardrobePanel() {
  const character = useCharacterStore(s => s.character)
  const apiKey = useCharacterStore(s => s.apiKey)
  const wardrobe = useCharacterStore(s => s.wardrobe)
  const addOutfit = useCharacterStore(s => s.addOutfit)
  const updateOutfit = useCharacterStore(s => s.updateOutfit)
  const removeOutfit = useCharacterStore(s => s.removeOutfit)
  const addToast = useToastStore(s => s.addToast)

  const [showNewForm, setShowNewForm] = useState(false)
  const [generatingId, setGeneratingId] = useState(null)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  // New outfit form state
  const [newOutfit, setNewOutfit] = useState({
    name: '',
    top: '',
    bottom: '',
    footwear: '',
    accessories: '',
    styleTag: 'Casual',
  })

  const handleAddOutfit = () => {
    if (!newOutfit.name) {
      addToast('Please name the outfit', 'warning')
      return
    }

    addOutfit({
      ...newOutfit,
      image: null,
    })

    setNewOutfit({ name: '', top: '', bottom: '', footwear: '', accessories: '', styleTag: 'Casual' })
    setShowNewForm(false)
    addToast('Outfit added to wardrobe!', 'success')
  }

  const handleGenerateOutfit = async (outfit) => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    setGeneratingId(outfit.id)

    try {
      // Build outfit-specific prompt
      const outfitDescription = [
        outfit.top && `Top: ${outfit.top}`,
        outfit.bottom && `Bottom: ${outfit.bottom}`,
        outfit.footwear && `Footwear: ${outfit.footwear}`,
        outfit.accessories && outfit.accessories !== 'None' && `Accessories: ${outfit.accessories}`,
      ].filter(Boolean).join('. ')

      const charWithOutfit = {
        ...character,
        attire: outfitDescription,
      }

      const prompt = buildImagePrompt(charWithOutfit, 'outfit', {})

      const base64 = await callGenerateImage(apiKey, prompt, {
        aspectRatio: '3:4',
      })

      updateOutfit(outfit.id, { image: base64 })
      addToast(`"${outfit.name}" outfit generated!`, 'success')
    } catch (e) {
      addToast('Outfit generation failed: ' + e.message, 'error', 5000)
    } finally {
      setGeneratingId(null)
    }
  }

  const handleRandomOutfit = () => {
    const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)]
    setNewOutfit({
      name: `Look #${wardrobe.length + 1}`,
      top: randomFrom(OUTFIT_CATEGORIES.top),
      bottom: randomFrom(OUTFIT_CATEGORIES.bottom),
      footwear: randomFrom(OUTFIT_CATEGORIES.footwear),
      accessories: randomFrom(OUTFIT_CATEGORIES.accessories),
      styleTag: randomFrom(STYLE_TAGS),
    })
    setShowNewForm(true)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Wardrobe</h2>
          <p className="text-slate-400 text-sm">
            Create and manage outfits for your character. Generate images of them in each look.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRandomOutfit} className="btn-secondary text-sm flex items-center gap-2">
            <Shuffle size={14} /> Random Outfit
          </button>
          <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={14} /> New Outfit
          </button>
        </div>
      </div>

      {/* New Outfit Form */}
      {showNewForm && (
        <div className="glass-panel p-6 border-l-4 border-amber-500 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">New Outfit</h3>
            <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="section-heading mb-1 block">Outfit Name</label>
              <input
                value={newOutfit.name}
                onChange={e => setNewOutfit({ ...newOutfit, name: e.target.value })}
                placeholder="E.g., Battle Armor, Date Night..."
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="section-heading mb-1 block">Style Tag</label>
              <select
                value={newOutfit.styleTag}
                onChange={e => setNewOutfit({ ...newOutfit, styleTag: e.target.value })}
                className="input-field w-full"
              >
                {STYLE_TAGS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {Object.entries(OUTFIT_CATEGORIES).map(([category, options]) => (
              <div key={category}>
                <label className="section-heading mb-1 block capitalize">{category}</label>
                <select
                  value={newOutfit[category] || ''}
                  onChange={e => setNewOutfit({ ...newOutfit, [category]: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Select...</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button onClick={handleAddOutfit} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={14} /> Add Outfit
          </button>
        </div>
      )}

      {/* Outfit Grid */}
      {wardrobe.length === 0 && !showNewForm ? (
        <div className="text-center py-16">
          <Shirt size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg">No outfits yet</p>
          <p className="text-slate-600 text-sm mt-1">Create outfits to dress your character in different looks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wardrobe.map(outfit => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              isGenerating={generatingId === outfit.id}
              onGenerate={() => handleGenerateOutfit(outfit)}
              onDelete={() => {
                removeOutfit(outfit.id)
                addToast('Outfit removed', 'info')
              }}
              onDownload={() => {
                if (outfit.image) {
                  const name = character.name?.replace(/\s+/g, '_') || 'character'
                  downloadImage(base64ToDataUrl(outfit.image), `${name}_${outfit.name.replace(/\s+/g, '_')}.png`)
                }
              }}
              onFullscreen={() => outfit.image && setFullscreenImage(outfit.image)}
            />
          ))}
        </div>
      )}

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
          <p className="absolute bottom-8 text-slate-500 text-sm">Click anywhere to close</p>
        </div>
      )}
    </div>
  )
}

function OutfitCard({ outfit, isGenerating, onGenerate, onDelete, onDownload, onFullscreen }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden group">
      {/* Image Area */}
      <div
        className="relative h-64 bg-slate-950 flex items-center justify-center cursor-pointer"
        onClick={outfit.image ? onFullscreen : undefined}
      >
        {outfit.image ? (
          <>
            <img src={base64ToDataUrl(outfit.image)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); onFullscreen() }} className="p-2 bg-black/60 rounded-lg text-white">
                <Maximize2 size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDownload() }} className="p-2 bg-black/60 rounded-lg text-white">
                <Download size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-700">
            <Shirt size={32} className="mx-auto mb-2" />
            <p className="text-xs">Not generated</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <div className="loader" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-white truncate">{outfit.name}</h4>
          <span className="text-[10px] bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full border border-amber-900/50">
            {outfit.styleTag}
          </span>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          {outfit.top && <p>Top: {outfit.top}</p>}
          {outfit.bottom && <p>Bottom: {outfit.bottom}</p>}
          {outfit.footwear && <p>Feet: {outfit.footwear}</p>}
          {outfit.accessories && outfit.accessories !== 'None' && <p>Acc: {outfit.accessories}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Wand2 size={12} /> {outfit.image ? 'Regen' : 'Generate'}
          </button>
          <button
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
