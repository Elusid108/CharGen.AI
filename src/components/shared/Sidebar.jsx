import React from 'react'
import {
  Fingerprint, Dumbbell, ScanFace, Footprints, Brain, BookOpen,
  MessagesSquare, Flame, Sparkles, Upload, Shirt, BookMarked,
  Settings, Dice5, Save, ChevronLeft, Dna, Loader2, Activity, Milestone, Box
} from 'lucide-react'
import { APP_VERSION } from '../../appVersion'
import { SHEET_TABS } from '../../data/sheetTabs'
import { randomSeed } from '../../utils/rng'
import SeedControl from './SeedControl'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { saveCharacter } from '../../utils/db'
import { compressSaveAssets } from '../../utils/imageUtils'

const ICON_MAP = {
  Fingerprint, Dumbbell, ScanFace, Footprints, Brain, BookOpen,
  MessagesSquare, Flame, Milestone,
}

const SPECIAL_TABS = [
  { id: 'generate', icon: Sparkles, label: 'Generation Studio', color: 'purple' },
  { id: 'chat', icon: MessagesSquare, label: 'Chat', color: 'cyan' },
  { id: 'wardrobe', icon: Shirt, label: 'Wardrobe', color: 'amber' },
  { id: 'motion', icon: Activity, label: 'Motion Studio', color: 'orange' },
  { id: 'studio3d', icon: Box, label: '3D Studio', color: 'cyan' },
  { id: 'library', icon: BookMarked, label: 'Library', color: 'emerald' },
]

const ANALYZE_TAB = { id: 'analyze', icon: Upload, label: 'Analyze Image', color: 'pink' }

export default function Sidebar({ currentTab, onTabChange, sidebarOpen, onToggleSidebar, onOpenSettings }) {
  const randomizeAll = useCharacterStore(s => s.randomizeAll)
  const enrichWithAi = useCharacterStore(s => s.enrichWithAi)
  const characterSeed = useCharacterStore(s => s.characterSeed)
  const seedLocked = useCharacterStore(s => s.seedLocked)
  const setCharacterSeed = useCharacterStore(s => s.setCharacterSeed)
  const toggleSeedLock = useCharacterStore(s => s.toggleSeedLock)
  const isGenerating = useCharacterStore(s => s.isGenerating)
  const getSaveData = useCharacterStore(s => s.getSaveData)
  const setCharacterId = useCharacterStore(s => s.setCharacterId)
  const addToast = useToastStore(s => s.addToast)

  const handleSave = async () => {
    try {
      const data = getSaveData()
      const compressed = await compressSaveAssets(data)
      await saveCharacter(compressed)
      setCharacterId(compressed.id)
      useCharacterStore.setState({
        generatedImages: compressed.generatedImages,
        generatedModels: compressed.generatedModels,
        wardrobe: compressed.wardrobe,
        ...(compressed.chat ? { chat: compressed.chat } : {}),
      })
      addToast('Character saved to library!', 'success')
    } catch (e) {
      addToast('Failed to save: ' + e.message, 'error')
    }
  }

  const handleRandomize = () => {
    const result = randomizeAll()
    addToast(`Rolled a new character (seed ${result.seed}).`, 'success')
  }

  if (!sidebarOpen) return null

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Dna className="text-blue-500" size={22} />
            <span>CharGen<span className="text-blue-500">.AI</span></span>
          </h1>
          <button
            onClick={onToggleSidebar}
            className="text-slate-500 hover:text-white transition-colors lg:hidden"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Universal Character Engine</p>
        <p className="text-[10px] text-slate-600 font-mono tabular-nums mt-0.5">v{APP_VERSION}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {/* Image Analysis — pinned above character sections */}
        <button
          type="button"
          onClick={() => onTabChange(ANALYZE_TAB.id)}
          className={`nav-item ${
            currentTab === ANALYZE_TAB.id
              ? 'bg-slate-800/80 text-pink-400 border-pink-500'
              : 'nav-item-inactive'
          }`}
        >
          <Upload size={16} className="shrink-0" />
          <span className="truncate">{ANALYZE_TAB.label}</span>
        </button>

        {/* Character Form Tabs */}
        <div className="px-4 mb-2 mt-3">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Character</span>
        </div>
        {SHEET_TABS.map((tab) => {
          const Icon = ICON_MAP[tab.icon] || Fingerprint
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}

        {/* Divider */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Tools</span>
        </div>

        {/* Special Tabs */}
        {SPECIAL_TABS.map(tab => {
          const isActive = currentTab === tab.id
          const colorClasses = {
            purple: isActive ? 'bg-slate-800/80 text-purple-400 border-purple-500' : '',
            pink: isActive ? 'bg-slate-800/80 text-pink-400 border-pink-500' : '',
            amber: isActive ? 'bg-slate-800/80 text-amber-400 border-amber-500' : '',
            emerald: isActive ? 'bg-slate-800/80 text-emerald-400 border-emerald-500' : '',
            cyan: isActive ? 'bg-slate-800/80 text-cyan-400 border-cyan-500' : '',
            orange: isActive ? 'bg-slate-800/80 text-orange-400 border-orange-500' : '',
          }
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-item ${isActive ? colorClasses[tab.color] : 'nav-item-inactive'}`}
            >
              <tab.icon size={16} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={onOpenSettings}
          className="w-full py-2 px-4 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
        <button
          onClick={handleSave}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Save size={14} />
          <span>Save to Library</span>
        </button>
        <SeedControl
          compact
          label="Character seed"
          seed={characterSeed}
          locked={seedLocked}
          onToggleLock={toggleSeedLock}
          onChange={setCharacterSeed}
          onRandomize={randomSeed}
          emptyLabel="No seed (imported)"
          disabled={isGenerating}
        />
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleRandomize}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          <Dice5 size={14} />
          <span>Randomize All</span>
        </button>
        <button
          type="button"
          disabled={isGenerating}
          onClick={() => void enrichWithAi({ scope: 'all' })}
          title="Fill blank name / custom text fields with Gemini"
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span>{isGenerating ? 'Enriching…' : 'Enrich with AI'}</span>
        </button>
      </div>
    </aside>
  )
}
