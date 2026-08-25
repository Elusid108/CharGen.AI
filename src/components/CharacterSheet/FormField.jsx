import React, { useState, useRef, useEffect, useLayoutEffect, useId } from 'react'
import { ChevronDown, Lock, Unlock } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { normalizeSelectOptions } from '../../data/options'
import { getRangeBin } from '../../utils/compileCharacter'

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

const MENU_MAX_PX = 240
const MENU_GAP_PX = 4

function getScrollParents(el) {
  const parents = []
  let node = el?.parentElement
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') parents.push(node)
    node = node.parentElement
  }
  return parents
}

function measureMenuPlacement(triggerEl, listEl) {
  const rect = triggerEl.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX
  const spaceAbove = rect.top - MENU_GAP_PX
  const needed = Math.min(listEl?.scrollHeight ?? MENU_MAX_PX, MENU_MAX_PX)

  if (spaceBelow >= needed) {
    return { openUp: false, maxHeight: null }
  }
  if (spaceAbove >= needed) {
    return { openUp: true, maxHeight: null }
  }
  const openUp = spaceAbove > spaceBelow
  return {
    openUp,
    maxHeight: Math.max(0, openUp ? spaceAbove : spaceBelow),
  }
}

function SelectField({ field, value, onChange, onOptionHover }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [openUp, setOpenUp] = useState(false)
  const [menuMaxHeight, setMenuMaxHeight] = useState(null)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()
  const options = normalizeSelectOptions(field.options)

  const selectedIndex = options.findIndex((o) => o.id === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null
  const displayLabel = selected?.label || value || 'Select...'

  const resetPlacement = () => {
    setOpenUp(false)
    setMenuMaxHeight(null)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setHighlightedIndex(-1)
    resetPlacement()
    buttonRef.current?.focus()
  }

  const openMenu = () => {
    setIsOpen(true)
    const start = selectedIndex >= 0 ? selectedIndex : 0
    setHighlightedIndex(start)
    const opt = options[start]
    if (opt) onOptionHover?.(opt.id)
  }

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
        resetPlacement()
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

  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePlacement = () => {
      const trigger = buttonRef.current
      if (!trigger) return
      const next = measureMenuPlacement(trigger, listRef.current)
      setOpenUp((prev) => (prev === next.openUp ? prev : next.openUp))
      setMenuMaxHeight((prev) => (prev === next.maxHeight ? prev : next.maxHeight))
    }

    updatePlacement()
    const scrollParents = getScrollParents(buttonRef.current)
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    scrollParents.forEach((el) => el.addEventListener('scroll', updatePlacement, { passive: true }))
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
      scrollParents.forEach((el) => el.removeEventListener('scroll', updatePlacement))
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return
    const el = document.getElementById(`${listId}-opt-${highlightedIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, highlightedIndex, listId])

  const selectOption = (opt) => {
    onChange(opt.id)
    closeMenu()
  }

  const moveHighlightTo = (nextIdx) => {
    const len = options.length
    if (len === 0) return
    const idx = Math.max(0, Math.min(nextIdx, len - 1))
    setHighlightedIndex(idx)
    const opt = options[idx]
    if (opt) onOptionHover?.(opt.id)
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
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-trigger`}
          className={`absolute left-0 right-0 z-50 max-h-60 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-800 py-1 shadow-xl ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={menuMaxHeight != null ? { maxHeight: menuMaxHeight } : undefined}
        >
          {options.map((opt, index) => {
            const isSelected = value === opt.id
            const isHighlighted = highlightedIndex === index
            return (
              <li
                key={opt.id}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  isHighlighted ? 'bg-slate-700/90 text-white' : 'text-slate-200 hover:bg-slate-700/60'
                } ${isSelected && !isHighlighted ? 'bg-slate-800 text-blue-300' : ''}`}
                onMouseEnter={() => {
                  setHighlightedIndex(index)
                  onOptionHover?.(opt.id)
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
              >
                {opt.label}
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
  const bin = getRangeBin(field.id, currentValue)

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-4 text-[10px] text-slate-600 uppercase font-bold tracking-widest">
          <span>Low</span>
        </div>
        <span className="text-right">
          <span className="block text-lg font-bold text-blue-400 font-mono leading-tight">
            {bin.label}
          </span>
          <span className="block text-[10px] text-slate-500 font-mono">{currentValue}%</span>
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
