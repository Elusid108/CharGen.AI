import React, { useState } from 'react'
import {
  Image, User, RotateCcw, Shirt, Camera, Download, Maximize2,
  ChevronDown, Wand2, PenLine, BookOpen, X
} from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { generateImage as callGenerateImage, buildImagePrompt, generateBackstory as callGenerateBackstory } from '../../utils/api'
import { ART_STYLES, LIGHTING_OPTIONS, MOOD_OPTIONS } from '../../data/schemas'
import { downloadImage, base64ToDataUrl } from '../../utils/imageUtils'

const IMAGE_TYPES = [
  { id: 'profile', label: 'Profile (1:1)', icon: User, ratio: '1:1', description: 'Head & shoulders portrait' },
  { id: 'fullbody', label: 'Full Body', icon: Image, ratio: '3:4', description: 'Relaxed natural pose' },
  { id: 'tpose', label: 'T-Pose Reference', icon: RotateCcw, ratio: '16:9', description: 'Front, side, back views' },
  { id: 'mannequin', label: 'Mannequin Base', icon: Shirt, ratio: '3:4', description: 'Base layer for outfits' },
]

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
  const generatedImages = useCharacterStore(s => s.generatedImages)
  const setGeneratedImage = useCharacterStore(s => s.setGeneratedImage)
  const backstory = useCharacterStore(s => s.backstory)
  const setBackstory = useCharacterStore(s => s.setBackstory)
  const addToast = useToastStore(s => s.addToast)

  // Image generation state
  const [artStyle, setArtStyle] = useState('')
  const [lighting, setLighting] = useState('')
  const [mood, setMood] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [generatingType, setGeneratingType] = useState(null)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  // Story generation state
  const [storyLength, setStoryLength] = useState('Standard Bio')
  const [storyTone, setStoryTone] = useState('Simple')
  const [storyGenre, setStoryGenre] = useState('High Fantasy')
  const [generatingStory, setGeneratingStory] = useState(false)

  const handleGenerateImage = async (imageType) => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    setGeneratingType(imageType)
    try {
      const typeConfig = IMAGE_TYPES.find(t => t.id === imageType)
      const prompt = buildImagePrompt(character, imageType, {
        artStyle, lighting, mood,
      })

      const base64 = await callGenerateImage(apiKey, prompt, {
        aspectRatio: typeConfig.ratio,
        negativePrompt,
      })

      setGeneratedImage(imageType, base64)
      addToast(`${typeConfig.label} generated successfully!`, 'success')
    } catch (e) {
      addToast(e.message, 'error', 5000)
    } finally {
      setGeneratingType(null)
    }
  }

  const handleGenerateAllImages = async () => {
    for (const type of IMAGE_TYPES) {
      await handleGenerateImage(type.id)
    }
  }

  const handleGenerateStory = async () => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }

    setGeneratingStory(true)
    try {
      const text = await callGenerateBackstory(apiKey, character, {
        length: storyLength,
        tone: storyTone,
        genre: storyGenre,
      })
      setBackstory(text)
      addToast('Backstory generated!', 'success')
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
    downloadImage(base64ToDataUrl(base64), `${name}_${imageType}.png`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Character Sheet Summary */}
      <CharacterSummary character={character} />

      {/* Generation Controls */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Camera size={18} className="text-purple-400" />
          Image Generation Controls
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="section-heading mb-1 block">Art Style</label>
            <select value={artStyle} onChange={e => setArtStyle(e.target.value)} className="input-field w-full text-xs">
              {ART_STYLES.map((s, i) => <option key={i} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Lighting</label>
            <select value={lighting} onChange={e => setLighting(e.target.value)} className="input-field w-full text-xs">
              {LIGHTING_OPTIONS.map((l, i) => <option key={i} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)} className="input-field w-full text-xs">
              {MOOD_OPTIONS.map((m, i) => <option key={i} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="section-heading mb-1 block">Exclude</label>
            <input
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="Blurry, low quality..."
              className="input-field w-full text-xs"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateAllImages}
          disabled={generatingType !== null}
          className="btn-generate w-full flex items-center justify-center gap-2"
        >
          {generatingType ? (
            <><div className="loader" /> Generating...</>
          ) : (
            <><Wand2 size={18} /> Generate All Images</>
          )}
        </button>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IMAGE_TYPES.map(type => (
          <ImageCard
            key={type.id}
            type={type}
            image={generatedImages[type.id]}
            isGenerating={generatingType === type.id}
            onGenerate={() => handleGenerateImage(type.id)}
            onDownload={() => handleDownload(type.id)}
            onFullscreen={() => setFullscreenImage(generatedImages[type.id])}
          />
        ))}
      </div>

      {/* Narrative Engine */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <PenLine size={18} className="text-purple-400" />
          Narrative Engine
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-4">
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
            <select value={storyGenre} onChange={e => setStoryGenre(e.target.value)} className="input-field w-full text-xs">
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
        </div>

        <button
          onClick={handleGenerateStory}
          disabled={generatingStory}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generatingStory ? (
            <><div className="loader" /> Writing...</>
          ) : (
            <><BookOpen size={16} /> Generate Backstory</>
          )}
        </button>

        <div
          className="bg-slate-950 p-4 rounded-lg min-h-[200px] text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border border-slate-800 focus:border-purple-500 focus:outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={e => setBackstory(e.target.innerText)}
          dangerouslySetInnerHTML={{
            __html: backstory || '<span class="text-slate-600 italic">Backstory will appear here. You can also type directly...</span>'
          }}
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

function ImageCard({ type, image, isGenerating, onGenerate, onDownload, onFullscreen }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-3 flex justify-between items-center border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <type.icon size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-white">{type.label}</span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase">{type.description}</span>
      </div>

      <div
        className="relative min-h-[280px] bg-slate-950 flex items-center justify-center cursor-pointer group"
        onClick={image ? onFullscreen : undefined}
      >
        {image ? (
          <>
            <img
              src={base64ToDataUrl(image)}
              className="w-full h-full object-cover"
              style={{ minHeight: 280, maxHeight: 400 }}
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
          <div className="text-center text-slate-700">
            <type.icon size={40} className="mx-auto mb-2" />
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

      <div className="p-3">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 border border-purple-900/30"
        >
          {isGenerating ? 'Generating...' : image ? 'Regenerate' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
