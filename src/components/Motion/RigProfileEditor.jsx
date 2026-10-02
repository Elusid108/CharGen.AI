import React, { useState } from 'react'
import { Upload, Check, AlertTriangle, Trash2, X } from 'lucide-react'
import { BUILTIN_RIG_PROFILES, validateRigProfile } from '../../data/rigProfiles'
import { saveRigProfile, deleteRigProfile } from '../../utils/db'
import { useToastStore } from '../../hooks/useToast'

function stripBuiltin(profile) {
  const { builtin, updatedAt, ...rest } = profile
  return rest
}

/**
 * Paste or upload rig JSON, validate it with field-level errors, and save it to the
 * local library. Built-in presets can be loaded as a starting point.
 */
export default function RigProfileEditor({ customProfiles, onSaved, onDeleted, onClose }) {
  const addToast = useToastStore((s) => s.addToast)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [validated, setValidated] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadPreset = (profile) => {
    setText(JSON.stringify(stripBuiltin(profile), null, 2))
    setErrors([])
    setValidated(null)
  }

  const runValidate = () => {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setErrors([`Not valid JSON: ${e.message}`])
      setValidated(null)
      return null
    }
    const res = validateRigProfile(parsed)
    setErrors(res.errors)
    setValidated(res.ok ? res.profile : null)
    return res.ok ? res.profile : null
  }

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
      setErrors([])
      setValidated(null)
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    const profile = validated || runValidate()
    if (!profile) return
    if (BUILTIN_RIG_PROFILES.some((p) => p.id === profile.id)) {
      setErrors([`"${profile.id}" is a built-in id. Change \`id\` before saving a custom rig.`])
      return
    }
    setBusy(true)
    try {
      await saveRigProfile(profile)
      addToast(`Rig "${profile.name}" saved.`, 'success')
      onSaved?.(profile)
    } catch (e) {
      addToast(`Failed to save rig: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (profile) => {
    if (!window.confirm(`Delete rig "${profile.name}"?`)) return
    try {
      await deleteRigProfile(profile.id)
      addToast('Rig deleted.', 'info')
      onDeleted?.(profile)
    } catch (e) {
      addToast(`Failed to delete rig: ${e.message}`, 'error')
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Rig profile editor</h3>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Start from a preset</p>
            <div className="space-y-1">
              {BUILTIN_RIG_PROFILES.map((p) => (
                <button key={p.id} type="button" onClick={() => loadPreset(p)} className="w-full text-left text-xs px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:border-orange-500/50">
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          {customProfiles.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Your rigs</p>
              <div className="space-y-1">
                {customProfiles.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <button type="button" onClick={() => loadPreset(p)} className="flex-1 text-left text-xs px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:border-orange-500/50 truncate">
                      {p.name}
                    </button>
                    <button type="button" onClick={() => handleDelete(p)} className="text-slate-500 hover:text-red-400 p-1" title="Delete rig">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <label className="btn-secondary w-full flex items-center justify-center gap-2 text-xs cursor-pointer">
            <Upload size={13} />
            <span>Upload .json</span>
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </div>

        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setValidated(null) }}
            spellCheck={false}
            placeholder='Paste rig JSON here, or pick a preset to edit. Vocabulary ids must come from the canonical list.'
            className="input-field w-full h-72 font-mono text-[11px] leading-snug resize-y"
          />
          {errors.length > 0 && (
            <ul className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg p-2 space-y-0.5">
              {errors.map((err, i) => (
                <li key={i} className="flex gap-1.5"><AlertTriangle size={12} className="shrink-0 mt-0.5" /><span>{err}</span></li>
              ))}
            </ul>
          )}
          {validated && errors.length === 0 && (
            <p className="text-xs text-emerald-300 flex items-center gap-1.5"><Check size={12} /> Valid: {validated.name} · {validated.channels.length} channels · {validated.expressionVocabulary.filter((e) => e.supported).length} expressions · {validated.gestureVocabulary.filter((g) => g.supported).length} gestures</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={runValidate} className="btn-secondary text-xs" disabled={!text.trim()}>Validate</button>
            <button type="button" onClick={handleSave} className="btn-primary text-xs" disabled={busy || !text.trim()}>Save to library &amp; use</button>
          </div>
        </div>
      </div>
    </div>
  )
}
