import React from 'react'
import { Move3d, Rotate3d, Scaling, Magnet, RotateCcw, Grid3x3, Bone, Frame, Boxes, Sun, Camera } from 'lucide-react'

function Tool({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 w-8 flex items-center justify-center rounded-md border text-slate-300 transition-colors disabled:opacity-40 ${active ? 'border-cyan-500/60 bg-cyan-950/50 text-cyan-200' : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'}`}
    >
      {children}
    </button>
  )
}

export default function ViewportToolbar({ files, viewKey, onViewKey, settings, onSettings, onFrame, onResetTransform, onSnapshot, hasSkeleton }) {
  const set = (patch) => onSettings({ ...settings, ...patch })
  const gizmo = (mode) => set({ gizmoMode: settings.gizmoMode === mode ? null : mode })
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/80">
      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0" data-testid="view-chips">
        {files.length === 0 ? <span className="text-xs text-slate-500">No files yet</span> : null}
        {files.map((f) => (
          <button
            key={f.key}
            type="button"
            disabled={!f.previewable || !f.stored}
            title={!f.previewable ? 'Archive — download to use' : !f.stored ? 'Not stored in this browser' : f.key}
            onClick={() => onViewKey(f.key)}
            className={`px-2 py-1 rounded-md text-[11px] border transition-colors disabled:opacity-40 ${viewKey === f.key ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-100' : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Tool title="Move (G)" active={settings.gizmoMode === 'translate'} onClick={() => gizmo('translate')}><Move3d size={15} /></Tool>
        <Tool title="Rotate (R)" active={settings.gizmoMode === 'rotate'} onClick={() => gizmo('rotate')}><Rotate3d size={15} /></Tool>
        <Tool title="Scale (S)" active={settings.gizmoMode === 'scale'} onClick={() => gizmo('scale')}><Scaling size={15} /></Tool>
        <Tool title="Snap" active={settings.snap} onClick={() => set({ snap: !settings.snap })}><Magnet size={15} /></Tool>
        <Tool title="Reset transform" onClick={onResetTransform}><RotateCcw size={15} /></Tool>
        <span className="w-px h-5 bg-slate-700 mx-1" />
        <Tool title="Wireframe" active={settings.wireframe} onClick={() => set({ wireframe: !settings.wireframe })}><Boxes size={15} /></Tool>
        <Tool title="Skeleton" active={settings.skeleton} disabled={!hasSkeleton} onClick={() => set({ skeleton: !settings.skeleton })}><Bone size={15} /></Tool>
        <Tool title="Grid" active={settings.grid !== false} onClick={() => set({ grid: settings.grid === false })}><Grid3x3 size={15} /></Tool>
        <label className="flex items-center gap-1 text-slate-400 px-1" title="Exposure">
          <Sun size={14} />
          <input type="range" min={0.3} max={2.5} step={0.1} value={settings.exposure ?? 1} onChange={(e) => set({ exposure: Number(e.target.value) })} className="w-16" />
        </label>
        <Tool title="Frame model (F)" onClick={onFrame}><Frame size={15} /></Tool>
        <Tool title="Snapshot (PNG)" onClick={onSnapshot}><Camera size={15} /></Tool>
      </div>
    </div>
  )
}
