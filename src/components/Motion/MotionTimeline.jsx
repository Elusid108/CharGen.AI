import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { expressionById, gestureById } from '../../data/motionVocabulary'

const LANES = [
  { track: 'expression', label: 'Expression', color: 'bg-orange-500/70 border-orange-400/60', text: 'text-orange-200' },
  { track: 'gesture', label: 'Gesture', color: 'bg-sky-500/70 border-sky-400/60', text: 'text-sky-200' },
  { track: 'pose', label: 'Pose', color: 'bg-violet-500/70 border-violet-400/60', text: 'text-violet-200' },
  { track: 'speechSync', label: 'Speech', color: 'bg-emerald-500/70 border-emerald-400/60', text: 'text-emerald-200' },
]

function labelFor(ev) {
  if (ev.track === 'expression') return expressionById(ev.id)?.label || ev.id
  if (ev.track === 'gesture' || ev.track === 'pose') return gestureById(ev.id)?.label || ev.id
  return ev.id
}

function fmt(ms) {
  return `${(ms / 1000).toFixed(1)}s`
}

/** Div-based lanes + a requestAnimationFrame scrubber. No charting library. */
export default function MotionTimeline({ script }) {
  const [playheadMs, setPlayheadMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const durationMs = Math.max(1, script?.meta?.durationMs || 1)
  const events = script?.events || []

  const lanes = useMemo(
    () => LANES.map((lane) => ({ ...lane, events: events.filter((e) => e.track === lane.track) })).filter((l) => l.events.length),
    [events],
  )

  useEffect(() => {
    setPlaying(false)
    setPlayheadMs(0)
  }, [script])

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return undefined
    }
    startRef.current = performance.now() - playheadMs
    const tick = (now) => {
      const t = now - startRef.current
      if (t >= durationMs) {
        setPlayheadMs(durationMs)
        setPlaying(false)
        return
      }
      setPlayheadMs(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, durationMs])

  const active = useMemo(() => {
    const out = {}
    for (const lane of lanes) {
      const current = lane.events.filter((e) => e.tMs <= playheadMs).at(-1)
      if (current) out[lane.track] = current
    }
    return out
  }, [lanes, playheadMs])

  if (!script) {
    return <p className="text-sm text-slate-500">No script selected.</p>
  }

  const pct = (ms) => `${Math.min(100, Math.max(0, (ms / durationMs) * 100))}%`

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (playing) setPlaying(false)
            else {
              if (playheadMs >= durationMs) setPlayheadMs(0)
              setPlaying(true)
            }
          }}
          className="btn-secondary flex items-center gap-2 text-xs px-3 py-1.5"
        >
          {playing ? <Square size={12} /> : <Play size={12} />}
          <span>{playing ? 'Stop' : 'Preview'}</span>
        </button>
        <input
          type="range"
          min={0}
          max={durationMs}
          value={Math.round(playheadMs)}
          onChange={(e) => {
            setPlaying(false)
            setPlayheadMs(Number(e.target.value))
          }}
          className="flex-1 accent-orange-500"
        />
        <span className="text-xs font-mono tabular-nums text-slate-400 w-24 text-right">
          {fmt(playheadMs)} / {fmt(durationMs)}
        </span>
      </div>

      <div className="relative rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
        {lanes.map((lane) => (
          <div key={lane.track} className="flex items-stretch border-b border-slate-800/80 last:border-b-0">
            <div className={`w-24 shrink-0 px-2 py-2 text-[11px] font-semibold uppercase tracking-wider ${lane.text} bg-slate-900/60 border-r border-slate-800`}>
              {lane.label}
            </div>
            <div className="relative flex-1 h-10">
              {lane.events.map((ev, i) => {
                const width = ev.holdMs ? Math.max(0.6, (ev.holdMs / durationMs) * 100) : 0.6
                const isActive = active[lane.track] === ev
                return (
                  <div
                    key={`${ev.tMs}-${ev.id}-${i}`}
                    title={`${labelFor(ev)} @ ${fmt(ev.tMs)}${ev.intensity != null ? ` · ${(ev.intensity * 100).toFixed(0)}%` : ''}${ev.holdMs ? ` · hold ${ev.holdMs}ms` : ''}${ev.loop ? ' · loop' : ''}`}
                    className={`absolute top-1.5 h-7 rounded border ${lane.color} ${isActive ? 'ring-2 ring-white/70' : ''} overflow-hidden`}
                    style={{ left: pct(ev.tMs), width: `${width}%`, minWidth: 6, opacity: ev.intensity != null ? 0.45 + ev.intensity * 0.55 : 1 }}
                  >
                    <span className="block px-1 text-[10px] leading-7 text-white whitespace-nowrap">{labelFor(ev)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none" style={{ left: `calc(6rem + (100% - 6rem) * ${playheadMs / durationMs})` }} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {LANES.map((lane) => {
          const ev = active[lane.track]
          if (!ev) return null
          return (
            <span key={lane.track} className={`px-2 py-1 rounded bg-slate-800/80 border border-slate-700 ${lane.text}`}>
              {lane.label}: <span className="text-white">{labelFor(ev)}</span>
              {ev.intensity != null && <span className="text-slate-400"> {(ev.intensity * 100).toFixed(0)}%</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
