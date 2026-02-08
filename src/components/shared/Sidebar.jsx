import React from 'react'
import {
  Fingerprint, Dumbbell, ScanFace, Footprints, Brain, BookOpen,
  MessagesSquare, Flame, Sparkles, Upload, Shirt, BookMarked,
  Settings, Dice5, Save, ChevronLeft, Dna
} from 'lucide-react'
import { CHARACTER_SECTIONS } from '../../data/schemas'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { saveCharacter } from '../../utils/db'

const ICON_MAP = {
  Fingerprint, Dumbbell, ScanFace, Footprints, Brain, BookOpen,
  MessagesSquare, Flame,
}

const SPECIAL_TABS = [
  { id: 'generate', icon: Sparkles, label: 'Generate Images', color: 'purple' },
  { id: 'analyze', icon: Upload, label: 'Analyze Image', color: 'pink' },
  { id: 'wardrobe', icon: Shirt, label: 'Wardrobe', color: 'amber' },
  { id: 'library', icon: BookMarked, label: 'Library', color: 'emerald' },
]

export default function Sidebar({ currentTab, onTabChange, sidebarOpen, onToggleSidebar, onOpenSettings }) {
  const randomizeAll = useCharacterStore(s => s.randomizeAll)
  const getSaveData = useCharacterStore(s => s.getSaveData)
  const addToast = useToastStore(s => s.addToast)

  const handleSave = async () => {
    try {
      const data = getSaveData()
      await saveCharacter(data)
      addToast('Character saved to library!', 'success')
    } catch (e) {
      addToast('Failed to save: ' + e.message, 'error')
    }
  }

  const handleRandomize = () => {
    randomizeAll()
    addToast('All attributes randomized!', 'info')
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {/* Character Form Tabs */}
        <div className="px-4 mb-2">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Character</span>
        </div>
        {Object.entries(CHARACTER_SECTIONS).map(([key, section]) => {
          const Icon = ICON_MAP[section.icon] || Fingerprint
          const isActive = currentTab === key
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{section.label}</span>
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
        <button
          onClick={handleRandomize}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Dice5 size={14} />
          <span>Randomize All</span>
        </button>
      </div>
    </aside>
  )
}
