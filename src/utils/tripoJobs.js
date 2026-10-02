/**
 * Deliberate Tripo jobs. Every function here bills credits (except rig-check and local helpers)
 * and is only ever invoked from a confirmed options dialog — never from Generate All or wardrobe auto-2D.
 */

import { createTripoTask, extractArtifactUrls, openArtifactInTab, saveBlobFile, TripoApiError, uploadTripoFile, waitForTripoTask } from './tripo'
import {
  TRIPO_ROUTES,
  CONVERT_FORMATS,
  PRESET_BY_ID,
  DEFAULT_MODEL,
  TRIPO_MODELS,
  engineForModel,
  buildImageToModelPayload,
  buildMultiviewPayload,
  buildTextToModelPayload,
  buildTexturePayload,
  buildConvertPayload,
  buildRigCheckPayload,
  buildRigPayload,
  buildRetargetPayload,
  buildDecimatePayload,
  buildSegmentPayload,
  buildCompletePayload,
  normalizeRetargetOutput,
  presetFileKey,
} from './tripoEndpoints'
import { estimateJobCredits } from './tripoCredits'
import { profileGenerationOptions } from './meshProfiles'
import {
  archiveCurrentAndSet,
  base64ToImageFile,
  emptyModelRecord,
  findAssetRecord,
  getModelRecord,
  lockViewsReady,
  removeAssetRecord,
  restoreArchivedRecord,
  assetFileName,
} from './tripoModels'
import { deleteAssetModels, getModelBlob } from './db'
import { generateId } from './imageUtils'
import {
  captureFile,
  characterLabel,
  getAsset,
  outfitName,
  patchAsset,
  persistCharacterMeta,
  registerJobHandler,
  requireTripoKey,
  runAssetJob,
  store,
  toast,
} from './tripoJobRunner'

export { refreshTripoBalance, refreshTripoBalanceSilent, resumeInFlightTripoJobs, cancelAssetJob, isAssetBusy } from './tripoJobRunner'

function resolveTarget({ slot, outfitId = null, assetId = null }) {
  const id = assetId || getModelRecord(store().generatedModels, slot, outfitId)?.id
  if (!id) throw new TripoApiError('Generate a 3D mesh first.')
  return { slot, outfitId: slot === 'outfit' ? outfitId : null, assetId: id }
}

function shortId(taskId) {
  return String(taskId || generateId()).replace(/[^A-Za-z0-9-]/g, '').slice(0, 8) || 'x'
}

function spentNote(result) {
  return result?.spent != null ? ` Used ${result.spent} credits.` : ''
}

// --- Mesh generation ---------------------------------------------------------------------------

const meshHandler = ({ target }) => ({
  label: 'Generating 3D mesh',
  onProgress: (t) => patchAsset(target, { status: t.status === 'queued' ? 'queued' : 'running', progress: Math.max(10, Number(t.progress) || 0) }),
  onFailure: (e) => patchAsset(target, { status: 'failed', lastError: e?.message || 'Tripo job failed', completedAt: Date.now() }),
  onSuccess: async ({ task, capture }) => {
    const { modelUrl, previewUrl } = extractArtifactUrls(task.output)
    const keys = []
    if (previewUrl) keys.push((await capture({ fileKey: 'preview.jpg', url: previewUrl, taskId: task.task_id })).key)
    if (modelUrl) keys.push((await capture({ fileKey: 'mesh.glb', url: modelUrl, taskId: task.task_id })).key)
    patchAsset(target, { status: 'success', progress: 100, taskId: task.task_id, lastError: null, completedAt: Date.now() })
    return keys
  },
})
registerJobHandler('mesh', meshHandler)

/**
 * @param {{ slot: 'lock'|'mannequin'|'concept'|'outfit', outfitId?: string|null, profile?: 'animation'|'print', options?: object, prompt?: string, negativePrompt?: string }} opts
 */
