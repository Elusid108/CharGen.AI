import React from 'react'
import { Bone, Clapperboard, Palette, Layers, Scissors, Puzzle, FileOutput, Printer, Package, Download, XCircle, Loader2, Globe, RefreshCw } from 'lucide-react'
import { formatCredits } from '../../utils/tripoCredits'
import { JOB_KIND_LABELS } from '../../utils/tripoJobSchemas'
import { fileKeyLabel } from '../../utils/studioFiles'
import HistoryList from './HistoryList'

const TRANSPORT_COPY = {
  'custom-proxy': { label: 'Via your proxy', tone: 'text-emerald-400' },
  'local-proxy': { label: 'Via local dev proxy', tone: 'text-emerald-400' },
  'direct-blocked': { label: 'No proxy — browsers block direct Tripo calls. Set a proxy URL in Settings.', tone: 'text-amber-400' },
}

function Action({ icon: Icon, label, hint, onClick, disabled, tone = 'default', testId }) {
  const tones = {
    default: 'border-slate-700 bg-slate-800/50 hover:border-slate-500 text-slate-200',
    primary: 'border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-100',
    danger: 'border-red-800/60 bg-red-950/30 hover:bg-red-900/40 text-red-200',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      data-testid={testId}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors disabled:opacity-40 disabled:pointer-events-none ${tones[tone]}`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        {hint ? <span className="block text-[10px] text-slate-500 truncate">{hint}</span> : null}
      </span>
    </button>
  )
}

export default function ActionRail({
  record,
  target,
  busy,
  activeJob,
  balance,
  tripoApiKey,
  transportStatus,
  viewKey,
  generatedModels,
  onJob,
  onCancel,
  onDownload,
  onExport,
  onSelectVersion,
  onRestore,
  onDelete,
  onRefreshBalance,
}) {
  const ready = record?.status === 'success' && !!record?.taskId
  const hasRig = !!record?.rig?.taskId
  const isPrint = record?.profile === 'print'
  const transport = TRANSPORT_COPY[transportStatus] || TRANSPORT_COPY['direct-blocked']
  const unstored = record ? Object.values(record.files || {}).filter((f) => !f.stored).length : 0

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4" data-testid="action-rail">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Tripo balance</span>
          <span className="font-mono text-slate-200 flex items-center gap-1">
            {tripoApiKey ? (balance ? `${formatCredits(balance.balance)} cr` : '—') : 'no key'}
            {tripoApiKey ? (
              <button type="button" onClick={onRefreshBalance} className="text-slate-500 hover:text-slate-200" aria-label="Refresh balance"><RefreshCw size={11} /></button>
            ) : null}
          </span>
        </div>
        <p className={`text-[10px] flex items-start gap-1 ${transport.tone}`}><Globe size={11} className="shrink-0 mt-0.5" />{transport.label}</p>
      </div>

      {!record ? (
        <p className="text-xs text-slate-500">Pick an asset on the left, or press + next to a source to generate one.</p>
      ) : (
        <>
          {busy && activeJob ? (
            <div className="p-3 rounded-lg border border-cyan-800/60 bg-cyan-950/30 space-y-2">
              <p className="text-xs text-cyan-100 flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{activeJob.label || JOB_KIND_LABELS[activeJob.kind]} · {activeJob.status} {Math.round(activeJob.progress || 0)}%</p>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${Math.min(100, activeJob.progress || 0)}%` }} />
              </div>
              <Action icon={XCircle} label="Cancel (client side)" hint="Tripo may still bill a task that already started." onClick={onCancel} tone="danger" testId="cancel-job" />
            </div>
          ) : null}

          {record.status === 'failed' && record.lastError ? (
            <p className="text-[11px] text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg p-2">{record.lastError}</p>
          ) : null}
          {unstored > 0 ? (
            <p className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded-lg p-2">{unstored} file{unstored > 1 ? 's' : ''} could not be stored in this browser (download links expire a few minutes after the job).</p>
          ) : null}

          <section className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Build</p>
            <Action icon={Bone} label={hasRig ? `Re-rig (${record.rig.type}, ${record.rig.spec})` : 'Rig…'} hint="Free rig-check, then 25 credits" onClick={() => onJob('rig')} disabled={!ready || busy} testId="action-rig" />
            <Action icon={Clapperboard} label={record.animations?.length ? `Animate… (${record.animations.length} clips)` : 'Animate…'} hint={hasRig ? '10 credits per preset clip' : 'Rig first'} onClick={() => onJob('retarget')} disabled={!ready || !hasRig || busy} testId="action-animate" />
            <Action icon={Palette} label={isPrint ? 'Make animation version…' : 'Re-texture…'} hint={isPrint ? 'Texture this print mesh for games' : 'New PBR texture pass, keeps geometry'} onClick={() => onJob('texture')} disabled={!ready || busy} />
            <Action icon={Layers} label={record.lods?.length ? `Build LOD… (${record.lods.length})` : 'Build LOD…'} hint="Decimate to a face budget" onClick={() => onJob('decimate')} disabled={!ready || busy} />
            <Action icon={Scissors} label="Segment parts…" hint="Split into named parts" onClick={() => onJob('segment')} disabled={!ready || busy} />
            <Action icon={Puzzle} label="Complete parts…" hint="Fill occluded geometry" onClick={() => onJob('complete')} disabled={!ready || busy} />
          </section>

          <section className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Export</p>
            <Action icon={FileOutput} label="Convert…" hint="FBX · glTF · USDZ · OBJ · STL · 3MF" onClick={() => onJob('convert')} disabled={!ready || busy} testId="action-convert" />
            <Action icon={Printer} label="Make print version…" hint="STL + 3MF, flat base, scaled to mm" onClick={() => onJob('print')} disabled={!ready || busy} testId="action-print" />
            {onExport ? <Action icon={Package} label="Export bundle…" hint="ZIP laid out for Unity / Unreal / glTF / USDZ / print" onClick={onExport} disabled={!ready} tone="primary" testId="action-export" /> : null}
            <Action icon={Download} label={viewKey ? `Download ${fileKeyLabel(viewKey)}` : 'Download file'} hint={viewKey || ''} onClick={() => onDownload(viewKey)} disabled={!viewKey} testId="action-download" />
          </section>

          <section className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Versions</p>
            <HistoryList generatedModels={generatedModels} target={target} selectedId={record.id} onSelect={onSelectVersion} onRestore={onRestore} onDelete={onDelete} />
          </section>
        </>
      )}
    </div>
  )
}
