import React from 'react'
import { X } from 'lucide-react'
import { TRIPO_ENGINES, formatCredits } from '../../utils/tripoCredits'

export default function TripoConfirmModal({
  open,
  kind = 'mesh',
  title,
  description,
  engine = 'h3',
  onEngineChange,
  texture = true,
  onTextureChange,
  estimate,
  balance,
  busy = false,
  confirmLabel = 'Spend credits',
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  const available = balance?.balance
  const short = available != null && estimate != null && available < estimate

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {description ? <p className="text-xs text-slate-400 mt-1">{description}</p> : null}
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        {kind === 'mesh' && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 gap-2">
              {Object.values(TRIPO_ENGINES).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                    engine === opt.id
                      ? 'border-cyan-500/60 bg-cyan-950/30'
                      : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="tripo-engine"
                    className="mt-1"
                    checked={engine === opt.id}
                    onChange={() => onEngineChange?.(opt.id)}
                    disabled={busy}
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">{opt.label}</span>
                    <span className="block text-[11px] text-slate-400">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={texture}
                onChange={(e) => onTextureChange?.(e.target.checked)}
                disabled={busy}
              />
              Include texture / PBR (needed for games and digital use; off is cheaper print geometry)
            </label>
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-sm space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Estimated cost</span>
            <span className="text-white font-mono">~{formatCredits(estimate)} credits</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tripo balance</span>
            <span className="text-white font-mono">
              {available == null ? '—' : `${formatCredits(available)} available`}
              {balance?.frozen ? ` · ${formatCredits(balance.frozen)} frozen` : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            Failed jobs return frozen credits. Retrying a mesh you do not like costs full price again. There is no cheaper retry SKU.
          </p>
        </div>

        {short && (
          <p className="text-xs text-amber-400 mb-3">
            Balance looks lower than this estimate. Top up in the Tripo console if the request is rejected.
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm" disabled={busy}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary text-sm" disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