export async function startMeshJob({ slot, outfitId = null, profile = 'animation', options = {}, prompt = '', negativePrompt = '' }) {
  requireTripoKey()
  const images = store().generatedImages
  store().ensureCharacterId()
  const views = lockViewsReady(images)
  const outfitImage = (store().wardrobe || []).find((o) => o.id === outfitId)?.image

  if (slot === 'lock' && !views.ready) throw new TripoApiError('Need the front T-pose plus at least one of side or back.')
  if (slot === 'mannequin' && !images.mannequin) throw new TripoApiError('Generate the mannequin image first.')
  if (slot === 'outfit' && !outfitImage) throw new TripoApiError('Generate the 2D outfit image first.')
  if (slot === 'concept' && !String(prompt || '').trim()) throw new TripoApiError('Write a prompt for text-to-model first.')

  const source = slot === 'lock' ? 'multiview' : slot === 'concept' ? 'text' : 'image'
  const gen = profileGenerationOptions(profile, options, { source })
  const record = emptyModelRecord({
    id: generateId(),
    slot,
    outfitId: slot === 'outfit' ? outfitId : null,
    source,
    profile,
    modelVersion: gen.model,
    engine: engineForModel(gen.model),
    texture: gen.texture !== false,
    textureQuality: gen.textureQuality || 'standard',
    geometryQuality: gen.geometryQuality || 'standard',
    faceLimit: gen.faceLimit ?? null,
    generation: { kind: source, options: gen, prompt: slot === 'concept' ? String(prompt).trim() : null },
    status: 'uploading',
    progress: 5,
  })
  store().setGeneratedModels(archiveCurrentAndSet(store().generatedModels, slot, outfitId, record))
  const target = { slot, outfitId: slot === 'outfit' ? outfitId : null, assetId: record.id }
  const handler = meshHandler({ target })

  const result = await runAssetJob({
    target,
    kind: 'mesh',
    label: handler.label,
    params: { profile, options: gen, prompt: record.generation.prompt },
    estimate: estimateJobCredits('mesh', { model: gen.model, texture: gen.texture !== false, ...gen }).credits,
    create: async ({ apiKey, signal }) => {
      let path
      let payload
      if (slot === 'lock') {
        const tokens = { front: await uploadTripoFile(apiKey, base64ToImageFile(views.front, 'front'), { signal }) }
        if (views.left) tokens.left = await uploadTripoFile(apiKey, base64ToImageFile(views.left, 'left'), { signal })
        if (views.back) tokens.back = await uploadTripoFile(apiKey, base64ToImageFile(views.back, 'back'), { signal })
        payload = buildMultiviewPayload(gen, tokens)
        path = TRIPO_ROUTES.multiviewToModel
      } else if (slot === 'concept') {
        payload = buildTextToModelPayload(gen, prompt, negativePrompt)
        path = TRIPO_ROUTES.textToModel
      } else {
        const image = slot === 'mannequin' ? images.mannequin : outfitImage
        const token = await uploadTripoFile(apiKey, base64ToImageFile(image, slot === 'mannequin' ? 'mannequin' : 'outfit'), { signal })
        payload = buildImageToModelPayload(gen, token)
        path = TRIPO_ROUTES.imageToModel
      }
      patchAsset(target, { status: 'queued', progress: 10 })
      const taskId = await createTripoTask(apiKey, path, payload, { signal })
      patchAsset(target, { taskId, status: 'queued', progress: 15 })
      return { taskId }
    },
    onSuccess: handler.onSuccess,
    onProgress: handler.onProgress,
    onFailure: handler.onFailure,
  })
  toast(`3D mesh saved in the app.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

// --- Re-texture (also "make animation version" of a print asset) --------------------------------

const textureHandler = ({ target }) => ({
  label: 'Re-texturing mesh',
  onProgress: (t) => patchAsset(target, { status: t.status === 'queued' ? 'queued' : 'running', progress: Math.max(10, Number(t.progress) || 0) }),
  onFailure: (e) => patchAsset(target, { status: 'failed', lastError: e?.message || 'Texture job failed', completedAt: Date.now() }),
  onSuccess: async ({ task, capture }) => {
    const { modelUrl, previewUrl } = extractArtifactUrls(task.output)
    const keys = []
    if (previewUrl) keys.push((await capture({ fileKey: 'preview.jpg', url: previewUrl, taskId: task.task_id })).key)
    if (modelUrl) keys.push((await capture({ fileKey: 'mesh.glb', url: modelUrl, taskId: task.task_id })).key)
    patchAsset(target, { status: 'success', progress: 100, taskId: task.task_id, lastError: null, completedAt: Date.now() })
    return keys
  },
})
registerJobHandler('texture', textureHandler)

export async function startTextureJob({ slot, outfitId = null, assetId = null, prompt = '', textureQuality = 'standard', textureAlignment, styleImageBase64 = null }) {
  requireTripoKey()
  const source = resolveTarget({ slot, outfitId, assetId })
  const parent = getAsset(source)
  if (!parent?.taskId) throw new TripoApiError('Generate a 3D mesh first.')
  const record = emptyModelRecord({
    id: generateId(),
    slot,
    outfitId: source.outfitId,
    source: parent.source,
    profile: 'animation',
    modelVersion: parent.modelVersion,
    engine: parent.engine,
    texture: true,
    textureQuality,
    geometryQuality: parent.geometryQuality,
    faceLimit: parent.faceLimit,
    generation: { kind: 'texture', options: { prompt, textureQuality, textureAlignment }, prompt: parent.generation?.prompt || null },
    lineage: { parentAssetId: parent.id, op: 'texture' },
    transform: parent.transform,
    status: 'queued',
    progress: 5,
  })
  store().setGeneratedModels(archiveCurrentAndSet(store().generatedModels, slot, source.outfitId, record))
  const target = { slot, outfitId: source.outfitId, assetId: record.id }
  const handler = textureHandler({ target })
  const result = await runAssetJob({
    target,
    kind: 'texture',
    label: handler.label,
    params: { prompt, textureQuality, textureAlignment, parentTaskId: parent.taskId },
    estimate: estimateJobCredits('texture').credits,
    create: async ({ apiKey, signal }) => {
      const styleImageToken = styleImageBase64 ? await uploadTripoFile(apiKey, base64ToImageFile(styleImageBase64, 'style'), { signal }) : undefined
      const payload = buildTexturePayload({ taskId: parent.taskId, textPrompt: prompt, textureQuality, textureAlignment, styleImageToken })
      const taskId = await createTripoTask(apiKey, TRIPO_ROUTES.texture, payload, { signal })
      patchAsset(target, { taskId, textureJob: { taskId, prompt } })
      return { taskId }
    },
    onSuccess: handler.onSuccess,
    onProgress: handler.onProgress,
    onFailure: handler.onFailure,
  })
  toast(`Textured version saved.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

export const makeAnimationVersion = (opts) => startTextureJob(opts)

// --- Rig ----------------------------------------------------------------------------------------

const rigHandler = ({ target, params }) => ({
  label: 'Rigging mesh',
  onSuccess: async ({ task, capture, extra }) => {
    const { modelUrl } = extractArtifactUrls(task.output)
    const outFormat = params?.outFormat === 'fbx' ? 'fbx' : 'glb'
    const fileKey = outFormat === 'fbx' ? 'rig.fbx' : 'rig.glb'
    const keys = []
    if (modelUrl) keys.push((await capture({ fileKey, url: modelUrl, taskId: task.task_id })).key)
    patchAsset(target, (rec) => ({
      rig: {
        taskId: task.task_id,
        checkTaskId: rec.jobs?.[Object.keys(rec.jobs).find((id) => rec.jobs[id].taskId === task.task_id)]?.checkTaskId || null,
        type: extra?.rigType || params?.rigType || rec.rig?.type || 'biped',
        spec: params?.spec === 'tripo' ? 'tripo' : 'mixamo',
        outFormat,
        riggable: true,
      },
    }))
    return keys
  },
})
registerJobHandler('rig', rigHandler)

/** @param {{ slot, outfitId?, assetId?, rigType?: 'auto'|string, spec?: 'mixamo'|'tripo', outFormat?: 'glb'|'fbx' }} opts */
export async function startRigJob({ slot, outfitId = null, assetId = null, rigType = 'auto', spec = 'mixamo', outFormat = 'glb' }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  if (!record?.taskId || record.status !== 'success') throw new TripoApiError('Generate a 3D mesh first.')
  const params = { rigType, spec, outFormat }
  const handler = rigHandler({ target, params })
  const result = await runAssetJob({
    target,
    kind: 'rig',
    label: handler.label,
    params,
    estimate: estimateJobCredits('rig').credits,
    create: async ({ apiKey, signal }) => {
      const checkId = await createTripoTask(apiKey, TRIPO_ROUTES.rigCheck, buildRigCheckPayload(record.taskId), { signal })
      const check = await waitForTripoTask(apiKey, checkId, { signal })
      if (!check.output?.riggable) {
        throw new TripoApiError('Tripo says this mesh is not riggable. Try the T-pose 3-angle lock or a cleaner silhouette. Rig-check is free — nothing was charged.')
      }
      const resolvedType = rigType === 'auto' ? check.output?.rig_type || 'biped' : rigType
      const taskId = await createTripoTask(apiKey, TRIPO_ROUTES.rig, buildRigPayload({ taskId: record.taskId, rigType: resolvedType, spec, outFormat }), { signal })
      return { taskId, checkTaskId: checkId, extra: { rigType: resolvedType } }
    },
    onSuccess: handler.onSuccess,
  })
  toast(`Rig ready (${getAsset(target)?.rig?.type || 'biped'}, ${spec}).${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

// --- Retarget -----------------------------------------------------------------------------------

const retargetHandler = ({ target, params }) => ({
  label: 'Retargeting animations',
  onSuccess: async ({ task, capture }) => {
    const presets = params?.presets || []
    const rows = normalizeRetargetOutput(task.output, presets)
    const keys = []
    for (const row of rows) {
      const fileKey = presetFileKey(row.id)
      const entry = await capture({ fileKey, url: row.url, taskId: task.task_id })
      keys.push(entry.key)
      patchAsset(target, (rec) => ({
        animations: [...rec.animations.filter((a) => a.id !== row.id), { preset: row.preset, id: row.id, taskId: task.task_id, fileKey }],
      }))
    }
    return keys
  },
})
registerJobHandler('retarget', retargetHandler)

/** @param {{ slot, outfitId?, assetId?, presets: string[] }} opts — preset ids (≤5) */
export async function startRetargetJob({ slot, outfitId = null, assetId = null, presets = [] }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  if (!record?.rig?.taskId) throw new TripoApiError('Rig the mesh before adding animations.')
  const payload = buildRetargetPayload({ rigTaskId: record.rig.taskId, presets, outFormat: 'glb' })
  const ids = payload.animations.map((name) => Object.values(PRESET_BY_ID).find((p) => p.preset === name)?.id).filter(Boolean)
  const params = { presets: ids }
  const handler = retargetHandler({ target, params })
  const result = await runAssetJob({
    target,
    kind: 'retarget',
    label: handler.label,
    params,
    estimate: estimateJobCredits('retarget', { presets: ids }).credits,
    create: async ({ apiKey, signal }) => ({ taskId: await createTripoTask(apiKey, TRIPO_ROUTES.retarget, payload, { signal }) }),
    onSuccess: handler.onSuccess,
  })
  toast(`Animations saved (${ids.map((id) => PRESET_BY_ID[id]?.label || id).join(', ')}).${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

// --- Convert ------------------------------------------------------------------------------------

export function convertFileKey(format) {
  const fmt = String(format || '').toUpperCase()
  const info = CONVERT_FORMATS[fmt]
  if (!info) throw new TripoApiError(`Unsupported format ${format}`)
  return `convert.${fmt}.${info.ext}`
}

const convertHandler = ({ target, params }) => ({
  label: `Converting to ${params?.format || 'file'}`,
  onSuccess: async ({ task, capture }) => {
    const { modelUrl } = extractArtifactUrls(task.output)
    const fileKey = convertFileKey(params.format)
    const keys = []
    if (modelUrl) keys.push((await capture({ fileKey, url: modelUrl, taskId: task.task_id })).key)
    patchAsset(target, (rec) => ({ convertTasks: { ...rec.convertTasks, [String(params.format).toUpperCase()]: task.task_id } }))
    return keys
  },
})
registerJobHandler('convert', convertHandler)

/**
 * @param {{ slot, outfitId?, assetId?, format: string, options?: object }} opts — options are buildConvertPayload fields (camelCase)
 */
export async function startConvertJob({ slot, outfitId = null, assetId = null, format, options = {} }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  const fmt = String(format || '').toUpperCase()
  const useRig = options.withAnimation && record?.rig?.taskId
  const sourceTaskId = useRig ? record.rig.taskId : record?.taskId
  if (!sourceTaskId || record.status !== 'success') throw new TripoApiError('Generate a 3D mesh first.')
  const payload = buildConvertPayload({ taskId: sourceTaskId, format: fmt, ...options })
  const params = { format: fmt, options, payload }
  const handler = convertHandler({ target, params })
  const result = await runAssetJob({
    target,
    kind: 'convert',
    label: handler.label,
    params,
    estimate: estimateJobCredits('convert', { payload }).credits,
    create: async ({ apiKey, signal }) => ({ taskId: await createTripoTask(apiKey, TRIPO_ROUTES.convert, payload, { signal }) }),
    onSuccess: handler.onSuccess,
  })
  toast(`${fmt} saved in the app.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

// --- Mesh ops: decimate (LOD), segment, complete ------------------------------------------------

const decimateHandler = ({ target, params }) => ({
  label: 'Building LOD',
  onSuccess: async ({ task, capture }) => {
    const { modelUrl } = extractArtifactUrls(task.output)
    const faceLimit = Math.round(Number(params?.faceLimit) || 4000)
    const fileKey = `lod.${faceLimit}.glb`
    const keys = []
    if (modelUrl) keys.push((await capture({ fileKey, url: modelUrl, taskId: task.task_id })).key)
    patchAsset(target, (rec) => ({ lods: [...rec.lods.filter((l) => l.faceLimit !== faceLimit), { faceLimit, quad: !!params?.quad, taskId: task.task_id, fileKey }].sort((a, b) => b.faceLimit - a.faceLimit) }))
    return keys
  },
})
registerJobHandler('decimate', decimateHandler)

export async function startDecimateJob({ slot, outfitId = null, assetId = null, faceLimit = 4000, quad = false }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  if (!record?.taskId || record.status !== 'success') throw new TripoApiError('Generate a 3D mesh first.')
  const params = { faceLimit, quad }
  const handler = decimateHandler({ target, params })
  const result = await runAssetJob({
    target,
    kind: 'decimate',
    label: handler.label,
    params,
    estimate: estimateJobCredits('decimate').credits,
    create: async ({ apiKey, signal }) => ({ taskId: await createTripoTask(apiKey, TRIPO_ROUTES.decimate, buildDecimatePayload({ taskId: record.taskId, faceLimit, quad }), { signal }) }),
    onSuccess: handler.onSuccess,
  })
  toast(`LOD (${faceLimit} faces) saved.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

function meshOpHandler(kind, family, label) {
  const factory = ({ target }) => ({
    label,
    onSuccess: async ({ task, capture }) => {
      const { modelUrl } = extractArtifactUrls(task.output)
      const fileKey = `${family}.${shortId(task.task_id)}.glb`
      const keys = []
      if (modelUrl) keys.push((await capture({ fileKey, url: modelUrl, taskId: task.task_id })).key)
      return keys
    },
  })
  registerJobHandler(kind, factory)
  return factory
}
const segmentHandler = meshOpHandler('segment', 'segment', 'Segmenting mesh')
const completeHandler = meshOpHandler('complete', 'complete', 'Completing mesh parts')

export async function startSegmentJob({ slot, outfitId = null, assetId = null }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  if (!record?.taskId || record.status !== 'success') throw new TripoApiError('Generate a 3D mesh first.')
  const handler = segmentHandler({ target })
  const result = await runAssetJob({
    target, kind: 'segment', label: handler.label, params: {}, estimate: estimateJobCredits('segment').credits,
    create: async ({ apiKey, signal }) => ({ taskId: await createTripoTask(apiKey, TRIPO_ROUTES.segment, buildSegmentPayload({ taskId: record.taskId }), { signal }) }),
    onSuccess: handler.onSuccess,
  })
  toast(`Segmented mesh saved.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

export async function startCompleteJob({ slot, outfitId = null, assetId = null, partNames = [] }) {
  requireTripoKey()
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  if (!record?.taskId || record.status !== 'success') throw new TripoApiError('Generate a 3D mesh first.')
  const handler = completeHandler({ target })
  const result = await runAssetJob({
    target, kind: 'complete', label: handler.label, params: { partNames }, estimate: estimateJobCredits('complete').credits,
    create: async ({ apiKey, signal }) => ({ taskId: await createTripoTask(apiKey, TRIPO_ROUTES.complete, buildCompletePayload({ taskId: record.taskId, partNames }), { signal }) }),
    onSuccess: handler.onSuccess,
  })
  toast(`Completed mesh saved.${spentNote(result)}`, 'success', 5000)
  return { target, ...result }
}

// --- Profiles: print version --------------------------------------------------------------------

/** Convert STL then 3MF with a flattened base, pivot at centre-bottom, scaled to `heightMm`. */
export async function makePrintVersion({ slot, outfitId = null, assetId = null, heightMm = 100, formats = ['STL', '3MF'] }) {
  const target = resolveTarget({ slot, outfitId, assetId })
  const record = getAsset(target)
  const boundsY = Number(record?.stats?.bounds?.[1]) || 0
  const scaleFactor = boundsY > 0 ? heightMm / (boundsY * 1000) : undefined
  patchAsset(target, { printSpec: { heightMm, flattenBottom: true, pivotCenterBottom: true } })
  const results = []
  for (const format of formats) {
    results.push(await startConvertJob({ ...target, format, options: { flattenBottom: true, flattenBottomThreshold: 0.01, pivotToCenterBottom: true, scaleFactor } }))
  }
  return results
}

// --- History / files ----------------------------------------------------------------------------

export async function restoreModelVersion({ slot, outfitId = null, assetId }) {
  store().setGeneratedModels(restoreArchivedRecord(store().generatedModels, slot, outfitId, assetId))
  await persistCharacterMeta()
  toast('Restored that 3D version as the current mesh.', 'success')
}

export async function deleteModelVersion({ slot, outfitId = null, assetId }) {
  const characterId = store().characterId
  store().setGeneratedModels(removeAssetRecord(store().generatedModels, slot, outfitId, assetId))
  if (characterId) await deleteAssetModels(characterId, slot, outfitId, assetId)
  await persistCharacterMeta()
  toast('Removed that 3D version from history.', 'info')
}

/** Object URL for a stored file, or the remote link while it is still valid; null otherwise. */
export async function getAssetFileUrl({ slot, outfitId = null, assetId, fileKey }) {
  const characterId = store().characterId
  const record = findAssetRecord(store().generatedModels, slot, outfitId, assetId)
  if (characterId) {
    const row = await getModelBlob(characterId, slot, outfitId, fileKey, assetId)
    if (row?.blob) return URL.createObjectURL(row.blob)
  }
  const entry = record?.files?.[fileKey]
  if (entry?.remoteUrl && (!entry.expiresAt || entry.expiresAt > Date.now())) return entry.remoteUrl
  return null
}

export async function getAssetFileBlob({ slot, outfitId = null, assetId, fileKey }) {
  const characterId = store().characterId
  if (!characterId) return null
  const row = await getModelBlob(characterId, slot, outfitId, fileKey, assetId)
  return row?.blob || null
}

export async function downloadAssetFile({ slot, outfitId = null, assetId, fileKey }) {
  const record = findAssetRecord(store().generatedModels, slot, outfitId, assetId)
  const name = assetFileName(characterLabel(), record, outfitId ? outfitName(outfitId) : '', fileKey)
  const blob = await getAssetFileBlob({ slot, outfitId, assetId, fileKey })
  if (blob) {
    saveBlobFile(blob, name)
    return true
  }
  const entry = record?.files?.[fileKey]
  if (entry?.remoteUrl && (!entry.expiresAt || entry.expiresAt > Date.now())) {
    openArtifactInTab(entry.remoteUrl)
    toast('Opened the Tripo download link. Save the file now — it expires in a few minutes.', 'warning', 6000)
    return true
  }
  toast('That file is not stored in this browser and its Tripo link has expired. Regenerate it to download.', 'warning', 6000)
  return false
}

/** Re-capture an unstored file while its remote link is still valid (free). */
export async function recaptureAssetFile({ slot, outfitId = null, assetId, fileKey }) {
  const target = { slot, outfitId, assetId }
  const entry = getAsset(target)?.files?.[fileKey]
  if (!entry?.remoteUrl) return null
  return captureFile({ target, fileKey, url: entry.remoteUrl, taskId: entry.taskId })
}

export { DEFAULT_MODEL, TRIPO_MODELS }
