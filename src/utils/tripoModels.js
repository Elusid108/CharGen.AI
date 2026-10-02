/**
 * 3D asset records (recordVersion 2).
 *
 * generatedModels = { lock, mannequin, concept: { current, archive[] }, outfits: { [outfitId]: {...} } }
 * Each record keeps every produced file under a validated file key:
 *   mesh.glb | preview.jpg | rig.glb | rig.fbx | anim.<presetId>.glb | convert.<FORMAT>.<ext>
 *   lod.<faceLimit>.glb | texture.<n>.glb | segment.<n>.glb | complete.<n>.glb
 * Legacy (v1) records used eight boolean kinds; `normalizeModelRecord` migrates them in place.
 */

import { inferImageMime, extensionForImageMime, stripBase64Prefix, generateId } from './imageUtils'
import { CONVERT_FORMATS, PRESET_BY_ID, TRIPO_MODELS, DEFAULT_MODEL, modelForEngine, engineForModel } from './tripoEndpoints'

export const RECORD_VERSION = 2
export const LEGACY_ASSET_ID = 'legacy'
/** Kinds the v1 schema stored; still used for legacy blob-row lookups. */
export const MODEL_FILE_KINDS = ['glb', 'riggedGlb', 'stl', 'fbx', 'preview', 'animIdle', 'animWalk', 'animRun']
export const LEGACY_FILE_KEYS = {
  glb: 'mesh.glb',
  riggedGlb: 'rig.glb',
  preview: 'preview.jpg',
  stl: 'convert.STL.stl',
  fbx: 'convert.FBX.fbx',
  animIdle: 'anim.idle.glb',
  animWalk: 'anim.walk.glb',
  animRun: 'anim.run.glb',
}
export const LEGACY_KIND_FOR_KEY = Object.fromEntries(Object.entries(LEGACY_FILE_KEYS).map(([k, v]) => [v, k]))

export const SLOTS = ['lock', 'mannequin', 'concept', 'outfit']
export const PROFILES = ['animation', 'print']
export const MESH_STATUSES = ['idle', 'uploading', 'queued', 'running', 'success', 'failed']
export const JOB_KINDS = ['mesh', 'texture', 'rig', 'retarget', 'convert', 'decimate', 'segment', 'complete']
export const JOB_STATUSES = ['uploading', 'queued', 'running', 'downloading', 'success', 'failed', 'cancelled', 'expired']
export const JOB_TERMINAL = new Set(['success', 'failed', 'cancelled', 'expired'])

const FILE_FAMILIES = ['mesh', 'preview', 'rig', 'anim', 'convert', 'lod', 'texture', 'segment', 'complete']
const FILE_EXTS = ['glb', 'gltf', 'zip', 'fbx', 'obj', 'stl', '3mf', 'usdz', 'jpg', 'png', 'webp']
export const FILE_KEY_RE = /^(mesh|preview|rig|anim|convert|lod|texture|segment|complete)(?:\.([A-Za-z0-9-]+))?\.([a-z0-9]+)$/

export function parseFileKey(key) {
  const m = FILE_KEY_RE.exec(String(key || ''))
  if (!m) return null
  return { family: m[1], arg: m[2] || null, ext: m[3] }
}

export function isValidFileKey(key) {
  const p = parseFileKey(key)
  if (!p || !FILE_EXTS.includes(p.ext)) return false
  switch (p.family) {
    case 'mesh': return !p.arg && p.ext === 'glb'
    case 'preview': return !p.arg && (p.ext === 'jpg' || p.ext === 'png' || p.ext === 'webp')
    case 'rig': return !p.arg && (p.ext === 'glb' || p.ext === 'fbx')
    case 'anim': return !!p.arg && !!PRESET_BY_ID[p.arg] && p.ext === 'glb'
    case 'convert': return !!p.arg && !!CONVERT_FORMATS[p.arg] && p.ext !== 'jpg' && p.ext !== 'png' && p.ext !== 'webp'
    case 'lod': return !!p.arg && /^\d+$/.test(p.arg) && p.ext === 'glb'
    case 'texture':
    case 'segment':
    case 'complete':
      return !!p.arg && p.ext === 'glb'
    default: return false
  }
}

