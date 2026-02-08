import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, SortDesc, SortAsc, Filter, Grid, List, CheckSquare,
  Trash2, Download, X, Star, Upload as UploadIcon, Download as DownloadIcon,
  Ghost, Eye, BookMarked
} from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { getAllCharacters, deleteCharacter, deleteMultipleCharacters, saveCharacter } from '../../utils/db'
import { downloadImage, base64ToDataUrl, generateId } from '../../utils/imageUtils'
import JSZip from 'jszip'

export default function LibraryPanel() {
  const loadCharacter = useCharacterStore(s => s.loadCharacter)
  const addToast = useToastStore(s => s.addToast)

  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterSpecies, setFilterSpecies] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [fullscreenImage, setFullscreenImage] = useState(null)

  useEffect(() => {
    refreshLibrary()
  }, [])

  const refreshLibrary = async () => {
    setLoading(true)
    try {
      const data = await getAllCharacters()
      setCharacters(data)
    } catch (e) {
      addToast('Failed to load library', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Get unique species for filter
  const speciesList = useMemo(() => {
    const species = new Set(characters.map(c => c.attributes?.species).filter(Boolean))
    return Array.from(species)
  }, [characters])

  // Filter and sort
  const filteredCharacters = useMemo(() => {
    let result = [...characters]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => {
        const name = (c.name || '').toLowerCase()
        const attrs = JSON.stringify(c.attributes || {}).toLowerCase()
        return name.includes(q) || attrs.includes(q)
      })
    }

    // Filter by species
    if (filterSpecies !== 'ALL') {
      result = result.filter(c => c.attributes?.species === filterSpecies)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return (b.timestamp || 0) - (a.timestamp || 0)
      if (sortBy === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0)
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      return 0
    })

    return result
  }, [characters, searchQuery, sortBy, filterSpecies])

  const handleLoad = (char) => {
    if (selectionMode) {
      toggleSelect(char.id)
      return
    }
    loadCharacter(char)
    addToast(`Loaded "${char.name || 'character'}"`, 'info')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this character?')) return
    try {
      await deleteCharacter(id)
      setCharacters(prev => prev.filter(c => c.id !== id))
      addToast('Character deleted', 'info')
    } catch (e) {
      addToast('Failed to delete', 'error')
    }
  }

  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCharacters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCharacters.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} characters?`)) return
    try {
      await deleteMultipleCharacters(Array.from(selectedIds))
      setCharacters(prev => prev.filter(c => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
      addToast(`Deleted ${selectedIds.size} characters`, 'info')
    } catch (e) {
      addToast('Bulk delete failed', 'error')
    }
  }

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return
    try {
      const zip = new JSZip()
      const folder = zip.folder('CharGen_Characters')

      characters.filter(c => selectedIds.has(c.id)).forEach(char => {
        // Add JSON data
        const filename = (char.name || 'unnamed').replace(/\s+/g, '_')
        folder.file(`${filename}.json`, JSON.stringify(char, null, 2))

        // Add images
        if (char.generatedImages) {
          Object.entries(char.generatedImages).forEach(([type, base64]) => {
            if (base64) {
              folder.file(`${filename}_${type}.png`, base64, { base64: true })
            }
          })
        }
      })

      const blob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'chargen_export.zip'
      link.click()

      addToast('Download started!', 'success')
    } catch (e) {
      addToast('Download failed: ' + e.message, 'error')
    }
  }

  const handleExportJSON = () => {
    const data = JSON.stringify(characters, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'chargen_library.json'
    link.click()
    addToast('Library exported as JSON', 'success')
  }

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      const chars = Array.isArray(imported) ? imported : [imported]

      for (const char of chars) {
        if (!char.id) char.id = generateId()
        if (!char.timestamp) char.timestamp = Date.now()
        await saveCharacter(char)
      }

      await refreshLibrary()
      addToast(`Imported ${chars.length} character(s)!`, 'success')
    } catch (e) {
      addToast('Import failed: invalid JSON file', 'error')
    }

    // Reset file input
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loader" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Character Library</h2>
          <p className="text-slate-400 text-sm">{characters.length} characters saved locally</p>
        </div>

        <div className="flex gap-2">
          <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer">
            <UploadIcon size={14} /> Import
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>
          <button onClick={handleExportJSON} className="btn-secondary text-sm flex items-center gap-2" disabled={characters.length === 0}>
            <DownloadIcon size={14} /> Export All
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search characters..."
            className="input-field w-full pl-9 text-xs"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="input-field text-xs"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name</option>
        </select>

        {/* Filter */}
        <select
          value={filterSpecies}
          onChange={e => setFilterSpecies(e.target.value)}
          className="input-field text-xs"
        >
          <option value="ALL">All Species</option>
          {speciesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <List size={14} />
          </button>
        </div>

        {/* Selection toggle */}
        <button
          onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()) }}
          className={`p-2 rounded-lg border transition-colors ${selectionMode ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' : 'border-slate-700 text-slate-500 hover:text-white'}`}
        >
          <CheckSquare size={14} />
        </button>
      </div>

      {/* Bulk Actions */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg animate-slide-up">
          <button onClick={toggleSelectAll} className="text-xs text-purple-300 hover:text-white">
            {selectedIds.size === filteredCharacters.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-purple-200">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={handleBulkDownload} className="p-2 hover:bg-purple-500/20 rounded text-purple-200">
            <Download size={14} />
          </button>
          <button onClick={handleBulkDelete} className="p-2 hover:bg-red-500/20 rounded text-red-300">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredCharacters.length === 0 ? (
        <div className="text-center py-20">
          <Ghost size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-lg font-medium text-slate-400">
            {characters.length === 0 ? 'Library is empty' : 'No matches found'}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {characters.length === 0
              ? 'Create characters and save them to build your collection.'
              : 'Try adjusting your search or filters.'
            }
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map(char => (
            <CharacterCard
              key={char.id}
              char={char}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(char.id)}
              onSelect={() => handleLoad(char)}
              onDelete={() => handleDelete(char.id)}
              onFullscreen={(img) => setFullscreenImage(img)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredCharacters.map(char => (
            <CharacterListItem
              key={char.id}
              char={char}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(char.id)}
              onSelect={() => handleLoad(char)}
              onDelete={() => handleDelete(char.id)}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={base64ToDataUrl(fullscreenImage)}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-700"
          />
          <p className="absolute bottom-8 text-slate-500 text-sm">Click anywhere to close</p>
        </div>
      )}
    </div>
  )
}

function CharacterCard({ char, selectionMode, isSelected, onSelect, onDelete, onFullscreen }) {
  const profileImg = char.generatedImages?.profile
  const attrs = char.attributes || {}

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-800/50 border rounded-xl overflow-hidden cursor-pointer group transition-all hover:border-slate-500 ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700'
      }`}
    >
      {/* Image */}
      <div className="h-40 bg-slate-950 relative overflow-hidden">
        {profileImg ? (
          <img src={base64ToDataUrl(profileImg)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-800">
            <BookMarked size={40} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-4">
          <h3 className="text-white font-bold truncate">{char.name || 'Unnamed'}</h3>
          <p className="text-slate-400 text-xs">
            {attrs.archetype || 'Unknown'} {attrs.species ? `\u2022 ${attrs.species}` : ''}
          </p>
        </div>

        {selectionMode && (
          <div className="absolute top-3 left-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-500 bg-black/50'
            }`}>
              {isSelected && <span className="text-white text-xs">&#10003;</span>}
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500 font-mono">
            {new Date(char.timestamp || 0).toLocaleDateString()}
          </span>
          <div className="flex gap-1">
            {attrs.mbti && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-900/50">
                {attrs.mbti}
              </span>
            )}
            {attrs.alignment && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {attrs.alignment.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className="flex-1 py-2 bg-slate-700 hover:bg-blue-600 text-white text-xs rounded transition-colors"
          >
            Load
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="py-2 px-3 bg-slate-700 hover:bg-red-600 text-white text-xs rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CharacterListItem({ char, selectionMode, isSelected, onSelect, onDelete }) {
  const profileImg = char.generatedImages?.profile
  const attrs = char.attributes || {}

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-slate-800/50 ${
        isSelected ? 'border-purple-500 bg-purple-900/10' : 'border-slate-800 bg-slate-900/50'
      }`}
    >
      {selectionMode && (
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
          isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600'
        }`}>
          {isSelected && <span className="text-white text-xs">&#10003;</span>}
        </div>
      )}

      <div className="w-10 h-10 rounded bg-slate-800 overflow-hidden shrink-0">
        {profileImg ? (
          <img src={base64ToDataUrl(profileImg)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <BookMarked size={16} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{char.name || 'Unnamed'}</p>
        <p className="text-xs text-slate-500">{attrs.archetype || 'Unknown'} {attrs.species ? `\u2022 ${attrs.species}` : ''}</p>
      </div>

      <span className="text-xs text-slate-600 font-mono shrink-0">
        {new Date(char.timestamp || 0).toLocaleDateString()}
      </span>

      {!selectionMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-2 text-slate-600 hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
