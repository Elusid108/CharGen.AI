import React from 'react'
import { Shuffle } from 'lucide-react'
import { IMAGE_SEED_MAX, IMAGE_SEED_MIN, clampImageSeed, randomImageSeed } from '../../data/schemas'

/**
 * @param {{
 *   seed: number,
 *   onChange: (seed: number) => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function SeedControl({ seed, onChange, disabled = false, className = '' }) {
  const value = clampImageSeed(seed)

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="section-heading">Seed</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(randomImageSeed())}
          className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40"
        >
          <Shuffle size={12} /> Randomize seed
        </button>
      </div>
      <input
        type="range"
        min={IMAGE_SEED_MIN}
        max={IMAGE_SEED_MAX}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clampImageSeed(e.target.value))}
        className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
      />
      <input
        type="number"
        min={IMAGE_SEED_MIN}
        max={IMAGE_SEED_MAX}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clampImageSeed(e.target.value))}
        className="input-field w-full text-xs mt-2 tabular-nums"
      />
    </div>
  )
}
