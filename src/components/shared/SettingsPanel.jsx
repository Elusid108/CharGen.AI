import React, { useState } from 'react'
import { X, Key, HardDrive, ExternalLink, RefreshCw, Box, Globe } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { getStorageEstimate } from '../../utils/db'
import { formatBytes } from '../../utils/imageUtils'
import { modelIdFromApiName } from '../../utils/models'
import { APP_VERSION } from '../../appVersion'
import { refreshTripoBalance, refreshTripoBalanceSilent } from '../../utils/tripoJobs'
import { formatCredits } from '../../utils/tripoCredits'
import { getTripoBalance, normalizeProxyUrl, resolveTripoTransportStatus, TRIPO_REGIONS } from '../../utils/tripo'
import { describeTripoKeyCheck, detectTripoRegion, normalizeTripoKey } from '../../utils/tripoKey'

// Keeps browser password managers from autofilling or overwriting API key fields.
const KEY_INPUT_PROPS = {
  autoComplete: 'new-password',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-1p-ignore': true,
  'data-lpignore': 'true',
}

export default function SettingsPanel({ onClose }) {
  const apiKey = useCharacterStore(s => s.apiKey)
  const setApiKey = useCharacterStore(s => s.setApiKey)
  const tripoApiKey = useCharacterStore(s => s.tripoApiKey)
  const setTripoApiKey = useCharacterStore(s => s.setTripoApiKey)
  const tripoProxyUrl = useCharacterStore(s => s.tripoProxyUrl)
  const setTripoProxyUrl = useCharacterStore(s => s.setTripoProxyUrl)
  const tripoRegion = useCharacterStore(s => s.tripoRegion)
  const setTripoRegion = useCharacterStore(s => s.setTripoRegion)
  const tripoBalance = useCharacterStore(s => s.tripoBalance)
  const setTripoBalance = useCharacterStore(s => s.setTripoBalance)
  const availableTextModels = useCharacterStore(s => s.availableTextModels)
  const availableImageModels = useCharacterStore(s => s.availableImageModels)
  const selectedTextModel = useCharacterStore(s => s.selectedTextModel)
  const selectedImageModel = useCharacterStore(s => s.selectedImageModel)
  const setSelectedTextModel = useCharacterStore(s => s.setSelectedTextModel)
  const setSelectedImageModel = useCharacterStore(s => s.setSelectedImageModel)
  const refreshModels = useCharacterStore(s => s.refreshModels)
  const addToast = useToastStore(s => s.addToast)

  const [keyInput, setKeyInput] = useState(apiKey || '')
  const [tripoKeyInput, setTripoKeyInput] = useState(tripoApiKey || '')
  const [proxyInput, setProxyInput] = useState(tripoProxyUrl || '')
  const [isTestingProxy, setIsTestingProxy] = useState(false)
  const [storage, setStorage] = useState(null)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)
  const [isRefreshingTripo, setIsRefreshingTripo] = useState(false)

  React.useEffect(() => {
    getStorageEstimate().then(setStorage)
  }, [])

  React.useEffect(() => {
    setKeyInput(apiKey || '')
  }, [apiKey])

  React.useEffect(() => {
    setTripoKeyInput(tripoApiKey || '')
  }, [tripoApiKey])

  React.useEffect(() => {
    setProxyInput(tripoProxyUrl || '')
  }, [tripoProxyUrl])

  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const transportStatus = resolveTripoTransportStatus({ proxyUrl: tripoProxyUrl, hostname })
  const transportCopy = transportStatus === 'custom-proxy'
    ? 'Using your proxy — 3D works on this host.'
    : transportStatus === 'local-proxy'
      ? 'Local Vite proxy — 3D works while running locally.'
      : 'No proxy on this host — Tripo calls will be blocked by browser CORS. Add a proxy URL below.'

  const handleSaveProxy = async () => {
    const next = normalizeProxyUrl(proxyInput)
    if (proxyInput.trim() && !next) {
      addToast('Proxy URL must start with https:// (or http://localhost)', 'warning')
      return
    }
    await setTripoProxyUrl(next)
    addToast(next ? 'Tripo proxy saved' : 'Tripo proxy cleared', 'success')
  }

  const handleTestProxy = async () => {
    const key = normalizeTripoKey(tripoKeyInput) || tripoApiKey
    if (!key) {
      addToast('Save a Tripo key first, then test the proxy', 'warning')
      return
    }
    setIsTestingProxy(true)
    try {
      const bal = await getTripoBalance(key)
      addToast(`Proxy OK — ${formatCredits(bal.balance)} credits reachable`, 'success')
    } catch (e) {
      addToast(e?.message || 'Proxy test failed', 'error', 7000)
    } finally {
      setIsTestingProxy(false)
    }
  }

  React.useEffect(() => {
    if (tripoApiKey) void refreshTripoBalanceSilent()
  }, [tripoApiKey])

  const handleSaveTripoKey = async () => {
    const key = normalizeTripoKey(tripoKeyInput)
    if (!key) {
      addToast('Please enter a Tripo API key', 'warning')
      return
    }
    setIsRefreshingTripo(true)
    try {
      const result = await detectTripoRegion(key, (region) => getTripoBalance(key, { region }), { prefer: tripoRegion })
      const outcome = describeTripoKeyCheck(result, { key, transportStatus })
      if (outcome.save) {
        // Region first: saving the key triggers a balance refresh on the configured region.
        if (result.ok) await setTripoRegion(result.region)
        await setTripoApiKey(key)
        setTripoKeyInput(key)
        if (result.ok) setTripoBalance(result.balance)
      }
      addToast(outcome.message, outcome.level, outcome.level === 'success' ? 4000 : 10000)
    } finally {
      setIsRefreshingTripo(false)
    }
  }

  const handleRefreshTripoBalance = async () => {
    setIsRefreshingTripo(true)
    try {
      await refreshTripoBalance()
      addToast('Tripo balance updated', 'success')
    } catch (e) {
      addToast(`Could not load Tripo balance: ${e?.message || 'unknown error'}`, 'error', 8000)
    } finally {
      setIsRefreshingTripo(false)
    }
  }

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
              name="google-api-key"
              {...KEY_INPUT_PROPS}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Google AI API key..."
              className="input-field flex-1"
            />
            <button onClick={handleSaveKey} className="btn-primary text-sm px-4">
              Save
            </button>
            {apiKey && (
              <button
                type="button"
                onClick={() => { void setApiKey(''); setKeyInput(''); addToast('Google key removed from this browser', 'info') }}
                className="btn-secondary text-sm px-3"
                title="Remove the key from this browser"
              >
                Clear
              </button>
            )}
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

        {/* Tripo API Key */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wide">
            <Box size={14} />
            Tripo 3D API Key
          </div>
          <p className="text-xs text-slate-500">
            Separate from Google. Used only when you press a Generate 3D button. Stored locally in this browser.
            Save checks the key with a free balance call and picks its region (International or China) automatically.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              name="tripo-api-key"
              {...KEY_INPUT_PROPS}
              value={tripoKeyInput}
              onChange={(e) => setTripoKeyInput(e.target.value)}
              placeholder="Enter your Tripo API key (tsk_...)"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={() => void handleSaveTripoKey()}
              disabled={isRefreshingTripo}
              className="btn-primary text-sm px-4 disabled:opacity-50"
            >
              {isRefreshingTripo ? 'Checking…' : 'Save'}
            </button>
            {tripoApiKey && (
              <button
                type="button"
                onClick={() => { void setTripoApiKey(''); setTripoKeyInput(''); addToast('Tripo key removed from this browser', 'info') }}
                className="btn-secondary text-sm px-3"
                title="Remove the key from this browser"
              >
                Clear
              </button>
            )}
          </div>
          <a
            href="https://platform.tripo3d.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Open Tripo console / API keys
            <ExternalLink size={10} />
          </a>
          {tripoApiKey && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <span className="text-xs text-slate-400">
                {tripoBalance
                  ? `${formatCredits(tripoBalance.balance)} credits available${tripoBalance.frozen ? ` (${formatCredits(tripoBalance.frozen)} frozen)` : ''}`
                  : 'Balance not loaded'}
                {` · ${TRIPO_REGIONS[tripoRegion]?.label || 'International'} region`}
              </span>
              <button
                type="button"
                onClick={() => void handleRefreshTripoBalance()}
                disabled={isRefreshingTripo}
                className="text-xs px-3 py-2 bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 rounded-md transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 border border-cyan-500/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshingTripo ? 'animate-spin' : ''}`} />
                {isRefreshingTripo ? 'Checking…' : 'Refresh balance'}
              </button>
            </div>
          )}
        </div>

        {/* Tripo proxy */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wide">
            <Globe size={14} />
            Tripo proxy URL (optional)
          </div>
          <p className={`text-xs ${transportStatus === 'direct-blocked' ? 'text-amber-400' : 'text-slate-500'}`}>{transportCopy}</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              placeholder="https://chargen-tripo-proxy.<account>.workers.dev"
              className="input-field flex-1"
            />
            <button type="button" onClick={() => void handleSaveProxy()} className="btn-primary text-sm px-4">
              Save
            </button>
            <button
              type="button"
              onClick={() => void handleTestProxy()}
              disabled={isTestingProxy}
              className="btn-secondary text-sm px-3 disabled:opacity-50"
            >
              {isTestingProxy ? 'Testing…' : 'Test'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Tripo has no browser CORS. Deploy the Cloudflare Worker in <code className="text-slate-400">proxy/</code> (one <code className="text-slate-400">wrangler deploy</code>) and paste its URL here for the hosted build. Your key is sent per request and never stored on the Worker.
          </p>
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
            Characters, images, 3D models, and settings persist between sessions.
          </p>
        </div>

        <p className="text-[10px] text-slate-600 font-mono tabular-nums mt-6 text-center">
          CharGen.AI v{APP_VERSION}
        </p>
      </div>
    </div>
  )
}