export function mimeForFileKey(key) {
  const p = parseFileKey(key)
  switch (p?.ext) {
    case 'glb': return 'model/gltf-binary'
    case 'gltf': return 'model/gltf+json'
    case 'zip': return 'application/zip'
    case 'fbx': return 'application/octet-stream'
    case 'obj': return 'text/plain'
    case 'stl': return 'model/stl'
    case '3mf': return 'model/3mf'
    case 'usdz': return 'model/vnd.usdz+zip'
    case 'jpg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}

export function fileEntry(key, partial = {}) {
  const p = parseFileKey(key)
  return {
    key,
    family: p?.family || 'mesh',
    ext: p?.ext || 'glb',
    mime: partial.mime || mimeForFileKey(key),
    bytes: Number.isFinite(Number(partial.bytes)) && partial.bytes != null ? Number(partial.bytes) : null,
    taskId: partial.taskId || null,
    createdAt: Number(partial.createdAt) || Date.now(),
    stored: partial.stored !== false,
    remoteUrl: typeof partial.remoteUrl === 'string' ? partial.remoteUrl : null,
    expiresAt: Number.isFinite(Number(partial.expiresAt)) && partial.expiresAt != null ? Number(partial.expiresAt) : null,
  }
}

function normalizeFiles(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw)) {
    if (!isValidFileKey(key) || !value || typeof value !== 'object') continue
    out[key] = fileEntry(key, value)
  }
  return out
}

function isLegacyFiles(files) {
  if (!files || typeof files !== 'object') return false
  return Object.values(files).some((v) => typeof v === 'boolean')
}

