/**
 * Deliberate Tripo job orchestration. Never called from Generate All or wardrobe auto-2D.
 */

import { useCharacterStore } from '../hooks/useCharacter'
import { useToastStore } from '../hooks/useToast'
import { deleteAssetModels, getModelBlob, putModelBlob, saveCharacter } from './db'
import {
  createTripoTask,
  extractArtifactUrls,
  fetchArtifactBlob,
  generationPayload,
  getTripoBalance,
  openArtifactInTab,
  saveBlobFile,
  TripoApiError,
  uploadTripoFile,
  waitForTripoTask,
} from './tripo'
import {
  archiveCurrentAndSet,
  base64ToImageFile,
  emptyModelRecord,
  filenameForSlot,
  findAssetRecord,
  findInFlightJobs,
  getModelRecord,
  lockViewsReady,
  patchModelRecord,
  removeAssetRecord,
  restoreArchivedRecord,
} from './tripoModels'
import { LOCOMOTION_CLIPS, RETARGET_CREDITS, RIG_CREDITS } from './tripoCredits'
import { generateId } from './imageUtils'

function toast(message, type, duration) {
  useToastStore.getState().addToast(message, type, duration)
}

function store() {
  return useCharacterStore.getState()
}

function requireTripoKey() {
  const key = store().tripoApiKey?.trim()
  if (!key) throw new TripoApiError('Add your Tripo API key in Settings first.')
  return key
}

function assertNotBusy() {
  if (store().tripoBusy) {
    throw new TripoApiError('A Tripo job is already running. Wait for it to finish.')
  }
}

function characterLabel() {
  return store().character?.name || 'character'
}

function outfitName(outfitId) {
  const row = (store().wardrobe || []).find((o) => o.id === outfitId)
  return row?.name || 'look'
}

function applyRecord(slot, outfitId, patch) {
  const state = store()
  const next = patchModelRecord(state.generatedModels, slot, outfitId, patch)
  state.setGeneratedModels(next)
}

function currentAssetId(slot, outfitId) {
  return getModelRecord(store().generatedModels, slot, outfitId)?.id || null
}

async function persistCharacterMeta() {
  const data = store().getSaveData()
  await saveCharacter(data)
  store().setCharacterId(data.id)
  return data.id
}

export async function refreshTripoBalanceSilent() {
  const key = store().tripoApiKey?.trim()
  if (!key) {
    store().setTripoBalance(null)
    return null
  }
  try {
    const bal = await getTripoBalance(key)
    store().setTripoBalance(bal)
    return bal
  } catch {
    return null
  }
}

async function captureArtifact({ characterId, slot, outfitId, kind, url, filename, mime, assetId }) {
  const blob = await fetchArtifactBlob(url)
  if (!blob) return { saved: false, corsBlocked: true }
  await putModelBlob({
    characterId,
    slot,
    outfitId,
    kind,
    assetId,
    blob,
    mime: mime || blob.type,
    filename,
  })
  return { saved: true, corsBlocked: false }
}

