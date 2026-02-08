import React from 'react'
import { Menu, Trash2 } from 'lucide-react'
import { CHARACTER_SECTIONS } from '../../data/schemas'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'

const SPECIAL_TITLES = {
  generate: 'Image Generation',
  analyze: 'Image Analysis',
  wardrobe: 'Wardrobe & Outfits',
  library: 'Character Library',
}

export default function Header({ currentTab, onToggleSidebar, sidebarOpen }) {
  const resetCharacter = useCharacterStore(s => s.resetCharacter)
  const characterName = useCharacterStore(s => s.character.name)
  const addToast = useToastStore(s => s.addToast)

  const title = CHARACTER_SECTIONS[currentTab]?.label || SPECIAL_TITLES[currentTab] || 'CharGen.AI'

  const handleReset = () => {
    if (window.confirm('Start a new character? Unsaved data will be lost.')) {
      resetCharacter()
      addToast('Character reset. Starting fresh.', 'info')
    }
  }

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {characterName && (
            <p className="text-xs text-slate-500 -mt-0.5">
              Editing: <span className="text-blue-400">{characterName}</span>
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleReset}
        className="text-slate-500 hover:text-red-400 text-sm transition-colors flex items-center gap-1.5"
      >
        <Trash2 size={14} />
        <span className="hidden sm:inline">New Character</span>
      </button>
    </header>
  )
}