function num(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

export function emptyTransform() {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
}

function normalizeTransform(raw) {
  const t = raw && typeof raw === 'object' ? raw : {}
  const vec = (v, fallback) => (Array.isArray(v) && v.length === 3 ? v.map((x) => clamp(num(x, 0), -1000, 1000)) : fallback)
  return {
    position: vec(t.position, [0, 0, 0]),
    rotation: vec(t.rotation, [0, 0, 0]),
    scale: clamp(num(t.scale, 1), 0.01, 100),
  }
}

export function emptyPrintSpec() {
  return { heightMm: 100, flattenBottom: true, pivotCenterBottom: true }
}

function normalizePrintSpec(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  return {
    heightMm: clamp(Math.round(num(p.heightMm, 100)), 10, 1000),
    flattenBottom: p.flattenBottom !== false,
    pivotCenterBottom: p.pivotCenterBottom !== false,
  }
}

function normalizeJob(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null
  return {
    id: String(raw.id),
    kind: JOB_KINDS.includes(raw.kind) ? raw.kind : 'mesh',
    label: typeof raw.label === 'string' ? raw.label : '',
    taskId: raw.taskId ? String(raw.taskId) : null,
    checkTaskId: raw.checkTaskId ? String(raw.checkTaskId) : null,
    status: JOB_STATUSES.includes(raw.status) ? raw.status : 'failed',
    progress: clamp(num(raw.progress, 0), 0, 100),
    startedAt: num(raw.startedAt, Date.now()),
    finishedAt: raw.finishedAt == null ? null : num(raw.finishedAt, null),
    params: raw.params && typeof raw.params === 'object' ? { ...raw.params } : {},
    resultKeys: Array.isArray(raw.resultKeys) ? raw.resultKeys.filter(isValidFileKey) : [],
    creditsConsumed: raw.creditsConsumed == null ? null : num(raw.creditsConsumed, null),
    error: raw.error ? String(raw.error) : null,
  }
}

export function emptySlotState() {
  return { current: null, archive: [] }
}

export function emptyGeneratedModels() {
  return {
    lock: emptySlotState(),
    mannequin: emptySlotState(),
    concept: emptySlotState(),
    outfits: {},
  }
}

export function emptyModelRecord(partial = {}) {
  const base = {
    id: partial.id || generateId(),
    recordVersion: RECORD_VERSION,
    slot: 'lock',
    outfitId: null,
    source: 'multiview',
    profile: 'animation',
    modelVersion: DEFAULT_MODEL,
    engine: 'h3',
    texture: true,
    textureQuality: 'standard',
    geometryQuality: 'standard',
    faceLimit: null,
    generation: { kind: 'multiview', options: {}, prompt: null },
    taskId: null,
    convertTasks: {},
    status: 'idle',
    progress: 0,
    lastError: null,
    creditsConsumed: null,
    files: {},
    rig: null,
    animations: [],
    lods: [],
    textureJob: null,
    lineage: null,
    transform: emptyTransform(),
    printSpec: emptyPrintSpec(),
    stats: null,
    jobs: {},
    activeJobId: null,
    createdAt: Date.now(),
    completedAt: null,
  }
  return { ...base, ...partial, recordVersion: RECORD_VERSION }
}

/** v1 record (boolean file kinds, rigTaskId, remoteUrls, previewUrl, corsBlocked) → v2 shape. */
export function migrateLegacyRecord(raw) {
  const files = {}
  const legacyFiles = raw.files && typeof raw.files === 'object' ? raw.files : {}
  const remoteUrls = raw.remoteUrls && typeof raw.remoteUrls === 'object' ? raw.remoteUrls : {}
  const created = num(raw.completedAt, null) || num(raw.createdAt, Date.now())
  for (const kind of MODEL_FILE_KINDS) {
    const key = LEGACY_FILE_KEYS[kind]
    const stored = legacyFiles[kind] === true
    const remoteUrl = remoteUrls[kind] || (kind === 'preview' ? raw.previewUrl : null) || null
    if (!stored && !remoteUrl) continue
    let taskId = raw.taskId || null
    if (kind === 'riggedGlb' || kind.startsWith('anim')) taskId = raw.rigTaskId || null
    if (kind === 'stl' || kind === 'fbx') taskId = raw.convertTasks?.[kind] || null
    files[key] = fileEntry(key, { stored, remoteUrl: stored ? null : remoteUrl, taskId, createdAt: created })
  }
  const animations = MODEL_FILE_KINDS.filter((k) => k.startsWith('anim') && files[LEGACY_FILE_KEYS[k]])
    .map((k) => {
      const id = k.replace('anim', '').toLowerCase()
      return { preset: `preset:${id}`, id, taskId: raw.rigTaskId || null, fileKey: LEGACY_FILE_KEYS[k] }
    })
  const engine = raw.engine === 'p1' ? 'p1' : 'h3'
  return {
    ...raw,
    recordVersion: RECORD_VERSION,
    modelVersion: modelForEngine(engine),
    engine,
    generation: { kind: raw.source === 'image' ? 'image' : 'multiview', options: {}, prompt: null },
    files,
    rig: raw.rigTaskId
      ? { taskId: raw.rigTaskId, checkTaskId: null, type: 'biped', spec: 'mixamo', outFormat: 'glb', riggable: true }
      : null,
    animations,
    profile: 'animation',
    jobs: {},
    activeJobId: null,
    lineage: null,
    lods: [],
    textureJob: null,
    stats: null,
  }
}

function looksLikeSlotState(raw) {
  return !!(raw && typeof raw === 'object' && ('current' in raw || Array.isArray(raw.archive)) && !raw.status && !raw.files)
}

function looksLikeRecord(raw) {
  return !!(raw && typeof raw === 'object' && (raw.status || raw.taskId || raw.files || raw.engine || raw.slot))
}

export function normalizeModelRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (looksLikeSlotState(raw)) return null
  const migrated = raw.recordVersion === RECORD_VERSION && !isLegacyFiles(raw.files) ? raw : migrateLegacyRecord(raw)
  // Drop v1-only keys and transient UI flags so they never persist on a v2 record.
  const { rigTaskId, remoteUrls, previewUrl, corsBlocked, archived, ...src } = migrated
  const slot = SLOTS.includes(src.slot) ? src.slot : 'lock'
  const modelVersion = TRIPO_MODELS[src.modelVersion] ? src.modelVersion : modelForEngine(src.engine)
  const textureQuality = src.textureQuality === 'detailed' || src.textureQuality === 'extreme' ? src.textureQuality : 'standard'
  const geometryQuality = src.geometryQuality === 'detailed' ? 'detailed' : 'standard'
  const faceLimit = src.faceLimit == null ? null : num(src.faceLimit, null)
  const jobs = {}
  if (src.jobs && typeof src.jobs === 'object') {
    for (const [id, job] of Object.entries(src.jobs)) {
      const j = normalizeJob({ ...job, id: job?.id || id })
      if (j) jobs[j.id] = j
    }
  }
  const rig = src.rig && typeof src.rig === 'object' && src.rig.taskId
    ? {
        taskId: String(src.rig.taskId),
        checkTaskId: src.rig.checkTaskId ? String(src.rig.checkTaskId) : null,
        type: String(src.rig.type || 'biped'),
        spec: src.rig.spec === 'tripo' ? 'tripo' : 'mixamo',
        outFormat: src.rig.outFormat === 'fbx' ? 'fbx' : 'glb',
        riggable: src.rig.riggable !== false,
      }
    : null
  const files = normalizeFiles(src.files)
  const animations = (Array.isArray(src.animations) ? src.animations : [])
    .filter((a) => a && typeof a === 'object' && PRESET_BY_ID[a.id] && files[a.fileKey])
    .map((a) => ({ preset: PRESET_BY_ID[a.id].preset, id: a.id, taskId: a.taskId ? String(a.taskId) : null, fileKey: a.fileKey }))
  const lods = (Array.isArray(src.lods) ? src.lods : [])
    .filter((l) => l && typeof l === 'object' && files[l.fileKey])
    .map((l) => ({ faceLimit: Math.round(num(l.faceLimit, 0)), quad: !!l.quad, taskId: l.taskId ? String(l.taskId) : null, fileKey: l.fileKey }))
  return emptyModelRecord({
    ...src,
    id: src.id || LEGACY_ASSET_ID,
    slot,
    outfitId: slot === 'outfit' ? src.outfitId || null : null,
    source: src.source === 'image' || src.source === 'text' ? src.source : 'multiview',
    profile: PROFILES.includes(src.profile) ? src.profile : 'animation',
    modelVersion,
    engine: engineForModel(modelVersion),
    texture: src.texture !== false,
    textureQuality,
    geometryQuality,
    faceLimit: Number.isFinite(faceLimit) ? faceLimit : null,
    generation: {
      kind: src.generation?.kind || (src.source === 'image' ? 'image' : src.source === 'text' ? 'text' : 'multiview'),
      options: src.generation?.options && typeof src.generation.options === 'object' ? { ...src.generation.options } : {},
      prompt: src.generation?.prompt ? String(src.generation.prompt) : null,
    },
    taskId: src.taskId ? String(src.taskId) : null,
    convertTasks: src.convertTasks && typeof src.convertTasks === 'object' ? { ...src.convertTasks } : {},
    status: MESH_STATUSES.includes(src.status) ? src.status : 'idle',
    progress: clamp(num(src.progress, 0), 0, 100),
    lastError: src.lastError ? String(src.lastError) : null,
    creditsConsumed: src.creditsConsumed == null ? null : num(src.creditsConsumed, null),
    files,
    rig,
    animations,
    lods,
    textureJob: src.textureJob && typeof src.textureJob === 'object' && src.textureJob.taskId ? { taskId: String(src.textureJob.taskId), prompt: String(src.textureJob.prompt || '') } : null,
    lineage: src.lineage && typeof src.lineage === 'object' && src.lineage.parentAssetId ? { parentAssetId: String(src.lineage.parentAssetId), op: String(src.lineage.op || 'derived') } : null,
    transform: normalizeTransform(src.transform),
    printSpec: normalizePrintSpec(src.printSpec),
    stats: src.stats && typeof src.stats === 'object' && Number.isFinite(Number(src.stats.triangles))
      ? { triangles: Math.round(num(src.stats.triangles, 0)), vertices: Math.round(num(src.stats.vertices, 0)), bounds: Array.isArray(src.stats.bounds) && src.stats.bounds.length === 3 ? src.stats.bounds.map((b) => num(b, 0)) : [0, 0, 0], computedAt: num(src.stats.computedAt, Date.now()), forFileKey: src.stats.forFileKey || 'mesh.glb' }
      : null,
    jobs,
    activeJobId: src.activeJobId && jobs[src.activeJobId] && !JOB_TERMINAL.has(jobs[src.activeJobId].status) ? src.activeJobId : null,
    createdAt: num(src.createdAt, Date.now()),
    completedAt: src.completedAt == null ? null : num(src.completedAt, null),
  })
}

