import React, { useEffect, useMemo, useState } from 'react'
import { Box, Download, Loader2, RotateCcw, Trash2, X, Play } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import {
  findAssetRecord,
  getModelRecord,
  listSlotAssets,
} from '../../utils/tripoModels'
import {
  deleteModelVersion,
  downloadSlotFile,
  getAssetBlobUrl,
  restoreModelVersion,
} from '../../utils/tripoJobs'
import { formatCredits, LOCOMOTION_CLIPS, RETARGET_CREDITS } from '../../utils/tripoCredits'
import { ensureModelViewer } from '../../utils/modelViewer'
import Model3DStlPreview from './Model3DStlPreview'

function qualityLabel(record) {
  if (!record) return ''
  const bits = [record.engine === 'p1' ? 'P1' : 'H3']
  if (record.engine === 'p1' && record.faceLimit) bits.push(`${record.faceLimit} faces`)
  if (record.engine !== 'p1') {
    if (record.texture) bits.push(record.textureQuality || 'standard')
    else bits.push('no texture')
    if (record.geometryQuality === 'detailed') bits.push('HD geo')
  }
  return bits.join(' · ')
}

export default function Model3DViewerModal({
  open,
  slot,
  outfitId = null,
  initialMode = 'mesh',
  busy = false,
  onClose,
  onRig,
  onStl,
  onFbx,
  onRetarget,
}) {
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const [assetId, setAssetId] = useState(null)
  const [mode, setMode] = useState(initialMode)
  const [clip, setClip] = useState('idle')
  const [autoRotate, setAutoRotate] = useState(false)
  const [viewerReady, setViewerReady] = useState(typeof window !== 'undefined' && !!customElements.get('model-viewer'))
  const [src, setSrc] = useState(null)
  const [kind, setKind] = useState('glb')

  const history = useMemo(
    () => (open ? listSlotAssets(generatedModels, slot, outfitId) : []),
    [open, generatedModels, slot, outfitId],
  )
  const current = getModelRecord(generatedModels, slot, outfitId)
  const viewingId = assetId || current?.id
  const record = viewingId
    ? findAssetRecord(generatedModels, slot, outfitId, viewingId) || current
    : current
  const isCurrent = record && current && record.id === current.id

  useEffect(() => {
    if (!open) return
    setAssetId(current?.id || null)
    setMode(initialMode || 'mesh')
    setClip('idle')
  }, [open, slot, outfitId, initialMode, current?.id])

  useEffect(() => {
    if (!open || !record) {
      setSrc(null)
      return undefined
    }
    let cancelled = false
    let objectUrl = null
    const files = record.files || {}
    const nextKind = mode === 'stl'
      ? 'stl'
      : mode === 'animations'
        ? (LOCOMOTION_CLIPS.find((c) => c.id === clip)?.kind || 'animIdle')
        : mode === 'rigged'
          ? 'riggedGlb'
          : 'glb'

    setKind(nextKind)
    ;(async () => {
      const url = await getAssetBlobUrl({
        slot,
        outfitId,
        kind: nextKind,
        assetId: record.id,
      })
      if (cancelled) {
        if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url)
        return
      }
      if (typeof url === 'string' && url.startsWith('blob:')) objectUrl = url
      setSrc(url)
      if (nextKind !== 'stl' && url) {
        try {
          await ensureModelViewer()
          if (!cancelled) setViewerReady(true)
        } catch { /* still show empty */ }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, slot, outfitId, record?.id, mode, clip, filesStamp(record)])

  useEffect(() => {
    if (open && !record) onClose?.()
  }, [open, record, onClose])

  if (!open || !record) return null

  const files = record.files || {}
  const modes = [
    files.glb && { id: 'mesh', label: 'Mesh' },
    files.riggedGlb && { id: 'rigged', label: 'Rigged' },
    (files.animIdle || files.animWalk || files.animRun) && { id: 'animations', label: 'Animations' },
    files.stl && { id: 'stl', label: 'STL' },
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-[55] bg-black/85 flex items-center justify-center p-3 md:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Box size={18} className="text-cyan-400" />
              3D viewer
            </h3>
            <p className="text-[11px] text-slate-500">
              {qualityLabel(record)}
              {record.creditsConsumed != null ? ` · ${formatCredits(record.creditsConsumed)} credits` : ''}
              {isCurrent ? ' · current' : ' · archive'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_220px]">
          <div className="relative bg-slate-950 min-h-[280px]">
            {mode === 'stl' && src ? (
              <Model3DStlPreview blobUrl={src} />
            ) : src && viewerReady && kind !== 'stl' ? (
              <model-viewer
                src={src}
                camera-controls="true"
                touch-action="pan-y"
                autoplay={mode === 'animations' ? 'true' : undefined}
                auto-rotate={autoRotate ? 'true' : undefined}
                shadow-intensity="0.6"
                style={{ width: '100%', height: '100%', background: '#020617' }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                {busy ? <Loader2 className="animate-spin text-cyan-400 mb-2" /> : <Box size={32} className="mb-2" />}
                <p className="text-xs">{busy ? 'Working…' : 'No 3D file for this view yet'}</p>
              </div>
            )}
          </div>

          <aside className="border-t md:border-t-0 md:border-l border-slate-800 p-3 overflow-y-auto space-y-4">
            {modes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`text-[11px] px-2 py-1 rounded-md border ${
                      mode === m.id
                        ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-200'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {mode === 'animations' && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Clip</p>
                <div className="flex flex-wrap gap-1">
                  {LOCOMOTION_CLIPS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!files[c.kind]}
                      onClick={() => setClip(c.id)}
                      className={`text-[11px] px-2 py-1 rounded-md border disabled:opacity-40 ${
                        clip === c.id
                          ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-200'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
              Auto-rotate
            </label>

            {isCurrent && (
              <div className="space-y-1.5">
                <button type="button" onClick={onRig} disabled={busy} className="w-full text-[11px] py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50">
                  Mixamo rig
                </button>
                <button
                  type="button"
                  onClick={() => onRetarget?.(['idle', 'walk', 'run'])}
                  disabled={busy || !files.riggedGlb}
                  className="w-full text-[11px] py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Play size={12} /> Idle / walk / run · {RETARGET_CREDITS * 3} cr
                </button>
                <button type="button" onClick={onStl} disabled={busy} className="w-full text-[11px] py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50">
                  STL for print
                </button>
                <button type="button" onClick={onFbx} disabled={busy} className="w-full text-[11px] py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50">
                  FBX export
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void downloadSlotFile({ slot, outfitId, kind, assetId: record.id })}
              className="w-full text-[11px] py-1.5 rounded-md bg-cyan-700/30 text-cyan-100 hover:bg-cyan-700/50 flex items-center justify-center gap-1"
            >
              <Download size={12} /> Download this file
            </button>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">History</p>
              <div className="space-y-2">
                {history.map((row) => (
                  <div
                    key={row.id}
                    className={`p-2 rounded-lg border text-[11px] ${
                      row.id === viewingId ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-slate-800 bg-slate-800/40'
                    }`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => setAssetId(row.id)}>
                      <span className="block text-slate-200">
                        {new Date(row.completedAt || row.createdAt).toLocaleString()}
                      </span>
                      <span className="block text-slate-500">{qualityLabel(row)}{row.archived ? ' · archived' : ''}</span>
                    </button>
                    <div className="flex gap-1 mt-1">
                      {row.archived && (
                        <button
                          type="button"
                          onClick={() => void restoreModelVersion({ slot, outfitId, assetId: row.id })}
                          className="flex-1 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
                        >
                          <RotateCcw size={11} className="inline mr-1" /> Restore
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteModelVersion({ slot, outfitId, assetId: row.id })}
                        className="flex-1 py-1 rounded bg-slate-700 text-red-300 hover:bg-slate-600"
                      >
                        <Trash2 size={11} className="inline mr-1" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!history.length && <p className="text-slate-600">No saved meshes yet.</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function filesStamp(record) {
  const files = record?.files || {}
  return MODEL_FILE_STAMP_KEYS.map((k) => (files[k] ? '1' : '0')).join('')
}

const MODEL_FILE_STAMP_KEYS = ['glb', 'riggedGlb', 'stl', 'fbx', 'preview', 'animIdle', 'animWalk', 'animRun']
