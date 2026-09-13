import React, { useEffect, useState } from 'react'
import { Box, Download, Loader2, RefreshCw, Bone, Printer, Gamepad2 } from 'lucide-react'
import { getModelRecord, isInFlightStatus } from '../../utils/tripoModels'
import { downloadSlotFile, getSlotGlbObjectUrl, getSlotPreviewUrl } from '../../utils/tripoJobs'
import { formatCredits, RIG_CREDITS, estimateStlCredits, estimateFbxCredits } from '../../utils/tripoCredits'

let modelViewerLoader = null

function ensureModelViewer() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (customElements.get('model-viewer')) return Promise.resolve()
  if (modelViewerLoader) return modelViewerLoader
  modelViewerLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load 3D viewer'))
    document.head.appendChild(script)
  })
  return modelViewerLoader
}

export default function Model3DSlot({
  title,
  description,
  slot,
  outfitId = null,
  generatedModels,
  canGenerate,
  generateHint,
  sourceThumbs = [],
  tripoBusy,
  compact = false,
  onGenerate,
  onRetry,
  onRig,
  onStl,
  onFbx,
}) {
  const record = getModelRecord(generatedModels, slot, outfitId)
  const inFlight = isInFlightStatus(record?.status)
  const success = record?.status === 'success'
  const failed = record?.status === 'failed'
  const [preview, setPreview] = useState(null)
  const [glbUrl, setGlbUrl] = useState(null)
  const [viewerReady, setViewerReady] = useState(typeof window !== 'undefined' && !!customElements.get('model-viewer'))

  useEffect(() => {
    let cancelled = false
    const objectUrls = []
    setPreview(null)
    setGlbUrl(null)

    ;(async () => {
      const nextPreview = await getSlotPreviewUrl(slot, outfitId)
      if (cancelled) {
        if (typeof nextPreview === 'string' && nextPreview.startsWith('blob:')) URL.revokeObjectURL(nextPreview)
        return
      }
      if (typeof nextPreview === 'string') {
        if (nextPreview.startsWith('blob:')) objectUrls.push(nextPreview)
        setPreview(nextPreview)
      }

      const nextGlb = await getSlotGlbObjectUrl(slot, outfitId)
      if (cancelled) {
        if (nextGlb) URL.revokeObjectURL(nextGlb)
        return
      }
      if (nextGlb) {
        objectUrls.push(nextGlb)
        setGlbUrl(nextGlb)
        try {
          await ensureModelViewer()
          if (!cancelled) setViewerReady(true)
        } catch {
          /* still show the still */
        }
      }
    })()

    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [slot, outfitId, record?.status, record?.files?.glb, record?.files?.preview, record?.files?.riggedGlb, record?.previewUrl])

  const statusLabel = inFlight
    ? `${record?.status || 'running'} ${record?.progress || 0}%`
    : failed
      ? 'Failed'
      : success
        ? 'Ready'
        : 'Not generated'

  const actions = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={failed ? onRetry : onGenerate}
        disabled={!canGenerate || tripoBusy}
        className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
      >
        {failed ? <RefreshCw size={12} /> : <Box size={12} />}
        {failed ? 'Retry 3D (full price if it succeeds)' : success ? 'Regenerate 3D…' : 'Generate 3D…'}
      </button>

      {success && (
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2'} gap-2`}>
          <button
            type="button"
            onClick={() => void downloadSlotFile({ slot, outfitId, kind: record.files?.riggedGlb ? 'riggedGlb' : 'glb' })}
            className="py-2 px-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center justify-center gap-1"
          >
            <Download size={12} /> GLB
          </button>
          <button
            type="button"
            onClick={onRig}
            disabled={tripoBusy}
            className="py-2 px-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Bone size={12} /> Rig ~{RIG_CREDITS}
          </button>
          <button
            type="button"
            onClick={onStl}
            disabled={tripoBusy}
            className="py-2 px-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Printer size={12} /> STL ~{estimateStlCredits()}
          </button>
          <button
            type="button"
            onClick={onFbx}
            disabled={tripoBusy}
            className="py-2 px-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Gamepad2 size={12} /> FBX ~{estimateFbxCredits()}
          </button>
        </div>
      )}
      {success && record?.files?.stl && (
        <button
          type="button"
          onClick={() => void downloadSlotFile({ slot, outfitId, kind: 'stl' })}
          className="w-full text-[11px] text-slate-400 hover:text-white"
        >
          Download saved STL
        </button>
      )}
      {success && record?.files?.fbx && (
        <button
          type="button"
          onClick={() => void downloadSlotFile({ slot, outfitId, kind: 'fbx' })}
          className="w-full text-[11px] text-slate-400 hover:text-white"
        >
          Download saved FBX
        </button>
      )}
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-2 pt-2 border-t border-slate-700">
        <p className="text-[11px] text-slate-400">
          3D {statusLabel}
          {record?.creditsConsumed != null ? ` · ${formatCredits(record.creditsConsumed)} cr` : ''}
        </p>
        {record?.lastError ? <p className="text-[11px] text-red-400">{record.lastError}</p> : null}
        {!canGenerate && generateHint ? <p className="text-[11px] text-amber-400/80">{generateHint}</p> : null}
        {inFlight && (
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, record?.progress || 0)}%` }} />
          </div>
        )}
        {actions}
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-950">
        {glbUrl && viewerReady ? (
          <model-viewer
            src={glbUrl}
            camera-controls
            touch-action="pan-y"
            style={{ width: '100%', height: '100%', background: '#020617' }}
          />
        ) : preview ? (
          <img src={preview} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : sourceThumbs.length ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 p-3">
            {sourceThumbs.map((src, i) => (
              src ? (
                <img key={i} src={src} alt="" className="h-full max-w-[30%] object-contain rounded" />
              ) : null
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
            <Box size={28} className="mb-2" />
            <p className="text-xs">No 3D model</p>
          </div>
        )}
        {inFlight && (
          <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-cyan-400" size={28} />
            <p className="text-xs text-cyan-200">{statusLabel}</p>
            <div className="w-2/3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, record?.progress || 0)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {statusLabel}
            {record?.creditsConsumed != null ? ` · ${formatCredits(record.creditsConsumed)} credits used` : ''}
          </p>
          {record?.lastError ? <p className="text-[11px] text-red-400 mt-1">{record.lastError}</p> : null}
          {!canGenerate && generateHint ? <p className="text-[11px] text-amber-400/80 mt-1">{generateHint}</p> : null}
        </div>
        <div className="mt-auto">{actions}</div>
      </div>
    </div>
  )
}
