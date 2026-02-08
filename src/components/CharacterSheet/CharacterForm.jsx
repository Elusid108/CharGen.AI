import React from 'react'
import { Shuffle } from 'lucide-react'
import { CHARACTER_SECTIONS } from '../../data/schemas'
import { useCharacterStore } from '../../hooks/useCharacter'
import { definitions, getRangeDescription, getRoleplayTip } from '../../data/definitions'
import FormField from './FormField'

export default function CharacterForm({ section, onContextChange }) {
  const sectionData = CHARACTER_SECTIONS[section]
  const character = useCharacterStore(s => s.character)
  const updateField = useCharacterStore(s => s.updateField)
  const randomizeSection = useCharacterStore(s => s.randomizeSection)

  if (!sectionData) return null

  const handleFieldChange = (fieldId, value) => {
    updateField(fieldId, value)
    updateContext(fieldId, value)
  }

  const handleFieldHover = (fieldId) => {
    const value = character[fieldId]
    if (value) updateContext(fieldId, value)
  }

  const updateContext = (fieldId, value) => {
    let title = value || 'Select an attribute'
    let description = ''
    let tip = null

    // Check definitions dictionary
    if (value && definitions[value]) {
      description = definitions[value]
    }

    // Check range descriptions
    const field = sectionData.fields.find(f => f.id === fieldId)
    if (field?.type === 'range') {
      description = getRangeDescription(fieldId, value)
      title = `${field.label}: ${value}%`
    }

    // Fallback description
    if (!description && value) {
      description = `A defining characteristic that shapes how this character exists in the world.`
    }

    // Get roleplay tip
    tip = getRoleplayTip(fieldId, value)

    onContextChange({ title, description, tip })
  }

  // Filter fields based on conditionals
  const visibleFields = sectionData.fields.filter(field => {
    if (!field.conditional) return true
    return character[field.conditional.field] === field.conditional.value
  })

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Section Header */}
      <div className="mb-8 flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{sectionData.label}</h2>
          <p className="text-slate-400 text-sm">{sectionData.description}</p>
        </div>
        <button
          onClick={() => randomizeSection(section)}
          className="text-slate-400 hover:text-blue-400 transition-colors text-sm font-mono flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700"
        >
          <Shuffle size={14} />
          Randomize
        </button>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {visibleFields.map(field => (
          <FormField
            key={field.id}
            field={field}
            value={character[field.id]}
            onChange={(value) => handleFieldChange(field.id, value)}
            onHover={() => handleFieldHover(field.id)}
          />
        ))}
      </div>
    </div>
  )
}
