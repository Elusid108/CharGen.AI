import { inferImageMime, extensionForImageMime, stripBase64Prefix } from './imageUtils'

export const MODEL_FILE_KINDS = ['glb', 'riggedGlb', 'stl', 'fbx', 'preview']

export function emptyGeneratedModels() {
  return {
    lock: null,
    mannequin: null,
    outfits: {},
  }
}

export function emptyModelRecord(partial = {}) {
  return {
    slot: 'lock',
    outfitId: null,
    source: 'multiview',
    engine: 'h3',
    texture: true,
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
  }
}

export function normalizeModelRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  const slot = raw.slot === 'mannequin' || raw.slot === 'outfit' ? raw.slot : 'lock'
  return emptyModelRecord({
    ...raw,
    slot,
    outfitId: raw.outfitId || null,
    source: raw.source === 'image' ? 'image' : 'multiview',
    engine: raw.engine === 'p1' ? 'p1' : 'h3',
    texture: raw.texture !== false,
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

export function normalizeGeneratedModels(raw) {
  const empty = emptyGeneratedModels()
  if (!raw || typeof raw !== 'object') return empty
  const outfits = {}
  if (raw.outfits && typeof raw.outfits === 'object') {
    for (const [id, rec] of Object.entries(raw.outfits)) {
      const next = normalizeModelRecord(rec)
      if (next) outfits[id] = next
    }
  }
  return {
    lock: normalizeModelRecord(raw.lock),
    mannequin: normalizeModelRecord(raw.mannequin),
    outfits,
  }
}

export function getModelRecord(generatedModels, slot, outfitId) {
  const models = normalizeGeneratedModels(generatedModels)
  if (slot === 'outfit') return models.outfits[outfitId] || null
  return models[slot] || null
}

export function setModelRecord(generatedModels, slot, outfitId, record) {
  const next = normalizeGeneratedModels(generatedModels)
  const normalized = record ? normalizeModelRecord(record) : null
  if (slot === 'outfit') {
    const outfits = { ...next.outfits }
    if (normalized) outfits[outfitId] = { ...normalized, slot: 'outfit', outfitId }
    else delete outfits[outfitId]
    return { ...next, outfits }
  }
  return { ...next, [slot]: normalized }
}

export function patchModelRecord(generatedModels, slot, outfitId, patch) {
  const current = getModelRecord(generatedModels, slot, outfitId) || emptyModelRecord({
    slot,
    outfitId: slot === 'outfit' ? outfitId : null,
  })
  return setModelRecord(generatedModels, slot, outfitId, { ...current, ...patch })
}

export function slotKey(slot, outfitId) {
  return slot === 'outfit' ? `outfit_${outfitId}` : slot
}

export function modelBlobId(characterId, slot, outfitId, kind) {
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
  if (isInFlightStatus(models.lock?.status)) jobs.push({ slot: 'lock', outfitId: null, record: models.lock })
  if (isInFlightStatus(models.mannequin?.status)) jobs.push({ slot: 'mannequin', outfitId: null, record: models.mannequin })
  for (const [outfitId, record] of Object.entries(models.outfits)) {
    if (isInFlightStatus(record?.status)) jobs.push({ slot: 'outfit', outfitId, record })
  }
  return jobs
}

export function filenameForSlot(characterName, slot, outfitName, kind) {
  const who = String(characterName || 'character').replace(/\s+/g, '_')
  const part = slot === 'outfit'
    ? `outfit_${String(outfitName || 'look').replace(/\s+/g, '_')}`
    : slot === 'mannequin' ? 'mannequin' : 'lock'
  const ext = kind === 'stl' ? 'stl' : kind === 'fbx' ? 'fbx' : kind === 'preview' ? 'jpg' : 'glb'
  const suffix = kind === 'riggedGlb' ? '_rigged' : kind === 'preview' ? '_preview' : ''
  return `${who}_${part}${suffix}.${ext}`
}
