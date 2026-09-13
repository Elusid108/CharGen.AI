/**
 * Deliberate Tripo job orchestration. Never called from Generate All or wardrobe auto-2D.
 */

import { useCharacterStore } from '../hooks/useCharacter'
import { useToastStore } from '../hooks/useToast'
import { putModelBlob, getModelBlob, saveCharacter } from './db'
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
  base64ToImageFile,
  emptyModelRecord,
  filenameForSlot,
  findInFlightJobs,
  getModelRecord,
  lockViewsReady,
  patchModelRecord,
} from './tripoModels'
import { RIG_CREDITS } from './tripoCredits'

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

async function captureArtifact({ characterId, slot, outfitId, kind, url, filename, mime }) {
  const blob = await fetchArtifactBlob(url)
  if (!blob) {
    if (url) openArtifactInTab(url)
    return { saved: false, corsBlocked: true }
  }
  await putModelBlob({
    characterId,
    slot,
    outfitId,
    kind,
    blob,
    mime: mime || blob.type,
    filename,
  })
  return { saved: true, corsBlocked: false }
}

async function finishMeshTask({ apiKey, slot, outfitId, taskId, engine, texture, source }) {
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
  const who = characterLabel()
  const look = outfitId ? outfitName(outfitId) : ''
  const files = { ...(getModelRecord(store().generatedModels, slot, outfitId)?.files || emptyModelRecord().files) }
  let corsBlocked = false
  const remoteUrls = {}

  if (previewUrl) {
    const previewName = filenameForSlot(who, slot, look, 'preview')
    const preview = await captureArtifact({
      characterId,
      slot,
      outfitId,
      kind: 'preview',
      url: previewUrl,
      filename: previewName,
      mime: 'image/jpeg',
    })
    files.preview = preview.saved
    if (!preview.saved) {
      corsBlocked = true
      remoteUrls.preview = previewUrl
    }
  }

  if (modelUrl) {
    const glbName = filenameForSlot(who, slot, look, 'glb')
    const glb = await captureArtifact({
      characterId,
      slot,
      outfitId,
      kind: 'glb',
      url: modelUrl,
      filename: glbName,
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
      `3D model ready.${spent} The file opened in a new tab because the browser blocked saving it locally. Download it now — the link expires in a few minutes.`,
      'warning',
      8000,
    )
  } else {
    toast(`3D model saved.${spent}`, 'success', 5000)
  }
  return task
}

async function runTaskFromId({ slot, outfitId, taskId, engine, texture, source }) {
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
    await finishMeshTask({ apiKey, slot, outfitId, taskId, engine, texture, source })
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
 * @param {{ slot: 'lock' | 'mannequin' | 'outfit', outfitId?: string, engine: 'h3' | 'p1', texture: boolean }} opts
 */
export async function startMeshGeneration({ slot, outfitId = null, engine, texture }) {
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
  store().setTripoBusy(true, `${slot}:${outfitId || ''}`)
  applyRecord(slot, outfitId, emptyModelRecord({
    slot,
    outfitId: slot === 'outfit' ? outfitId : null,
    source,
    engine,
    texture,
    status: 'uploading',
    progress: 5,
  }))

  try {
    await persistCharacterMeta()
    const payload = generationPayload({ engineId: engine, texture })
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
    await finishMeshTask({ apiKey, slot, outfitId, taskId, engine, texture, source })
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

export async function retryMeshGeneration({ slot, outfitId = null, engine, texture }) {
  return startMeshGeneration({ slot, outfitId, engine, texture })
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
      return
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
      const name = filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', 'riggedGlb')
      const saved = await captureArtifact({
        characterId,
        slot,
        outfitId,
        kind: 'riggedGlb',
        url: modelUrl,
        filename: name,
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
      const name = filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', kind)
      const mime = format === 'STL' ? 'model/stl' : 'application/octet-stream'
      const saved = await captureArtifact({
        characterId,
        slot,
        outfitId,
        kind,
        url: modelUrl,
        filename: name,
        mime,
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
      `${format} export ready.${task.credits_consumed != null ? ` Used ${task.credits_consumed} credits.` : ''}`,
      'success',
      5000,
    )
  } catch (e) {
    applyRecord(slot, outfitId, { status: 'success', lastError: e?.message || `${format} convert failed` })
    await persistCharacterMeta()
    toast(e?.message || `${format} convert failed`, 'error', 6000)
    throw e
  } finally {
    store().setTripoBusy(false, null)
  }
}

export async function downloadSlotFile({ slot, outfitId = null, kind }) {
  const characterId = store().characterId
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  const name = filenameForSlot(characterLabel(), slot, outfitId ? outfitName(outfitId) : '', kind)

  if (characterId) {
    const row = await getModelBlob(characterId, slot, outfitId, kind)
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

export async function getSlotPreviewUrl(slot, outfitId = null) {
  const characterId = store().characterId
  if (characterId) {
    const row = await getModelBlob(characterId, slot, outfitId, 'preview')
    if (row?.blob) return URL.createObjectURL(row.blob)
  }
  const record = getModelRecord(store().generatedModels, slot, outfitId)
  if (record?.previewUrl) return record.previewUrl
  return null
}

export async function getSlotGlbObjectUrl(slot, outfitId = null) {
  const characterId = store().characterId
  if (!characterId) return null
  const rigged = await getModelBlob(characterId, slot, outfitId, 'riggedGlb')
  if (rigged?.blob) return URL.createObjectURL(rigged.blob)
  const glb = await getModelBlob(characterId, slot, outfitId, 'glb')
  if (glb?.blob) return URL.createObjectURL(glb.blob)
  return null
}
