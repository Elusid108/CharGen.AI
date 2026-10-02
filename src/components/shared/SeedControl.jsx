import React from 'react'
import { Shuffle, Lock, Unlock } from 'lucide-react'
import { IMAGE_SEED_MAX, IMAGE_SEED_MIN, clampImageSeed, randomImageSeed } from '../../data/schemas'

/**
 * Seed slider + number input. Image callers use the defaults; the character seed passes
 * `compact`, `locked`/`onToggleLock`, and tolerates `seed == null` (unknown / imported).
 * @param {{
 *   seed: number | null,
 *   onChange: (seed: number | null) => void,
 *   disabled?: boolean,
 *   className?: string,
 *   label?: string,
 *   compact?: boolean,
 *   locked?: boolean,
 *   onToggleLock?: () => void,
 *   onRandomize?: () => number,
 *   emptyLabel?: string,
 * }} props
 */
export default function SeedControl({
  seed,
  onChange,
  disabled = false,
  className = '',
  label = 'Seed',
  compact = false,
  locked = false,
  onToggleLock,
  onRandomize = randomImageSeed,
  emptyLabel = '',
}) {
  const isEmpty = seed === null || seed === undefined || seed === ''
  const value = isEmpty ? '' : clampImageSeed(seed)
  const handleInput = (raw) => onChange(raw === '' ? null : clampImageSeed(raw))

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="section-heading flex items-center gap-1.5">
          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              aria-pressed={locked}
              aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
              title={locked ? 'Seed locked: Randomize All reuses it' : 'Lock seed so Randomize All reuses it'}
              className="p-0.5 rounded hover:bg-slate-800"
            >
              {locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-slate-500" />}
            </button>
          )}
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(onRandomize())}
          className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40"
        >
          <Shuffle size={12} /> {compact ? 'New' : 'Randomize seed'}
        </button>
      </div>
      {!compact && (
        <input
          type="range"
          min={IMAGE_SEED_MIN}
          max={IMAGE_SEED_MAX}
          step={1}
          value={isEmpty ? 0 : value}
          disabled={disabled}
          onChange={(e) => handleInput(e.target.value)}
          className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
        />
      )}
      <input
        type="number"
        min={IMAGE_SEED_MIN}
        max={IMAGE_SEED_MAX}
        value={value}
        placeholder={emptyLabel}
        disabled={disabled}
        onChange={(e) => handleInput(e.target.value)}
        className={`input-field w-full text-xs tabular-nums ${compact ? '' : 'mt-2'}`}
      />
    </div>
  )
}
