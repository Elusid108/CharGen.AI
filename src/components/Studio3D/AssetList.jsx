import React from 'react'
import { Plus, Loader2, AlertCircle, Archive } from 'lucide-react'
import { listSlotAssets } from '../../utils/tripoModels'
import { assetStatusLabel } from '../../utils/studioFiles'
import { profileBadge } from '../../utils/meshProfiles'

const BASE_SLOTS = [
  { slot: 'lock', label: 'Turnaround lock', hint: 'Front + side/back T-pose → multiview' },
  { slot: 'mannequin', label: 'Mannequin', hint: 'Single relaxed image' },
  { slot: 'concept', label: 'Concept (text)', hint: 'Prompt → model, no images' },
]

function isBusy(record) {
  if (!record) return false
  const job = record.activeJobId ? record.jobs?.[record.activeJobId] : null
  if (job && !['success', 'failed', 'cancelled', 'expired'].includes(job.status)) return true
  return ['queued', 'running', 'uploading'].includes(record.status)
}

function Row({ record, selected, onSelect }) {
  const busy = isBusy(record)
  const failed = record.status === 'failed'
  const badge = profileBadge(record)
  const job = record.activeJobId ? record.jobs?.[record.activeJobId] : null
  const progress = job ? job.progress : record.progress
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selected ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-transparent hover:bg-slate-800/60'}`}
      data-testid={`asset-row-${record.id}`}
    >
      <div className="flex items-center gap-2">
        {busy ? <Loader2 size={12} className="animate-spin text-cyan-400 shrink-0" /> : failed ? <AlertCircle size={12} className="text-red-400 shrink-0" /> : record.archived ? <Archive size={12} className="text-slate-500 shrink-0" /> : <span className="w-3 h-3 rounded-full bg-emerald-500/70 shrink-0" />}
        <span className="text-xs text-slate-200 truncate flex-1">{record.archived ? 'Previous version' : 'Current'} · <span className="font-mono text-slate-400">{record.id.slice(0, 6)}</span></span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.id === 'print' ? 'bg-amber-900/40 text-amber-300' : 'bg-cyan-900/40 text-cyan-300'}`}>{badge.id === 'print' ? 'Print' : 'Anim'}</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{assetStatusLabel(record)}{record.rig ? ' · rigged' : ''}{record.animations?.length ? ` · ${record.animations.length} clips` : ''}</p>
      {busy && (
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-cyan-500 transition-all" style={{ width: `${Math.min(100, progress || 0)}%` }} />
        </div>
      )}
    </button>
  )
}

export default function AssetList({ generatedModels, wardrobe, selected, onSelect, onGenerate, sourceReady }) {
  const groups = [
    ...BASE_SLOTS.map((g) => ({ ...g, outfitId: null })),
    ...(wardrobe || []).map((o) => ({ slot: 'outfit', outfitId: o.id, label: o.name || 'Look', hint: 'From this look\'s 2D image' })),
  ]
  return (
    <div className="h-full overflow-y-auto p-2 space-y-3" data-testid="asset-list">
      {groups.map((g) => {
        const rows = listSlotAssets(generatedModels, g.slot, g.outfitId)
        const ready = sourceReady(g.slot, g.outfitId)
        return (
          <div key={`${g.slot}:${g.outfitId || ''}`}>
            <div className="flex items-center justify-between px-2 mb-1">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate">{g.label}</p>
                <p className="text-[10px] text-slate-600 truncate">{ready.ok ? g.hint : ready.hint}</p>
              </div>
              <button
                type="button"
                disabled={!ready.ok}
                title={ready.ok ? 'Generate a new 3D mesh' : ready.hint}
                onClick={() => onGenerate(g.slot, g.outfitId)}
                className="h-6 w-6 flex items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:opacity-40 shrink-0"
                aria-label={`Generate 3D for ${g.label}`}
              >
                <Plus size={13} />
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="px-3 text-[11px] text-slate-600 italic">No mesh yet</p>
            ) : (
              <div className="space-y-0.5">
                {rows.map((rec) => (
                  <Row
                    key={rec.id}
                    record={rec}
                    selected={selected?.assetId === rec.id}
                    onSelect={() => onSelect({ slot: g.slot, outfitId: g.outfitId, assetId: rec.id })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
