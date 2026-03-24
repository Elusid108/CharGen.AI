import React from 'react'
import { ChevronDown, Lock, Unlock } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'

export default function FormField({ field, value, onChange, onHover }) {
  const isWide = field.type === 'range'
  const locked = useCharacterStore((s) => !!s.lockedFields[field.id])
  const toggleLock = useCharacterStore((s) => s.toggleLock)

  return (
    <div
      className={isWide ? 'col-span-1 md:col-span-2' : 'col-span-1'}
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => toggleLock(field.id)}
          aria-pressed={locked}
          aria-label={locked ? `Unlock ${field.label}` : `Lock ${field.label}`}
          className="shrink-0 p-1 rounded-md hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          {locked ? (
            <Lock size={14} className="text-amber-400" strokeWidth={2.25} />
          ) : (
            <Unlock size={14} className="text-slate-500" strokeWidth={2} />
          )}
        </button>
        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex-1 min-w-0">
          {field.label}
        </span>
      </div>

      {field.type === 'select' && (
        <SelectField field={field} value={value} onChange={onChange} />
      )}

      {field.type === 'range' && (
        <RangeField field={field} value={value} onChange={onChange} />
      )}

      {field.type === 'text' && (
        <TextField field={field} value={value} onChange={onChange} />
      )}

      {field.type === 'number' && (
        <NumberField field={field} value={value} onChange={onChange} />
      )}
    </div>
  )
}

function SelectField({ field, value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-full appearance-none cursor-pointer pr-10"
      >
        <option value="" disabled>Select...</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <ChevronDown size={14} />
      </div>
    </div>
  )
}

function RangeField({ field, value, onChange }) {
  const min = field.min ?? 0
  const max = field.max ?? 100
  const currentValue = value ?? field.default ?? 50
  const percent = ((currentValue - min) / (max - min)) * 100

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-4 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
          <span>Low</span>
        </div>
        <span className="text-lg font-bold text-blue-400 font-mono">
          {currentValue}%
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={currentValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1"
        />
        {/* Track fill */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-500/30 rounded -translate-y-1/2 pointer-events-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 uppercase font-bold tracking-widest mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function TextField({ field, value, onChange }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder || ''}
      className="input-field w-full"
    />
  )
}

function NumberField({ field, value, onChange }) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
      placeholder={field.placeholder || ''}
      className="input-field w-full"
      min={0}
    />
  )
}
