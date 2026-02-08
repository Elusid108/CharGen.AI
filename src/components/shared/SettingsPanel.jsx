import React, { useState } from 'react'
import { X, Key, HardDrive, ExternalLink } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { getStorageEstimate } from '../../utils/db'
import { formatBytes } from '../../utils/imageUtils'

export default function SettingsPanel({ onClose }) {
  const apiKey = useCharacterStore(s => s.apiKey)
  const setApiKey = useCharacterStore(s => s.setApiKey)
  const addToast = useToastStore(s => s.addToast)

  const [keyInput, setKeyInput] = useState(apiKey || '')
  const [storage, setStorage] = useState(null)

  React.useEffect(() => {
    getStorageEstimate().then(setStorage)
  }, [])

  const handleSaveKey = () => {
    if (!keyInput.trim()) {
      addToast('Please enter a valid API key', 'warning')
      return
    }
    setApiKey(keyInput.trim())
    addToast('API key saved!', 'success')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          {apiKey && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {/* API Key */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wide">
            <Key size={14} />
            Google AI API Key
          </div>

          {!apiKey && (
            <div className="p-3 bg-amber-900/20 border border-amber-900/30 rounded-lg">
              <p className="text-amber-400 text-xs font-medium mb-1">API Key Required</p>
              <p className="text-slate-400 text-xs">
                CharGen.AI needs a Google AI API key to generate images and text.
                Your key is stored locally in your browser and never sent anywhere except Google's API.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Google AI API key..."
              className="input-field flex-1"
            />
            <button onClick={handleSaveKey} className="btn-primary text-sm px-4">
              Save
            </button>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Get a free API key from Google AI Studio
            <ExternalLink size={10} />
          </a>
        </div>

        {/* Storage Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wide">
            <HardDrive size={14} />
            Local Storage
          </div>

          {storage && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Used</span>
                <span className="text-white font-mono">{formatBytes(storage.usage)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-400">Available</span>
                <span className="text-white font-mono">{formatBytes(storage.quota)}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{storage.percentUsed}% used</p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            All data is stored locally in your browser using IndexedDB.
            Characters, images, and settings persist between sessions.
          </p>
        </div>
      </div>
    </div>
  )
}
