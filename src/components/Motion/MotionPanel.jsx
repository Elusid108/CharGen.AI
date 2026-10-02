import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Wand2, Dice5, Download, Trash2, Loader2, Cpu, FileJson, RefreshCw } from 'lucide-react'
import { saveAs } from 'file-saver'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { BUILTIN_RIG_PROFILES, DEFAULT_RIG_PROFILE, normalizeRigProfile } from '../../data/rigProfiles'
import { getAllRigProfiles } from '../../utils/db'
import { MOTION_SCENES, MAX_SCRIPT_DURATION_MS, motionScriptToJson } from '../../utils/motionScript'
import { compileMotionStyle } from '../../data/options/motionBehavior'
import MotionTimeline from './MotionTimeline'
import RigProfileEditor from './RigProfileEditor'

function safeName(s) {
  return String(s || 'character').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'character'
}

export default function MotionPanel() {
  const character = useCharacterStore((s) => s.character)
  const apiKey = useCharacterStore((s) => s.apiKey)
  const motion = useCharacterStore((s) => s.motion)
  const rigProfile = useCharacterStore((s) => s.rigProfile)
  const isGeneratingMotion = useCharacterStore((s) => s.isGeneratingMotion)
  const setRigProfile = useCharacterStore((s) => s.setRigProfile)
  const generateMotion = useCharacterStore((s) => s.generateMotion)
  const deleteMotionScript = useCharacterStore((s) => s.deleteMotionScript)
  const addToast = useToastStore((s) => s.addToast)

  const [customProfiles, setCustomProfiles] = useState([])
  const [showEditor, setShowEditor] = useState(false)
  const [sceneId, setSceneId] = useState('idle')
  const [sceneDirection, setSceneDirection] = useState('')
  const [sourceLine, setSourceLine] = useState('')
  const [durationSec, setDurationSec] = useState(8)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lastWarnings, setLastWarnings] = useState([])

  const scripts = motion?.scripts || []
  const selected = scripts[selectedIndex] || scripts[0] || null
  const activeRig = rigProfile || DEFAULT_RIG_PROFILE
  const hasKey = !!apiKey?.trim()
  const style = useMemo(() => compileMotionStyle(character), [character])

  const refreshCustom = async () => {
    try {
      const rows = await getAllRigProfiles()
      setCustomProfiles(rows.map(normalizeRigProfile))
    } catch (e) {
      console.error('getAllRigProfiles failed:', e)
    }
  }

  useEffect(() => { void refreshCustom() }, [])
  useEffect(() => { setSelectedIndex(0) }, [scripts.length])

  const allRigs = useMemo(() => [...BUILTIN_RIG_PROFILES, ...customProfiles], [customProfiles])

  const handlePickRig = (id) => {
    const found = allRigs.find((p) => p.id === id) || null
    setRigProfile(found && found.id !== DEFAULT_RIG_PROFILE.id ? found : null)
  }

  const handleGenerate = async (forceLocal) => {
    const scene = MOTION_SCENES.find((s) => s.id === sceneId)
    const result = await generateMotion({
      scene: sceneId,
      sceneDirection: sceneDirection.trim() || scene?.direction || '',
      sourceLine: sourceLine.trim(),
      durationMs: durationSec * 1000,
      forceLocal,
    })
    setLastWarnings(result.warnings || [])
    setSelectedIndex(0)
    addToast(result.source === 'llm' ? 'Motion script generated with AI.' : 'Motion script generated locally.', 'success')
  }

  const handleExport = () => {
    if (!selected) return
    const blob = new Blob([motionScriptToJson(selected)], { type: 'application/json' })
    saveAs(blob, `${safeName(character.name)}_${selected.meta.scene}_${selected.rigProfileId || 'rig'}.motion.json`)
  }

  const handleExportRig = () => {
    const { builtin, updatedAt, ...rest } = activeRig
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' })
    saveAs(blob, `${safeName(activeRig.name)}.rig.json`)
  }

  const exprCount = activeRig.expressionVocabulary.filter((e) => e.supported).length
  const gestCount = activeRig.gestureVocabulary.filter((g) => g.supported).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400"><Activity size={20} /></div>
        <div>
          <h2 className="text-lg font-semibold text-white">Motion Studio</h2>
          <p className="text-sm text-slate-400">Turn this character's personality into a timed, hardware-agnostic expression and gesture script for an animatronic rig. Export the JSON and map it to your servos later.</p>
        </div>
      </div>

      {/* Rig */}
      <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Cpu size={16} className="text-orange-400" />
          <label className="text-sm font-medium text-white">Rig profile</label>
          <select value={activeRig.id} onChange={(e) => handlePickRig(e.target.value)} className="input-field flex-1 min-w-[12rem]">
            <optgroup label="Built-in">
              {BUILTIN_RIG_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
            {customProfiles.length > 0 && (
              <optgroup label="Your rigs">
                {customProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
          </select>
          <button type="button" onClick={() => setShowEditor((v) => !v)} className="btn-secondary text-xs flex items-center gap-1.5">
            <FileJson size={13} /> {showEditor ? 'Close editor' : 'Edit / import'}
          </button>
          <button type="button" onClick={handleExportRig} className="btn-secondary text-xs flex items-center gap-1.5" title="Download this rig as JSON">
            <Download size={13} /> Rig JSON
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {activeRig.description} <span className="text-slate-500">· {activeRig.channels.length} channels · {exprCount} expressions · {gestCount} gestures · ≤{activeRig.constraints.maxEventsPerMinute}/min</span>
        </p>
        {showEditor && (
          <RigProfileEditor
            customProfiles={customProfiles}
            onClose={() => setShowEditor(false)}
            onSaved={async (profile) => {
              await refreshCustom()
              setRigProfile(profile)
              setShowEditor(false)
            }}
            onDeleted={async (profile) => {
              await refreshCustom()
              if (activeRig.id === profile.id) setRigProfile(null)
            }}
          />
        )}
      </section>

      {/* Scene + generate */}
      <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Scene</label>
              <select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="input-field w-full">
                {MOTION_SCENES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">{MOTION_SCENES.find((s) => s.id === sceneId)?.direction}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Extra direction (optional, AI only)</label>
              <input value={sceneDirection} onChange={(e) => setSceneDirection(e.target.value)} placeholder="e.g. a child just asked if they're real" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Source line (optional — adds speech-sync markers)</label>
              <textarea value={sourceLine} onChange={(e) => setSourceLine(e.target.value)} rows={2} placeholder="The line they are performing, if any." className="input-field w-full resize-y" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Duration: {durationSec}s</label>
              <input type="range" min={1} max={MAX_SCRIPT_DURATION_MS / 1000} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} className="w-full accent-orange-500" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Compiled motion style</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono tabular-nums text-slate-300">
                <span>expressiveness <b className="text-white">{style.expressivenessScore}</b></span>
                <span>stillness <b className="text-white">{style.stillnessTolerance}</b></span>
                <span>pacing ×<b className="text-white">{style.pacingMsMultiplier.toFixed(2)}</b></span>
                <span>amplitude ×<b className="text-white">{style.amplitudeMultiplier.toFixed(2)}</b></span>
                <span>gesture freq ×<b className="text-white">{style.gestureFrequencyMultiplier.toFixed(2)}</b></span>
                <span>jitter ×<b className="text-white">{style.jitterMultiplier.toFixed(2)}</b></span>
              </div>
              {style.promptNotes.length > 0 && (
                <ul className="text-slate-400 list-disc pl-4 space-y-0.5 pt-1">
                  {style.promptNotes.slice(0, 5).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={isGeneratingMotion || !hasKey} onClick={() => handleGenerate(false)} className="btn-primary flex items-center gap-2 text-sm" title={hasKey ? 'Direct the performance with Gemini' : 'Add a Google AI key in Settings to use AI generation'}>
                {isGeneratingMotion ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                <span>{isGeneratingMotion ? 'Directing…' : 'Generate with AI'}</span>
              </button>
              <button type="button" disabled={isGeneratingMotion} onClick={() => handleGenerate(true)} className="btn-secondary flex items-center gap-2 text-sm">
                <Dice5 size={14} />
                <span>Generate locally</span>
              </button>
            </div>
            {!hasKey && <p className="text-xs text-slate-500">No API key set — local generation still works from the compiled style.</p>}
            {lastWarnings.length > 0 && (
              <ul className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg p-2 space-y-0.5">
                {lastWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Scripts */}
      <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-white flex-1">Scripts <span className="text-slate-500 font-normal">({scripts.length} saved with this character)</span></h3>
          <button type="button" disabled={!selected} onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5"><Download size={13} /> Export JSON</button>
          <button type="button" disabled={!selected} onClick={() => { deleteMotionScript(selectedIndex); setSelectedIndex(0) }} className="btn-danger text-xs flex items-center gap-1.5"><Trash2 size={13} /> Delete</button>
        </div>

        {scripts.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing yet. Pick a scene and generate a script.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {scripts.map((s, i) => (
                <button
                  key={`${s.meta.generatedAt}-${i}`}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border ${i === selectedIndex ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'}`}
                >
                  {MOTION_SCENES.find((sc) => sc.id === s.meta.scene)?.label || s.meta.scene} · {(s.meta.durationMs / 1000).toFixed(0)}s · {s.events.length} ev · {s.meta.source === 'llm' ? 'AI' : 'local'}
                </button>
              ))}
            </div>
            {selected && (
              <>
                {selected.rigProfileId !== activeRig.id && (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5"><RefreshCw size={12} /> Generated for rig "{selected.rigProfileId}"; the current rig is "{activeRig.id}". Regenerate to target this rig.</p>
                )}
                {selected.meta.sourceLine && <p className="text-xs text-slate-400 italic">“{selected.meta.sourceLine}”</p>}
                <MotionTimeline script={selected} />
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-400 hover:text-white">Raw JSON</summary>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 border border-slate-800 p-3 text-[11px] text-slate-300">{motionScriptToJson(selected)}</pre>
                </details>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
