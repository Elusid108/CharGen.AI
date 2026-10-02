import React from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { listSlotAssets } from '../../utils/tripoModels'
import { assetStatusLabel } from '../../utils/studioFiles'
import { formatCredits } from '../../utils/tripoCredits'

export default function HistoryList({ generatedModels, target, selectedId, onSelect, onRestore, onDelete }) {
  if (!target) return null
  const rows = listSlotAssets(generatedModels, target.slot, target.outfitId)
  if (!rows.length) return null
  return (
    <div className="space-y-1" data-testid="history-list">
      {rows.map((rec) => (
        <div key={rec.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${rec.id === selectedId ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'}`}>
          <button type="button" className="flex-1 text-left min-w-0" onClick={() => onSelect(rec.id)}>
            <span className="text-slate-200 font-mono">{rec.id.slice(0, 6)}</span>
            <span className="text-slate-500"> · {rec.archived ? 'previous' : 'current'} · {assetStatusLabel(rec)}</span>
            {rec.creditsConsumed != null ? <span className="text-slate-500"> · {formatCredits(rec.creditsConsumed)} cr</span> : null}
          </button>
          {rec.archived && (
            <button type="button" title="Make current" aria-label="Restore version" onClick={() => onRestore(rec.id)} className="text-slate-400 hover:text-cyan-300">
              <RotateCcw size={12} />
            </button>
          )}
          <button type="button" title="Delete this version and its files" aria-label="Delete version" onClick={() => onDelete(rec.id)} className="text-slate-500 hover:text-red-400">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