export function normalizeSlotState(raw) {
  if (!raw) return emptySlotState()
  if (looksLikeSlotState(raw)) {
    const archive = Array.isArray(raw.archive) ? raw.archive.map(normalizeModelRecord).filter(Boolean) : []
    return { current: normalizeModelRecord(raw.current), archive }
  }
  if (looksLikeRecord(raw)) return { current: normalizeModelRecord(raw), archive: [] }
  return emptySlotState()
}

export function normalizeGeneratedModels(raw) {
  const empty = emptyGeneratedModels()
  if (!raw || typeof raw !== 'object') return empty
  const outfits = {}
  if (raw.outfits && typeof raw.outfits === 'object') {
    for (const [id, rec] of Object.entries(raw.outfits)) outfits[id] = normalizeSlotState(rec)
  }
  return {
    lock: normalizeSlotState(raw.lock),
    mannequin: normalizeSlotState(raw.mannequin),
    concept: normalizeSlotState(raw.concept),
    outfits,
  }
}

export function getSlotState(generatedModels, slot, outfitId) {
  const models = normalizeGeneratedModels(generatedModels)
  if (slot === 'outfit') return models.outfits[outfitId] || emptySlotState()
  return models[slot] || emptySlotState()
}

export function setSlotState(generatedModels, slot, outfitId, state) {
  const next = normalizeGeneratedModels(generatedModels)
  const normalized = {
    current: state?.current ? normalizeModelRecord(state.current) : null,
    archive: Array.isArray(state?.archive) ? state.archive.map(normalizeModelRecord).filter(Boolean) : [],
  }
  if (slot === 'outfit') {
    const outfits = { ...next.outfits }
    if (!normalized.current && !normalized.archive.length) delete outfits[outfitId]
    else outfits[outfitId] = normalized
    return { ...next, outfits }
  }
  return { ...next, [slot]: normalized }
}

