/**
 * Pure helpers for the 3D Studio: which stored files can be shown in the viewport, how to label
 * them, and how to group them. No DOM, no three.js.
 */

import { parseFileKey } from './tripoModels'
import { PRESET_BY_ID } from './tripoEndpoints'

/** Extensions the three.js viewport can open. Archives (zip) cannot be previewed. */
export const PREVIEWABLE_EXTS = ['glb', 'gltf', 'stl', '3mf', 'fbx', 'usdz']

export function isPreviewableKey(fileKey) {
  const p = parseFileKey(fileKey)
  return !!p && PREVIEWABLE_EXTS.includes(p.ext)
}

export function fileKeyLabel(fileKey) {
  const p = parseFileKey(fileKey)
  if (!p) return String(fileKey || '')
  switch (p.family) {
    case 'mesh': return 'Mesh'
    case 'preview': return 'Preview image'
    case 'rig': return p.ext === 'fbx' ? 'Rig (FBX)' : 'Rig'
    case 'anim': return PRESET_BY_ID[p.arg]?.label || `Clip ${p.arg}`
    case 'convert': return `${p.arg} export`
    case 'lod': return `LOD ${p.arg}`
    case 'texture': return `Texture ${p.arg}`
    case 'segment': return 'Segmented'
    case 'complete': return 'Completed'
    default: return fileKey
  }
}

export const FILE_GROUP_ORDER = ['mesh', 'rig', 'anim', 'lod', 'segment', 'complete', 'texture', 'convert', 'preview']

/**
 * Viewport chips for one asset record.
 * @returns {{ key: string, label: string, family: string, ext: string, previewable: boolean, stored: boolean, bytes: number|null }[]}
 */
export function viewableFiles(record) {
  const rows = []
  for (const [key, entry] of Object.entries(record?.files || {})) {
    const p = parseFileKey(key)
    if (!p || p.family === 'preview') continue
    rows.push({
      key,
      label: fileKeyLabel(key),
      family: p.family,
      ext: p.ext,
      previewable: PREVIEWABLE_EXTS.includes(p.ext),
      stored: entry?.stored !== false,
      bytes: Number.isFinite(Number(entry?.bytes)) ? Number(entry.bytes) : null,
    })
  }
  rows.sort((a, b) => {
    const ga = FILE_GROUP_ORDER.indexOf(a.family)
    const gb = FILE_GROUP_ORDER.indexOf(b.family)
    if (ga !== gb) return ga - gb
    return a.key.localeCompare(b.key)
  })
  return rows
}

/** Which file the Studio should open first for a record (rig when present, else mesh, else first previewable). */
export function defaultViewKey(record, preferred = null) {
  const files = record?.files || {}
  if (preferred && files[preferred] && isPreviewableKey(preferred)) return preferred
  if (files['rig.glb']) return 'rig.glb'
  if (files['mesh.glb']) return 'mesh.glb'
  const first = viewableFiles(record).find((f) => f.previewable)
  return first?.key || null
}

export function formatBytes(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return '—'
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / (1024 * 1024)).toFixed(2)} MB`
}

/** Metres → display string in cm (or mm when under 1 cm). */
export function formatLength(metres) {
  const m = Number(metres)
  if (!Number.isFinite(m)) return '—'
  const cm = m * 100
  if (cm < 1) return `${(cm * 10).toFixed(1)} mm`
  if (cm < 100) return `${cm.toFixed(1)} cm`
  return `${m.toFixed(2)} m`
}

export function formatNumber(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US')
}

/** Sum of credits across an asset's jobs (falls back to the record total). */
export function assetCreditsSpent(record) {
  const jobs = Object.values(record?.jobs || {})
  const fromJobs = jobs.reduce((sum, j) => sum + (Number(j?.creditsConsumed) || 0), 0)
  if (fromJobs > 0) return fromJobs
  return Number(record?.creditsConsumed) || 0
}

/** Human status for an asset row in the list. */
export function assetStatusLabel(record) {
  if (!record) return 'Empty'
  const active = record.activeJobId ? record.jobs?.[record.activeJobId] : null
  if (active && !['success', 'failed', 'cancelled', 'expired'].includes(active.status)) {
    return `${active.label || active.kind} · ${active.status} ${Math.round(active.progress || 0)}%`
  }
  if (record.status === 'failed') return 'Failed'
  if (record.status === 'success') return 'Ready'
  if (['queued', 'running', 'uploading'].includes(record.status)) return `${record.status} ${Math.round(record.progress || 0)}%`
  return 'Not generated'
}
