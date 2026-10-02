import React, { useEffect, useState } from 'react'
import { Box, Loader2, RefreshCw, Maximize2, Printer, Gamepad2 } from 'lucide-react'
import { useUiStore } from '../../hooks/useUi'
import { getModelRecord } from '../../utils/tripoModels'
import { getAssetFileUrl } from '../../utils/tripoJobs'
import { assetStatusLabel, assetCreditsSpent } from '../../utils/studioFiles'
import { formatCredits } from '../../utils/tripoCredits'
import { profileBadge } from '../../utils/meshProfiles'

/**
 * Entry card used by the Generation Studio and the Wardrobe: shows the current mesh for a slot,
 * starts a (confirmed) generation, and jumps to the 3D Studio. No viewer here — the Studio owns it.
 */
export default function Model3DCard({
  title,
  description,
  slot,
  outfitId = null,
  generatedModels,
  canGenerate,
  generateHint,
  sourceThumbs = [],
  compact = false,
  onGenerate,
}) {
  const focusStudio = useUiStore((s) => s.focusStudio)
  const record = getModelRecord(generatedModels, slot, outfitId)
  const active = record?.activeJobId ? record.jobs?.[record.activeJobId] : null
  const inFlight = !!(active && !['success', 'failed', 'cancelled', 'expired'].includes(active.status)) || ['queued', 'running', 'uploading'].includes(record?.status)
  const success = record?.status === 'success'
  const failed = record?.status === 'failed'
  const [preview, setPreview] = useState(null)
  const previewEntry = record?.files?.['preview.jpg']

  useEffect(() => {
    let cancelled = false
    let url = null
    setPreview(null)
    if (!record?.id || !previewEntry) return undefined
    getAssetFileUrl({ slot, outfitId, assetId: record.id, fileKey: 'preview.jpg' }).then((u) => {
      if (cancelled) {
        if (u && u.startsWith('blob:')) URL.revokeObjectURL(u)
        return
      }
      url = u
      setPreview(u)
    }).catch(() => {})
    return () => {
      cancelled = true
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, outfitId, record?.id, previewEntry?.stored, previewEntry?.taskId])

  const statusLabel = assetStatusLabel(record)
  const badge = record ? profileBadge(record) : null
  const open = () => focusStudio({ slot, outfitId, assetId: record?.id || null })

  const actions = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onGenerate('animation')}
          disabled={!canGenerate || inFlight}
          className="py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          data-testid={`gen3d-${slot}-animation`}
        >
          {failed ? <RefreshCw size={12} /> : <Gamepad2 size={12} />}
          {success ? 'New game mesh…' : 'Game mesh…'}
        </button>
        <button
          type="button"
          onClick={() => onGenerate('print')}
          disabled={!canGenerate || inFlight}
          className="py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          data-testid={`gen3d-${slot}-print`}
        >
          <Printer size={12} />
          {success ? 'New print mesh…' : 'Print mesh…'}
        </button>
      </div>
      <button
        type="button"
        onClick={open}
        className="w-full py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
        data-testid={`open3d-${slot}`}
      >
        <Maximize2 size={12} /> Open in 3D Studio
      </button>
    </div>
  )

  const meta = (
    <p className="text-[11px] text-slate-400">
      {statusLabel}
      {badge ? ` · ${badge.label}` : ''}
      {record && assetCreditsSpent(record) ? ` · ${formatCredits(assetCreditsSpent(record))} cr` : ''}
      {record?.rig ? ' · rigged' : ''}
      {record?.animations?.length ? ` · ${record.animations.length} clips` : ''}
    </p>
  )

  if (compact) {
    return (
      <div className="space-y-2 pt-2 border-t border-slate-700">
        {meta}
        {record?.lastError ? <p className="text-[11px] text-red-400">{record.lastError}</p> : null}
        {!canGenerate && generateHint ? <p className="text-[11px] text-amber-400/80">{generateHint}</p> : null}
        {inFlight && (
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (active?.progress ?? record?.progress) || 0)}%` }} />
          </div>
        )}
        {actions}
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-950">
        {preview ? (
          <img src={preview} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : sourceThumbs.length ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 p-3">
            {sourceThumbs.map((s, i) => (s ? <img key={i} src={s} alt="" className="h-full max-w-[30%] object-contain rounded" /> : null))}
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
              <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (active?.progress ?? record?.progress) || 0)}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
          <div className="mt-1">{meta}</div>
          {record?.lastError ? <p className="text-[11px] text-red-400 mt-1">{record.lastError}</p> : null}
          {!canGenerate && generateHint ? <p className="text-[11px] text-amber-400/80 mt-1">{generateHint}</p> : null}
        </div>
        <div className="mt-auto">{actions}</div>
      </div>
    </div>
  )
}