export function getModelRecord(generatedModels, slot, outfitId) {
  return getSlotState(generatedModels, slot, outfitId).current
}

export function setModelRecord(generatedModels, slot, outfitId, record) {
  const state = getSlotState(generatedModels, slot, outfitId)
  return setSlotState(generatedModels, slot, outfitId, { ...state, current: record ? normalizeModelRecord(record) : null })
}

export function patchModelRecord(generatedModels, slot, outfitId, patch) {
  const current = getModelRecord(generatedModels, slot, outfitId) || emptyModelRecord({ slot, outfitId: slot === 'outfit' ? outfitId : null })
  return setModelRecord(generatedModels, slot, outfitId, { ...current, ...patch })
}

/** Patch any record (current or archived) by asset id. */
export function patchAssetRecord(generatedModels, slot, outfitId, assetId, patch) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const apply = (rec) => (rec && rec.id === assetId ? { ...rec, ...(typeof patch === 'function' ? patch(rec) : patch) } : rec)
  return setSlotState(generatedModels, slot, outfitId, {
    current: apply(state.current),
    archive: state.archive.map(apply),
  })
}

export function listSlotAssets(generatedModels, slot, outfitId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const rows = []
  if (state.current) rows.push({ ...state.current, archived: false })
  for (const rec of state.archive) rows.push({ ...rec, archived: true })
  return rows
}

/** Every record across every slot: [{ slot, outfitId, record, archived }]. */
export function listAllAssets(generatedModels) {
  const models = normalizeGeneratedModels(generatedModels)
  const out = []
  const push = (slot, outfitId, state) => {
    if (state.current) out.push({ slot, outfitId, record: state.current, archived: false })
    for (const rec of state.archive) out.push({ slot, outfitId, record: rec, archived: true })
  }
  push('lock', null, models.lock)
  push('mannequin', null, models.mannequin)
  push('concept', null, models.concept)
  for (const [outfitId, state] of Object.entries(models.outfits)) push('outfit', outfitId, state)
  return out
}

export function recordHasMesh(record) {
  return !!record?.files?.['mesh.glb'] || !!record?.files?.['preview.jpg']
}

export function hasUnstoredFiles(record) {
  return Object.values(record?.files || {}).some((f) => !f.stored)
}

export function archiveCurrentAndSet(generatedModels, slot, outfitId, nextCurrent) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const archive = [...state.archive]
  const cur = state.current
  if (cur && (cur.status === 'success' || recordHasMesh(cur))) archive.unshift(cur)
  return setSlotState(generatedModels, slot, outfitId, { current: nextCurrent, archive })
}

