import React, { useState } from 'react'
import { Milestone, Shuffle, Plus, Lock, Unlock, Trash2, RefreshCw, Sparkles } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { HISTORY_TAB } from '../../data/sheetTabs'
import { FIELD_BY_ID } from '../../utils/characterRoll'
import { findOption } from '../../data/options'
import { LEDGER_TONES } from '../../data/lifeEvents'
import { LEDGER_HARD_CAP } from '../../utils/ledger'

const TONE_STYLES = {
  wound: 'bg-red-500/15 text-red-300 border-red-500/30',
  loss: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  crime: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  turning: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  gift: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  bond: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  triumph: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

export function effectLabel(effect) {
  const field = FIELD_BY_ID[effect.field]
  const opt = findOption(effect.field, effect.value)
  return { field: field?.label || effect.field, value: opt?.label || effect.value }
}

function EventRow({ event, index, locked, onContext, onReroll, onToggleLock, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false)
  const effects = event.effects.map(effectLabel)
  return (
    <li
      className={`relative pl-8 pb-6 last:pb-0 ${event.locked ? '' : ''}`}
      onMouseEnter={() => onContext(event, effects)}
    >
      <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono tabular-nums text-slate-300 flex items-center justify-center">
        {event.age}
      </span>
      <div className={`rounded-xl border p-3 space-y-2 ${event.locked ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${TONE_STYLES[event.tone] || TONE_STYLES.turning}`}>{event.tone}</span>
          {editing ? (
            <input
              value={event.title}
              onChange={(e) => onEdit({ title: e.target.value })}
              className="input-field flex-1 min-w-[10rem] text-sm py-1"
            />
          ) : (
            <h3 className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{event.title}</h3>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" title="Reroll this event" onClick={onReroll} disabled={event.locked} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"><Shuffle size={13} /></button>
            <button type="button" title={event.locked ? 'Unlock' : 'Lock'} onClick={onToggleLock} className="p-1 rounded hover:bg-slate-700">
              {event.locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} className="text-slate-500" />}
            </button>
            <button type="button" title={editing ? 'Done editing' : 'Edit text'} onClick={() => setEditing((v) => !v)} className={`p-1 rounded hover:bg-slate-700 ${editing ? 'text-sky-300' : 'text-slate-400'}`}><RefreshCw size={13} className={editing ? 'rotate-90' : ''} /></button>
            <button type="button" title="Delete" onClick={onRemove} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700"><Trash2 size={13} /></button>
          </div>
        </div>
        {editing ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
            <textarea value={event.summary} onChange={(e) => onEdit({ summary: e.target.value })} rows={3} className="input-field w-full text-sm resize-y" />
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Age
              <input type="number" min={0} value={event.age} onChange={(e) => onEdit({ age: Number(e.target.value) })} className="input-field w-full text-sm mt-1" />
            </label>
            <label className="text-[10px] uppercase tracking-wider text-slate-500">Tone
              <select value={event.tone} onChange={(e) => onEdit({ tone: e.target.value })} className="input-field w-full text-sm mt-1">
                {LEDGER_TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <p className="text-sm text-slate-300 leading-relaxed">{event.summary}</p>
        )}
        {effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {effects.map((e, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-400">
                {e.field} <span className="text-slate-600">→</span> <span className="text-slate-200">{e.value}</span>
                {locked[event.effects[i].field] && <Lock size={9} className="inline ml-1 text-amber-400" />}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

export default function HistoryPanel({ onContextChange }) {
  const ledger = useCharacterStore((s) => s.ledger)
  const lockedFields = useCharacterStore((s) => s.lockedFields)
  const regenerateLedger = useCharacterStore((s) => s.regenerateLedger)
  const generateLedgerForCurrent = useCharacterStore((s) => s.generateLedgerForCurrent)
  const rerollLedgerEvent = useCharacterStore((s) => s.rerollLedgerEvent)
  const addLedgerEvent = useCharacterStore((s) => s.addLedgerEvent)
  const removeLedgerEvent = useCharacterStore((s) => s.removeLedgerEvent)
  const toggleLedgerEventLock = useCharacterStore((s) => s.toggleLedgerEventLock)
  const setLedgerEvent = useCharacterStore((s) => s.setLedgerEvent)
  const events = ledger?.events || []

  const handleContext = (event, effects) => {
    onContextChange?.({
      title: `Age ${event.age} — ${event.title}`,
      description: event.summary,
      tip: 'Reference this only when it would naturally surface; never recite it. It is why the sheet says what it says.',
      stats: effects.map((e) => ({ label: e.field, value: e.value })),
    })
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8 flex flex-wrap justify-between items-end gap-3 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2"><Milestone size={22} className="text-sky-400" /> {HISTORY_TAB.label}</h2>
          <p className="text-slate-400 text-sm">{HISTORY_TAB.description} Locked events survive regeneration; rerolling one keeps its age.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {events.length === 0 ? (
            <button type="button" onClick={() => generateLedgerForCurrent()} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
              <Sparkles size={14} /> Generate history
            </button>
          ) : (
            <>
              <button type="button" onClick={() => regenerateLedger()} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                <Shuffle size={14} /> Regenerate unlocked
              </button>
              <button type="button" onClick={() => addLedgerEvent()} disabled={events.length >= LEDGER_HARD_CAP} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50">
                <Plus size={14} /> Add event
              </button>
            </>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No history yet. Randomize All writes one automatically; for an existing character, Generate history fills only blank fields on the sheet.</p>
      ) : (
        <ol className="relative border-l border-slate-800 ml-3">
          {events.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              index={i}
              locked={lockedFields}
              onContext={handleContext}
              onReroll={() => rerollLedgerEvent(i)}
              onToggleLock={() => toggleLedgerEventLock(i)}
              onRemove={() => removeLedgerEvent(i)}
              onEdit={(patch) => setLedgerEvent(i, patch)}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
