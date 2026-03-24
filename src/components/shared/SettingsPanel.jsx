import React, { useState } from 'react'
import { X, Key, HardDrive, ExternalLink, RefreshCw } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { getStorageEstimate } from '../../utils/db'
import { formatBytes } from '../../utils/imageUtils'
import { modelIdFromApiName } from '../../utils/models'

export default function SettingsPanel({ onClose }) {
  const apiKey = useCharacterStore(s => s.apiKey)
  const setApiKey = useCharacterStore(s => s.setApiKey)
  const availableTextModels = useCharacterStore(s => s.availableTextModels)
  const availableImageModels = useCharacterStore(s => s.availableImageModels)
  const selectedTextModel = useCharacterStore(s => s.selectedTextModel)
  const selectedImageModel = useCharacterStore(s => s.selectedImageModel)
  const setSelectedTextModel = useCharacterStore(s => s.setSelectedTextModel)
  const setSelectedImageModel = useCharacterStore(s => s.setSelectedImageModel)
  const refreshModels = useCharacterStore(s => s.refreshModels)
  const addToast = useToastStore(s => s.addToast)

  const [keyInput, setKeyInput] = useState(apiKey || '')
  const [storage, setStorage] = useState(null)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)

  React.useEffect(() => {
    getStorageEstimate().then(setStorage)
  }, [])

  React.useEffect(() => {
    setKeyInput(apiKey || '')
  }, [apiKey])

  const handleSaveKey = () => {
    if (!keyInput.trim()) {
      addToast('Please enter a valid API key', 'warning')
      return
    }
    setApiKey(keyInput.trim())
    addToast('API key saved!', 'success')
  }

  const keyForModelFetch = keyInput.trim() || apiKey

  const handleRefreshModels = async () => {
    if (!keyForModelFetch) {
      addToast('Enter or save an API key first', 'warning')
      return
    }
    setIsRefreshingModels(true)
    try {
      await refreshModels(keyForModelFetch)
      addToast('Model list updated', 'success')
    } catch (e) {
      addToast(e?.message || 'Failed to refresh models', 'error')
    } finally {
      setIsRefreshingModels(false)
    }
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

          {keyForModelFetch && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <span className="text-xs text-slate-400">
                {availableTextModels.length > 0 || availableImageModels.length > 0
                  ? `${availableTextModels.length} text, ${availableImageModels.length} image models`
                  : 'No models loaded — refresh to scan your account'}
              </span>
              <button
                type="button"
                onClick={() => void handleRefreshModels()}
                disabled={isRefreshingModels}
                className="text-xs px-3 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded-md transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 border border-blue-500/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshingModels ? 'animate-spin' : ''}`} />
                {isRefreshingModels ? 'Scanning…' : 'Refresh List'}
              </button>
            </div>
          )}

          {availableTextModels.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                Text generation model
              </label>
              <select
                value={selectedTextModel}
                onChange={(e) => void setSelectedTextModel(e.target.value)}
                className="input-field w-full"
              >
                {availableTextModels.map((model) => (
                  <option key={model.name} value={modelIdFromApiName(model.name)}>
                    {model.displayName || model.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {availableImageModels.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                Image generation model
              </label>
              <select
                value={selectedImageModel}
                onChange={(e) => void setSelectedImageModel(e.target.value)}
                className="input-field w-full"
              >
                {availableImageModels.map((model) => (
                  <option key={model.name} value={modelIdFromApiName(model.name)}>
                    {model.displayName || model.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