export function restoreArchivedRecord(generatedModels, slot, outfitId, assetId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const idx = state.archive.findIndex((row) => row.id === assetId)
  if (idx < 0) return generatedModels
  const picked = state.archive[idx]
  const archive = state.archive.filter((_, i) => i !== idx)
  if (state.current) archive.unshift(state.current)
  return setSlotState(generatedModels, slot, outfitId, { current: picked, archive })
}

export function removeAssetRecord(generatedModels, slot, outfitId, assetId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  if (state.current?.id === assetId) {
    const [first, ...rest] = state.archive
    return setSlotState(generatedModels, slot, outfitId, { current: first || null, archive: rest })
  }
  return setSlotState(generatedModels, slot, outfitId, { current: state.current, archive: state.archive.filter((row) => row.id !== assetId) })
}

export function findAssetRecord(generatedModels, slot, outfitId, assetId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  if (state.current?.id === assetId) return state.current
  return state.archive.find((row) => row.id === assetId) || null
}

export function slotKey(slot, outfitId) {
  return slot === 'outfit' ? `outfit_${outfitId}` : slot
}

export function modelBlobId(characterId, slot, outfitId, fileKey, assetId = LEGACY_ASSET_ID) {
  return `${characterId}::${slotKey(slot, outfitId)}::${assetId || LEGACY_ASSET_ID}::${fileKey}`
}

export function legacyModelBlobId(characterId, slot, outfitId, kind) {
  return `${characterId}::${slotKey(slot, outfitId)}::${kind}`
}

export function assetBlobPrefix(characterId, slot, outfitId, assetId) {
  return `${characterId}::${slotKey(slot, outfitId)}::${assetId || LEGACY_ASSET_ID}::`
}

export function lockViewsReady(generatedImages) {
  const front = generatedImages?.tpose || null
  const left = generatedImages?.side || null
  const back = generatedImages?.back || null
  const extras = [left, back].filter(Boolean).length
  return { ready: !!(front && extras >= 1), front, left, back, viewCount: (front ? 1 : 0) + extras }
}

export function base64ToImageFile(base64, filename = 'view.jpg') {
  const mime = inferImageMime(base64)
  const raw = stripBase64Prefix(base64)
  const binary = atob(raw)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const ext = extensionForImageMime(mime)
  const safe = String(filename).replace(/\.[^.]+$/, '')
  return new File([bytes], `${safe}.${ext}`, { type: mime })
}

export function isInFlightStatus(status) {
  return status === 'queued' || status === 'running' || status === 'uploading'
}

/** Every non-terminal job on any record: [{ slot, outfitId, assetId, record, job }]. */
export function findInFlightJobs(generatedModels) {
  const out = []
  for (const { slot, outfitId, record } of listAllAssets(generatedModels)) {
    for (const job of Object.values(record.jobs || {})) {
      if (!JOB_TERMINAL.has(job.status)) out.push({ slot, outfitId, assetId: record.id, record, job })
    }
    if (!Object.keys(record.jobs || {}).length && isInFlightStatus(record.status)) {
      out.push({ slot, outfitId, assetId: record.id, record, job: null })
    }
  }
  return out
}

export function safeFileStem(s) {
  return String(s || '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'asset'
}

export function assetLabel(record, outfitName) {
  if (!record) return 'asset'
  if (record.slot === 'outfit') return `outfit-${safeFileStem(outfitName || 'look').toLowerCase()}`
  return record.slot
}

/** `{Name}_{label}_{shortId}` — unique per asset version, ASCII, no spaces. */
export function assetBaseName(characterName, record, outfitName) {
  return `${safeFileStem(characterName || 'character')}_${assetLabel(record, outfitName)}_${String(record?.id || 'asset').slice(0, 6)}`
}

export function assetFileName(characterName, record, outfitName, fileKey) {
  const p = parseFileKey(fileKey) || { family: 'file', arg: null, ext: 'bin' }
  const base = assetBaseName(characterName, record, outfitName)
  const suffix = p.family === 'mesh' ? '' : p.family === 'anim' ? `@${p.arg}` : p.arg ? `_${p.family}-${p.arg}` : `_${p.family}`
  return `${base}${suffix}.${p.ext}`
}
