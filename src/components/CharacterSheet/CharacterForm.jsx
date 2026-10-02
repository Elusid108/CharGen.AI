import React from 'react'
import { Shuffle, Sparkles, Loader2, Brain } from 'lucide-react'
import { CHARACTER_SECTIONS } from '../../data/schemas'
import { useCharacterStore } from '../../hooks/useCharacter'
import { findOption } from '../../data/options'
import { compileLore, getRangeBin, getGenericAttributeDescription } from '../../utils/compileCharacter'
import { getRoleplayTip } from '../../data/definitions'
import { OCEAN_DERIVED_IDS, describeDerivation } from '../../data/options/oceanDerivation'
import FormField from './FormField'

export default function CharacterForm({ section, onContextChange }) {
  const sectionData = CHARACTER_SECTIONS[section]
  const character = useCharacterStore((s) => s.character)
  const updateField = useCharacterStore((s) => s.updateField)
  const randomizeSection = useCharacterStore((s) => s.randomizeSection)
  const enrichWithAi = useCharacterStore((s) => s.enrichWithAi)
  const rederiveFromOcean = useCharacterStore((s) => s.rederiveFromOcean)
  const isGenerating = useCharacterStore((s) => s.isGenerating)

  if (!sectionData) return null

  const handleFieldChange = (fieldId, value) => {
    updateField(fieldId, value)
    updateContext(fieldId, value)
  }

  const handleFieldHover = (fieldId) => {
    const value = character[fieldId]
    if (value !== '' && value != null) updateContext(fieldId, value)
  }

  const updateContext = (fieldId, value) => {
    const field = sectionData.fields.find((f) => f.id === fieldId)
    const preview = { ...character, [fieldId]: value }
    let title = 'Select an attribute'
    let description = compileLore(fieldId, preview)
    let tip = getRoleplayTip(fieldId, value)

    if (field?.type === 'range') {
      const bin = getRangeBin(fieldId, value)
      title = `${field.label}: ${bin.label}`
    } else if (field?.type === 'number' && fieldId === 'aging' && value !== '' && value != null) {
      const bin = getRangeBin('aging', value)
      title = `${field.label}: ${value} (${bin.label})`
    } else if (field?.type === 'number' && value !== '' && value != null) {
      title = `${field?.label || fieldId}: ${value}`
      if (!description) description = getGenericAttributeDescription()
    } else {
      const opt = findOption(fieldId, value)
      title = opt?.label || value || 'Select an attribute'
    }

    if (!description && value) {
      description = getGenericAttributeDescription()
    }

    let stats
    if (OCEAN_DERIVED_IDS.includes(fieldId)) {
      stats = describeDerivation(fieldId, preview)
      tip = `Derived from the OCEAN sliders on roll; still editable and lockable. Use "Re-derive from OCEAN" to recompute. ${tip || ''}`.trim()
    }

    onContextChange({ title, description, tip, stats })
  }

  const visibleFields = sectionData.fields.filter((field) => {
    if (!field.conditional) return true
    return character[field.conditional.field] === field.conditional.value
  })

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8 flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{sectionData.label}</h2>
          <p className="text-slate-400 text-sm">{sectionData.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {section === 'psychology' && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => rederiveFromOcean()}
              title="Recompute MBTI, Enneagram and alignment from the OCEAN sliders"
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
            >
              <Brain size={14} />
              Re-derive from OCEAN
            </button>
          )}
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void enrichWithAi({ scope: section })}
            title="Fill blank text fields in this section with Gemini"
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Enrich with AI
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => randomizeSection(section)}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Shuffle size={14} />
            Randomize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {visibleFields.map((field) => (
          <FormField
            key={field.id}
            field={field}
            value={character[field.id]}
            onChange={(value) => handleFieldChange(field.id, value)}
            onHover={() => handleFieldHover(field.id)}
            onSelectOptionHover={
              field.type === 'select'
                ? (opt) => updateContext(field.id, opt)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
