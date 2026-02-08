import React, { useState, useRef } from 'react'
import { Upload, Scan, Check, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { analyzeImage } from '../../utils/api'
import { buildAnalysisPrompt } from '../../utils/api'
import { fileToBase64, base64ToDataUrl } from '../../utils/imageUtils'

export default function ImageAnalysis() {
  const apiKey = useCharacterStore(s => s.apiKey)
  const updateFields = useCharacterStore(s => s.updateFields)
  const setGeneratedImage = useCharacterStore(s => s.setGeneratedImage)
  const addToast = useToastStore(s => s.addToast)

  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedBase64, setUploadedBase64] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const dropRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file', 'warning')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setUploadedBase64(base64)
      setUploadedImage(URL.createObjectURL(file))
      setAnalysis(null)
      setError(null)
    } catch (e) {
      addToast('Failed to read image file', 'error')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropRef.current?.classList.remove('border-purple-500', 'bg-purple-500/5')

    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    dropRef.current?.classList.add('border-purple-500', 'bg-purple-500/5')
  }

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('border-purple-500', 'bg-purple-500/5')
  }

  const handleAnalyze = async () => {
    if (!apiKey) {
      addToast('Please set your API key in Settings first.', 'warning')
      return
    }
    if (!uploadedBase64) {
      addToast('Please upload an image first.', 'warning')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const prompt = buildAnalysisPrompt()
      const resultText = await analyzeImage(apiKey, uploadedBase64, prompt)

      // Try to parse JSON from the result
      let parsed
      try {
        // Handle potential markdown code fences
        const cleaned = resultText.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch {
        // Try to extract JSON from text
        const match = resultText.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
        } else {
          throw new Error('Could not parse analysis result as JSON')
        }
      }

      setAnalysis(parsed)
      addToast('Image analyzed successfully! Review the results below.', 'success')
    } catch (e) {
      setError(e.message)
      addToast('Analysis failed: ' + e.message, 'error', 5000)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApplyResults = () => {
    if (!analysis) return

    // Map analysis fields to character fields
    const updates = {}
    Object.entries(analysis).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'N/A' && value !== 'empty') {
        // Handle numeric fields
        if (key === 'muscle_def' || key === 'age') {
          const num = parseInt(value)
          if (!isNaN(num)) updates[key] = num
        } else {
          updates[key] = value
        }
      }
    })

    updateFields(updates)

    // Also save the uploaded image as the profile image
    if (uploadedBase64) {
      setGeneratedImage('profile', uploadedBase64)
    }

    addToast(`Applied ${Object.keys(updates).length} attributes to character!`, 'success')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Image Analysis</h2>
        <p className="text-slate-400 text-sm">
          Upload a character image and let AI analyze it to fill out the character sheet automatically.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {uploadedImage ? (
          <div className="space-y-4">
            <img
              src={uploadedImage}
              className="max-h-80 mx-auto rounded-lg border border-slate-700 shadow-xl"
            />
            <p className="text-slate-400 text-sm">Click or drag to replace</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload size={40} className="mx-auto text-slate-600" />
            <p className="text-slate-400">
              <span className="text-purple-400 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-600">PNG, JPG, WEBP up to 20MB</p>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      {uploadedImage && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-generate w-full flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <><div className="loader" /> Analyzing character...</>
          ) : (
            <><Scan size={18} /> Analyze Character</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/30 rounded-lg flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">Analysis Failed</p>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Check size={18} className="text-emerald-400" />
              Analysis Results
            </h3>
            <button
              onClick={handleApplyResults}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Check size={14} />
              Apply to Character
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(analysis).map(([key, value]) => {
              if (!value || value === '' || value === 'N/A' || value === 'empty') return null
              return (
                <div key={key} className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-white font-medium text-right max-w-[60%] truncate">
                    {value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
