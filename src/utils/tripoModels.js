import { inferImageMime, extensionForImageMime, stripBase64Prefix, generateId } from './imageUtils'

export const MODEL_FILE_KINDS = ['glb', 'riggedGlb', 'stl', 'fbx', 'preview', 'animIdle', 'animWalk', 'animRun']
export const LEGACY_ASSET_ID = 'legacy'

export function emptySlotState() {
  return { current: null, archive: [] }
}

export function emptyGeneratedModels() {
  return {
    lock: emptySlotState(),
    mannequin: emptySlotState(),
    outfits: {},
  }
}

export function emptyModelRecord(partial = {}) {
  return {
    id: partial.id || generateId(),
    slot: 'lock',
    outfitId: null,
    source: 'multiview',
    engine: 'h3',
    texture: true,
    textureQuality: 'standard',
    geometryQuality: 'standard',
    faceLimit: null,
    taskId: null,
    rigTaskId: null,
    convertTasks: {},
    status: 'idle',
    progress: 0,
    lastError: null,
    creditsConsumed: null,
    previewUrl: null,
    remoteUrls: {},
    corsBlocked: false,
    files: {
      glb: false,
      riggedGlb: false,
      stl: false,
      fbx: false,
      preview: false,
      animIdle: false,
      animWalk: false,
      animRun: false,
    },
    createdAt: Date.now(),
    completedAt: null,
    ...partial,
  }
}