async function finishMeshTask({
  apiKey, slot, outfitId, taskId, engine, texture, source,
  textureQuality, geometryQuality, faceLimit,
}) {
  const task = await waitForTripoTask(apiKey, taskId, {
    onProgress: (t) => {
      applyRecord(slot, outfitId, {
        status: t.status === 'queued' ? 'queued' : 'running',
        progress: Number(t.progress) || 0,
      })
    },
  })

  const { modelUrl, previewUrl } = extractArtifactUrls(task.output)
  const characterId = store().ensureCharacterId()
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  const assetId = record?.id
  const who = characterLabel()
  const look = outfitId ? outfitName(outfitId) : ''
  const files = { ...(record?.files || emptyModelRecord().files) }
  let corsBlocked = false
  const remoteUrls = {}

  if (previewUrl) {
    const preview = await captureArtifact({
      characterId,
      slot,
      outfitId,
      assetId,
      kind: 'preview',
      url: previewUrl,
      filename: filenameForSlot(who, slot, look, 'preview'),
      mime: 'image/jpeg',
    })
    files.preview = preview.saved
    if (!preview.saved) {
      corsBlocked = true
      remoteUrls.preview = previewUrl
    }
  }

  if (modelUrl) {
    const glb = await captureArtifact({
      characterId,
      slot,
      outfitId,
      assetId,
      kind: 'glb',
      url: modelUrl,
      filename: filenameForSlot(who, slot, look, 'glb'),
      mime: 'model/gltf-binary',
    })
    files.glb = glb.saved
    if (!glb.saved) {
      corsBlocked = true
      remoteUrls.glb = modelUrl
    }
  }

  applyRecord(slot, outfitId, {
    status: 'success',
    progress: 100,
    taskId,
    engine,
    texture,
    textureQuality,
    geometryQuality,
    faceLimit: engine === 'p1' ? faceLimit : null,
    source,
    lastError: null,
    creditsConsumed: task.credits_consumed ?? null,
    previewUrl,
    files,
    corsBlocked,
    remoteUrls,
    completedAt: Date.now(),
  })
  await persistCharacterMeta()
  await refreshTripoBalanceSilent()

  const spent = task.credits_consumed != null ? ` Used ${task.credits_consumed} credits.` : ''
  if (corsBlocked) {
    toast(
      `3D model ready.${spent} It could not be saved in the browser. Use Download if you need a copy — the Tripo link expires in a few minutes.`,
      'warning',
      8000,
    )
  } else {
    toast(`3D model saved in the app.${spent}`, 'success', 5000)
  }
  return task
}

