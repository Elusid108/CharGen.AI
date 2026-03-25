import React, { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Lock, Unlock } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'

export default function FormField({ field, value, onChange, onHover, onSelectOptionHover }) {
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
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          onOptionHover={onSelectOptionHover}
        />
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

function SelectField({ field, value, onChange, onOptionHover }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const listId = useId()
  const options = field.options

  const selectedIndex = options.findIndex((o) => o === value)
  const displayLabel = value || 'Select...'

  const closeMenu = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
    buttonRef.current?.focus()
  }

  const openMenu = () => {
    setIsOpen(true)
    const start = selectedIndex >= 0 ? selectedIndex : 0
    setHighlightedIndex(start)
    const opt = options[start]
    if (opt) onOptionHover?.(opt)
  }

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return
    const el = document.getElementById(`${listId}-opt-${highlightedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, highlightedIndex, listId])

  const selectOption = (opt) => {
    onChange(opt)
    closeMenu()
  }

  const moveHighlightTo = (nextIdx) => {
    const len = options.length
    if (len === 0) return
    const idx = Math.max(0, Math.min(nextIdx, len - 1))
    setHighlightedIndex(idx)
    const opt = options[idx]
    if (opt) onOptionHover?.(opt)
  }

  const handleButtonKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault()
        closeMenu()
      }
      return
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
      }
      return
    }

    const baseIndex =
      highlightedIndex < 0
        ? (selectedIndex >= 0 ? selectedIndex : 0)
        : highlightedIndex

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveHighlightTo(baseIndex + 1)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveHighlightTo(baseIndex - 1)
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (highlightedIndex >= 0) selectOption(options[highlightedIndex])
    }
  }

  const activeDescendant =
    isOpen && highlightedIndex >= 0 ? `${listId}-opt-${highlightedIndex}` : undefined

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={`${listId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        {...(activeDescendant ? { 'aria-activedescendant': activeDescendant } : {})}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        className="input-field w-full cursor-pointer pr-10 text-left flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-slate-200' : 'text-slate-500'}>{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-800 py-1 shadow-xl"
        >
          {options.map((opt, index) => {
            const isSelected = value === opt
            const isHighlighted = highlightedIndex === index
            return (
              <li
                key={opt}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  isHighlighted ? 'bg-slate-700/90 text-white' : 'text-slate-200 hover:bg-slate-700/60'
                } ${isSelected && !isHighlighted ? 'bg-slate-800 text-blue-300' : ''}`}
                onMouseEnter={() => {
                  setHighlightedIndex(index)
                  onOptionHover?.(opt)
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
              >
                {opt}
              </li>
            )
          })}
        </ul>
      )}
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
      value={value === 0 ? 0 : value || ''}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : '')}
      placeholder={field.placeholder || ''}
      className="input-field w-full"
      {...(field.min !== undefined ? { min: field.min } : {})}
      {...(field.max !== undefined ? { max: field.max } : {})}
    />
  )
}