function normalizeFiles(files) {
  const base = emptyModelRecord().files
  if (!files || typeof files !== 'object') return base
  return {
    glb: !!files.glb,
    riggedGlb: !!files.riggedGlb,
    stl: !!files.stl,
    fbx: !!files.fbx,
    preview: !!files.preview,
    animIdle: !!files.animIdle,
    animWalk: !!files.animWalk,
    animRun: !!files.animRun,
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
  const slot = raw.slot === 'mannequin' || raw.slot === 'outfit' ? raw.slot : 'lock'
  const textureQuality = raw.textureQuality === 'detailed' || raw.textureQuality === 'extreme'
    ? raw.textureQuality
    : 'standard'
  const geometryQuality = raw.geometryQuality === 'detailed' ? 'detailed' : 'standard'
  const faceLimit = raw.faceLimit == null ? null : Number(raw.faceLimit)
  return emptyModelRecord({
    ...raw,
    id: raw.id || LEGACY_ASSET_ID,
    slot,
    outfitId: raw.outfitId || null,
    source: raw.source === 'image' ? 'image' : 'multiview',
    engine: raw.engine === 'p1' ? 'p1' : 'h3',
    texture: raw.texture !== false,
    textureQuality,
    geometryQuality,
    faceLimit: Number.isFinite(faceLimit) ? faceLimit : null,
    taskId: raw.taskId || null,
    rigTaskId: raw.rigTaskId || null,
    convertTasks: raw.convertTasks && typeof raw.convertTasks === 'object' ? { ...raw.convertTasks } : {},
    status: typeof raw.status === 'string' ? raw.status : 'idle',
    progress: Number(raw.progress) || 0,
    lastError: raw.lastError || null,
    creditsConsumed: raw.creditsConsumed == null ? null : Number(raw.creditsConsumed),
    previewUrl: raw.previewUrl || null,
    remoteUrls: raw.remoteUrls && typeof raw.remoteUrls === 'object' ? { ...raw.remoteUrls } : {},
    corsBlocked: !!raw.corsBlocked,
    files: normalizeFiles(raw.files),
    createdAt: Number(raw.createdAt) || Date.now(),
    completedAt: raw.completedAt == null ? null : Number(raw.completedAt),
  })
}

export function normalizeSlotState(raw) {
  if (!raw) return emptySlotState()
  if (looksLikeSlotState(raw)) {
    const archive = Array.isArray(raw.archive)
      ? raw.archive.map(normalizeModelRecord).filter(Boolean)
      : []
    return {
      current: normalizeModelRecord(raw.current),
      archive,
    }
  }
  if (looksLikeRecord(raw)) {
    return { current: normalizeModelRecord(raw), archive: [] }
  }
  return emptySlotState()
}

export function normalizeGeneratedModels(raw) {
  const empty = emptyGeneratedModels()
  if (!raw || typeof raw !== 'object') return empty
  const outfits = {}
  if (raw.outfits && typeof raw.outfits === 'object') {
    for (const [id, rec] of Object.entries(raw.outfits)) {
      outfits[id] = normalizeSlotState(rec)
    }
  }
  return {
    lock: normalizeSlotState(raw.lock),
    mannequin: normalizeSlotState(raw.mannequin),
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
  return setSlotState(generatedModels, slot, outfitId, {
    ...state,
    current: record ? normalizeModelRecord(record) : null,
  })
}

export function patchModelRecord(generatedModels, slot, outfitId, patch) {
  const current = getModelRecord(generatedModels, slot, outfitId) || emptyModelRecord({
    slot,
    outfitId: slot === 'outfit' ? outfitId : null,
  })
  return setModelRecord(generatedModels, slot, outfitId, { ...current, ...patch })
}

export function listSlotAssets(generatedModels, slot, outfitId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const rows = []
  if (state.current) rows.push({ ...state.current, archived: false })
  for (const rec of state.archive) rows.push({ ...rec, archived: true })
  return rows
}

export function archiveCurrentAndSet(generatedModels, slot, outfitId, nextCurrent) {
  const state = getSlotState(generatedModels, slot, outfitId)
  const archive = [...state.archive]
  const cur = state.current
  if (cur && (cur.status === 'success' || cur.files?.glb || cur.files?.preview)) {
    archive.unshift(cur)
  }
  return setSlotState(generatedModels, slot, outfitId, {
    current: nextCurrent,
    archive,
  })
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
  return setSlotState(generatedModels, slot, outfitId, {
    current: state.current,
    archive: state.archive.filter((row) => row.id !== assetId),
  })
}

export function findAssetRecord(generatedModels, slot, outfitId, assetId) {
  const state = getSlotState(generatedModels, slot, outfitId)
  if (state.current?.id === assetId) return state.current
  return state.archive.find((row) => row.id === assetId) || null
}

export function slotKey(slot, outfitId) {
  return slot === 'outfit' ? `outfit_${outfitId}` : slot
}

export function modelBlobId(characterId, slot, outfitId, kind, assetId = LEGACY_ASSET_ID) {
  return `${characterId}::${slotKey(slot, outfitId)}::${assetId || LEGACY_ASSET_ID}::${kind}`
}

export function legacyModelBlobId(characterId, slot, outfitId, kind) {
  return `${characterId}::${slotKey(slot, outfitId)}::${kind}`
}

export function lockViewsReady(generatedImages) {
  const front = generatedImages?.tpose || null
  const left = generatedImages?.side || null
  const back = generatedImages?.back || null
  const extras = [left, back].filter(Boolean).length
  return {
    ready: !!(front && extras >= 1),
    front,
    left,
    back,
    viewCount: (front ? 1 : 0) + extras,
  }
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

export function findInFlightJobs(generatedModels) {
  const models = normalizeGeneratedModels(generatedModels)
  const jobs = []
  if (isInFlightStatus(models.lock?.current?.status)) {
    jobs.push({ slot: 'lock', outfitId: null, record: models.lock.current })
  }
  if (isInFlightStatus(models.mannequin?.current?.status)) {
    jobs.push({ slot: 'mannequin', outfitId: null, record: models.mannequin.current })
  }
  for (const [outfitId, state] of Object.entries(models.outfits)) {
    if (isInFlightStatus(state?.current?.status)) jobs.push({ slot: 'outfit', outfitId, record: state.current })
  }
  return jobs
}

export function filenameForSlot(characterName, slot, outfitName, kind) {
  const who = String(characterName || 'character').replace(/\s+/g, '_')
  const part = slot === 'outfit'
    ? `outfit_${String(outfitName || 'look').replace(/\s+/g, '_')}`
    : slot === 'mannequin' ? 'mannequin' : 'lock'
  const ext = kind === 'stl' ? 'stl' : kind === 'fbx' ? 'fbx' : kind === 'preview' ? 'jpg' : 'glb'
  const suffix = kind === 'riggedGlb'
    ? '_rigged'
    : kind === 'preview'
      ? '_preview'
      : kind === 'animIdle'
        ? '_idle'
        : kind === 'animWalk'
          ? '_walk'
          : kind === 'animRun'
            ? '_run'
            : ''
  return `${who}_${part}${suffix}.${ext}`
}
