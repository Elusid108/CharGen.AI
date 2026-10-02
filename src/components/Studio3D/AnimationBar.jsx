import React from 'react'
import { Play, Pause, Square, Repeat } from 'lucide-react'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2]

export default function AnimationBar({ clips, playback, onPlay, onPause, onStop, onSeek, onSpeed, onLoop }) {
  if (!clips?.length) {
    return (
      <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900/80 text-[11px] text-slate-500">
        No animation clips in this file. Rig the mesh, then Animate to add preset clips.
      </div>
    )
  }
  const { clip, time = 0, duration = 0, playing, speed = 1, loop = true } = playback || {}
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-800 bg-slate-900/80" data-testid="animation-bar">
      <select className="input-field text-xs !py-1 !w-auto min-w-[120px]" value={clip || ''} onChange={(e) => onPlay(e.target.value)} aria-label="Clip">
        {clips.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.duration.toFixed(2)}s)</option>)}
      </select>
      <button type="button" className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500" onClick={() => (playing ? onPause() : onPlay(clip))} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button type="button" className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500" onClick={onStop} aria-label="Stop">
        <Square size={13} />
      </button>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        value={Math.min(time, duration || 1)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 min-w-[120px]"
        aria-label="Scrub"
      />
      <span className="font-mono text-[11px] text-slate-400 tabular-nums w-24 text-right">{time.toFixed(2)} / {duration.toFixed(2)}s</span>
      <select className="input-field text-xs !py-1 !w-auto" value={speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Speed">
        {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
      </select>
      <button type="button" aria-pressed={loop} className={`h-7 w-7 flex items-center justify-center rounded-md border ${loop ? 'border-cyan-500/60 bg-cyan-950/50 text-cyan-200' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`} onClick={() => onLoop(!loop)} aria-label="Loop" title="Loop">
        <Repeat size={14} />
      </button>
    </div>
  )
}