async function runTaskFromId({
  slot, outfitId, taskId, engine, texture, source,
  textureQuality, geometryQuality, faceLimit,
}) {
  const apiKey = requireTripoKey()
  store().setTripoBusy(true, `${slot}:${outfitId || ''}`)
  try {
    applyRecord(slot, outfitId, {
      status: 'running',
      taskId,
      engine,
      texture,
      source,
      lastError: null,
    })
    await persistCharacterMeta()
    await finishMeshTask({
      apiKey, slot, outfitId, taskId, engine, texture, source,
      textureQuality, geometryQuality, faceLimit,
    })
    return 'mesh'
  } catch (e) {
    applyRecord(slot, outfitId, {
      status: 'failed',
      lastError: e?.message || 'Tripo job failed',
      completedAt: Date.now(),
    })
    await persistCharacterMeta()
    await refreshTripoBalanceSilent()
    if (e?.status === 'failed' || e?.name === 'TripoTaskError') {
      toast(
        `Tripo generation failed. Frozen credits should be returned. Retry spends full price only if it succeeds. ${e.message}`,
        'error',
        7000,
      )
    } else {
      toast(e?.message || 'Tripo job failed', 'error', 6000)
    }
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

/**
 * @param {{ slot: 'lock' | 'mannequin' | 'outfit', outfitId?: string, engine: 'h3' | 'p1', texture: boolean, textureQuality?: string, geometryQuality?: string, faceLimit?: number }} opts
 */
export async function startMeshGeneration({
  slot,
  outfitId = null,
  engine,
  texture,
  textureQuality = 'standard',
  geometryQuality = 'standard',
  faceLimit = 5000,
}) {
  assertNotBusy()
  const apiKey = requireTripoKey()
  const images = store().generatedImages
  store().ensureCharacterId()

  const views = lockViewsReady(images)
  const outfitImage = (store().wardrobe || []).find((o) => o.id === outfitId)?.image
  if (slot === 'lock' && !views.ready) {
    toast('Need the front T-pose plus at least one of side or back.', 'warning')
    throw new TripoApiError('Need the front T-pose plus at least one of side or back.')
  }
  if (slot === 'mannequin' && !images.mannequin) {
    toast('Generate the mannequin image first.', 'warning')
    throw new TripoApiError('Generate the mannequin image first.')
  }
  if (slot === 'outfit' && !outfitImage) {
    toast('Generate the 2D outfit image first.', 'warning')
    throw new TripoApiError('Generate the 2D outfit image first.')
  }

  const source = slot === 'lock' ? 'multiview' : 'image'
  const nextRecord = emptyModelRecord({
    id: generateId(),
    slot,
    outfitId: slot === 'outfit' ? outfitId : null,
    source,
    engine,
    texture,
    textureQuality,
    geometryQuality,
    faceLimit: engine === 'p1' ? faceLimit : null,
    status: 'uploading',
    progress: 5,
  })
  store().setGeneratedModels(archiveCurrentAndSet(store().generatedModels, slot, outfitId, nextRecord))
  store().setTripoBusy(true, `${slot}:${outfitId || ''}`)

  try {
    await persistCharacterMeta()
    const payload = generationPayload({ engineId: engine, texture, textureQuality, geometryQuality, faceLimit })
    if (slot === 'lock') {
      const tokens = [{ front: await uploadTripoFile(apiKey, base64ToImageFile(views.front, 'front')) }]
      if (views.left) tokens.push({ left: await uploadTripoFile(apiKey, base64ToImageFile(views.left, 'left')) })
      if (views.back) tokens.push({ back: await uploadTripoFile(apiKey, base64ToImageFile(views.back, 'back')) })
      payload.inputs = tokens
    } else {
      const image = slot === 'mannequin' ? images.mannequin : outfitImage
      payload.input = await uploadTripoFile(
        apiKey,
        base64ToImageFile(image, slot === 'mannequin' ? 'mannequin' : 'outfit'),
      )
    }

    applyRecord(slot, outfitId, { status: 'queued', progress: 10 })
    const path = slot === 'lock' ? '/generation/multiview-to-model' : '/generation/image-to-model'
    const taskId = await createTripoTask(apiKey, path, payload)
    applyRecord(slot, outfitId, { taskId, status: 'queued', progress: 15 })
    await persistCharacterMeta()
    await finishMeshTask({
      apiKey, slot, outfitId, taskId, engine, texture, source,
      textureQuality, geometryQuality, faceLimit,
    })
    return 'mesh'
  } catch (e) {
    applyRecord(slot, outfitId, {
      status: 'failed',
      lastError: e?.message || 'Tripo job failed',
      completedAt: Date.now(),
    })
    try { await persistCharacterMeta() } catch { /* keep the in-memory failure */ }
    await refreshTripoBalanceSilent()
    if (e?.name === 'TripoTaskError') {
      toast(
        `Tripo generation failed. Frozen credits should be returned. Retry spends full price only if it succeeds. ${e.message}`,
        'error',
        7000,
      )
    } else {
      toast(e?.message || 'Tripo job failed', 'error', 6000)
    }
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

export async function retryMeshGeneration(opts) {
  return startMeshGeneration(opts)
}

export async function resumeInFlightTripoJobs() {
  const jobs = findInFlightJobs(store().generatedModels)
  if (!jobs.length || store().tripoBusy) return
  const job = jobs.find((j) => j.record?.taskId) || jobs[0]
  if (!job.record?.taskId) return
  try {
    await runTaskFromId({
      slot: job.slot,
      outfitId: job.outfitId,
      taskId: job.record.taskId,
      engine: job.record.engine || 'h3',
      texture: job.record.texture !== false,
      textureQuality: job.record.textureQuality || 'standard',
      geometryQuality: job.record.geometryQuality || 'standard',
      faceLimit: job.record.faceLimit || 5000,
      source: job.record.source || (job.slot === 'lock' ? 'multiview' : 'image'),
    })
  } catch {
    /* toasts already shown */
  }
}

export async function startRigJob({ slot, outfitId = null }) {
  assertNotBusy()
  const apiKey = requireTripoKey()
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  if (!record?.taskId || record.status !== 'success') {
    throw new TripoApiError('Generate a 3D mesh first.')
  }
  const assetId = record.id

  store().setTripoBusy(true, `rig:${slot}`)
  applyRecord(slot, outfitId, { status: 'running', progress: 5, lastError: null })
  try {
    const checkId = await createTripoTask(apiKey, '/animations/rig-check', { input: record.taskId })
    const check = await waitForTripoTask(apiKey, checkId, {
      onProgress: (t) => applyRecord(slot, outfitId, { progress: Math.min(40, Number(t.progress) || 0) }),
    })
    const riggable = check.output?.riggable
    const rigType = check.output?.rig_type || 'biped'
    if (!riggable) {
      applyRecord(slot, outfitId, { status: 'success', progress: 100 })
      toast(
        'Tripo says this mesh is not riggable. Try the T-pose 3-angle lock instead of a relaxed or twisted pose. Rig-check is free — you were not charged 25 credits.',
        'warning',
        8000,
      )
      return null
    }

    const rigModel = rigType === 'biped' ? 'v1.0-20240301' : 'v2.5-20260210'
    const rigId = await createTripoTask(apiKey, '/animations/rig', {
      input: record.taskId,
      model: rigModel,
      rig_type: rigType,
      spec: 'mixamo',
      out_format: 'glb',
    })
    applyRecord(slot, outfitId, { rigTaskId: rigId, progress: 50 })
    await persistCharacterMeta()

    const rigTask = await waitForTripoTask(apiKey, rigId, {
      onProgress: (t) => applyRecord(slot, outfitId, { progress: 50 + Math.round((Number(t.progress) || 0) / 2) }),
    })
    const { modelUrl } = extractArtifactUrls(rigTask.output)
    const characterId = store().ensureCharacterId()
    const files = { ...(getModelRecord(store().generatedModels, slot, outfitId)?.files || {}) }
    const remoteUrls = { ...(getModelRecord(store().generatedModels, slot, outfitId)?.remoteUrls || {}) }
    let corsBlocked = !!record.corsBlocked

    if (modelUrl) {
      const saved = await captureArtifact({
        characterId,
        slot,
        outfitId,
        assetId,
        kind: 'riggedGlb',
        url: modelUrl,
        filename: filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', 'riggedGlb'),
        mime: 'model/gltf-binary',
      })
      files.riggedGlb = saved.saved
      if (!saved.saved) {
        corsBlocked = true
        remoteUrls.riggedGlb = modelUrl
      }
    }

    applyRecord(slot, outfitId, {
      status: 'success',
      progress: 100,
      rigTaskId: rigId,
      files,
      corsBlocked,
      remoteUrls,
      creditsConsumed: (Number(record.creditsConsumed) || 0) + (Number(rigTask.credits_consumed) || RIG_CREDITS),
    })
    await persistCharacterMeta()
    await refreshTripoBalanceSilent()
    toast(`Mixamo rig ready (${rigType}).${rigTask.credits_consumed != null ? ` Used ${rigTask.credits_consumed} credits.` : ''}`, 'success', 5000)
    return 'rigged'
  } catch (e) {
    applyRecord(slot, outfitId, { status: 'success', lastError: e?.message || 'Rig failed' })
    await persistCharacterMeta()
    toast(e?.message || 'Rig failed', 'error', 6000)
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

/**
 * @param {{ slot: string, outfitId?: string, clips?: string[] }} opts
 */
export async function startRetargetJob({ slot, outfitId = null, clips = ['idle', 'walk', 'run'] }) {
  assertNotBusy()
  const apiKey = requireTripoKey()
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  if (!record?.rigTaskId) {
    throw new TripoApiError('Rig the mesh before adding animations.')
  }
  const wanted = LOCOMOTION_CLIPS.filter((clip) => clips.includes(clip.id))
  if (!wanted.length) throw new TripoApiError('Pick at least one animation.')

  const assetId = record.id
  store().setTripoBusy(true, `retarget:${slot}`)
  applyRecord(slot, outfitId, { status: 'running', progress: 5, lastError: null })
  try {
    const characterId = store().ensureCharacterId()
    const files = { ...(record.files || {}) }
    const remoteUrls = { ...(record.remoteUrls || {}) }
    let corsBlocked = !!record.corsBlocked
    let spent = 0
    let done = 0

    for (const clip of wanted) {
      const taskId = await createTripoTask(apiKey, '/animations/retarget', {
        input: record.rigTaskId,
        animation: clip.preset,
        out_format: 'glb',
        bake_animation: true,
        export_with_geometry: true,
        animate_in_place: true,
      })
      const task = await waitForTripoTask(apiKey, taskId, {
        onProgress: (t) => {
          const slice = (Number(t.progress) || 0) / wanted.length
          applyRecord(slot, outfitId, { progress: Math.round((done * 100 + slice) / wanted.length) })
        },
      })
      spent += Number(task.credits_consumed) || RETARGET_CREDITS
      const { modelUrl, modelUrls } = extractArtifactUrls(task.output)
      const url = modelUrl || (modelUrls && (modelUrls[clip.preset] || Object.values(modelUrls)[0]))
      if (url) {
        const saved = await captureArtifact({
          characterId,
          slot,
          outfitId,
          assetId,
          kind: clip.kind,
          url,
          filename: filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', clip.kind),
          mime: 'model/gltf-binary',
        })
        files[clip.kind] = saved.saved
        if (!saved.saved) {
          corsBlocked = true
          remoteUrls[clip.kind] = url
        }
      }
      done += 1
      applyRecord(slot, outfitId, { files, remoteUrls, progress: Math.round((done / wanted.length) * 100) })
    }

    applyRecord(slot, outfitId, {
      status: 'success',
      progress: 100,
      files,
      corsBlocked,
      remoteUrls,
      creditsConsumed: (Number(record.creditsConsumed) || 0) + spent,
    })
    await persistCharacterMeta()
    await refreshTripoBalanceSilent()
    toast(`Animations saved (${wanted.map((c) => c.label).join(', ')}). Used ${spent} credits.`, 'success', 5000)
    return 'animations'
  } catch (e) {
    applyRecord(slot, outfitId, { status: 'success', lastError: e?.message || 'Animation retarget failed' })
    await persistCharacterMeta()
    toast(e?.message || 'Animation retarget failed', 'error', 6000)
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

/**
 * @param {{ slot: string, outfitId?: string, format: 'STL' | 'FBX' }} opts
 */
export async function startConvertJob({ slot, outfitId = null, format }) {
  assertNotBusy()
  const apiKey = requireTripoKey()
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  const sourceTaskId = format === 'FBX' && record?.rigTaskId ? record.rigTaskId : record?.taskId
  if (!sourceTaskId || record.status === 'failed' || record.status === 'idle') {
    throw new TripoApiError('Generate a 3D mesh first.')
  }
  const assetId = record.id

  const kind = format === 'STL' ? 'stl' : 'fbx'
  const payload = format === 'STL'
    ? {
        input: sourceTaskId,
        format: 'STL',
        flatten_bottom: true,
        pivot_to_center_bottom: true,
      }
    : {
        input: sourceTaskId,
        format: 'FBX',
        fbx_preset: 'mixamo',
        pivot_to_center_bottom: true,
        with_animation: true,
      }

  store().setTripoBusy(true, `convert:${kind}`)
  applyRecord(slot, outfitId, { status: 'running', progress: 5, lastError: null })
  try {
    const convertId = await createTripoTask(apiKey, '/models/convert', payload)
    applyRecord(slot, outfitId, {
      convertTasks: { ...(record.convertTasks || {}), [kind]: convertId },
      progress: 20,
    })
    await persistCharacterMeta()

    const task = await waitForTripoTask(apiKey, convertId, {
      onProgress: (t) => applyRecord(slot, outfitId, { progress: Number(t.progress) || 0 }),
    })
    const { modelUrl } = extractArtifactUrls(task.output)
    const characterId = store().ensureCharacterId()
    const files = { ...(getModelRecord(store().generatedModels, slot, outfitId)?.files || {}) }
    const remoteUrls = { ...(getModelRecord(store().generatedModels, slot, outfitId)?.remoteUrls || {}) }
    let corsBlocked = !!record.corsBlocked

    if (modelUrl) {
      const saved = await captureArtifact({
        characterId,
        slot,
        outfitId,
        assetId,
        kind,
        url: modelUrl,
        filename: filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', kind),
        mime: format === 'STL' ? 'model/stl' : 'application/octet-stream',
      })
      files[kind] = saved.saved
      if (!saved.saved) {
        corsBlocked = true
        remoteUrls[kind] = modelUrl
      }
    }

    applyRecord(slot, outfitId, {
      status: 'success',
      progress: 100,
      files,
      corsBlocked,
      remoteUrls,
    })
    await persistCharacterMeta()
    await refreshTripoBalanceSilent()
    toast(
      `${format} saved in the app.${task.credits_consumed != null ? ` Used ${task.credits_consumed} credits.` : ''}`,
      'success',
      5000,
    )
    return format === 'STL' ? 'stl' : 'mesh'
  } catch (e) {
    applyRecord(slot, outfitId, { status: 'success', lastError: e?.message || `${format} convert failed` })
    await persistCharacterMeta()
    toast(e?.message || `${format} convert failed`, 'error', 6000)
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

export async function restoreModelVersion({ slot, outfitId = null, assetId }) {
  const next = restoreArchivedRecord(store().generatedModels, slot, outfitId, assetId)
  store().setGeneratedModels(next)
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

export async function downloadSlotFile({ slot, outfitId = null, kind, assetId }) {
  const characterId = store().characterId
  const id = assetId || currentAssetId(slot, outfitId)
  const record = id
    ? findAssetRecord(store().generatedModels, slot, outfitId, id) || getModelRecord(store().generatedModels, slot, outfitId)
    : getModelRecord(store().generatedModels, slot, outfitId)
  const name = filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', kind)

  if (characterId) {
    const row = await getModelBlob(characterId, slot, outfitId, kind, id)
    if (row?.blob) {
      saveBlobFile(row.blob, row.filename || name)
      return
    }
  }

  const url = record?.remoteUrls?.[kind] || (kind === 'preview' ? record?.previewUrl : null)
  if (url) {
    openArtifactInTab(url)
    toast('Opened the Tripo download link. Save the file now — it expires in a few minutes.', 'warning', 6000)
    return
  }

  toast('No file stored for that export yet.', 'warning')
}

export async function getAssetBlobUrl({ slot, outfitId = null, kind, assetId }) {
  const characterId = store().characterId
  const id = assetId || currentAssetId(slot, outfitId)
  if (characterId) {
    const row = await getModelBlob(characterId, slot, outfitId, kind, id)
    if (row?.blob) return URL.createObjectURL(row.blob)
  }
  const record = id
    ? findAssetRecord(store().generatedModels, slot, outfitId, id)
    : getModelRecord(store().generatedModels, slot, outfitId)
  if (kind === 'preview' && record?.previewUrl) return record.previewUrl
  return record?.remoteUrls?.[kind] || null
}

export async function getSlotPreviewUrl(slot, outfitId = null, assetId) {
  return getAssetBlobUrl({ slot, outfitId, kind: 'preview', assetId })
}

export async function getSlotGlbObjectUrl(slot, outfitId = null, assetId) {
  const rigged = await getAssetBlobUrl({ slot, outfitId, kind: 'riggedGlb', assetId })
  if (rigged) return rigged
  return getAssetBlobUrl({ slot, outfitId, kind: 'glb', assetId })
}
