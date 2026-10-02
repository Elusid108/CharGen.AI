/**
 * Per-asset Tripo job runner. One job per asset at a time, up to MAX_PARALLEL assets in flight,
 * client-side cancellation, and resume-on-reload for every job kind via POST /tasks/list.
 *
 * Results are downloaded into IndexedDB BEFORE state is persisted or success is reported —
 * Tripo's artifact links expire minutes after a task completes.
 */

import { useCharacterStore } from '../hooks/useCharacter'
import { useToastStore } from '../hooks/useToast'
import { putModelBlob, saveCharacter } from './db'
import {
  artifactExpiresAt,
  fetchArtifactBlob,
  getTripoBalance,
  listTripoTasks,
  TripoApiError,
  waitForTripoTask,
} from './tripo'
import { TRIPO_FAILED } from './tripoEndpoints'
import {
  assetFileName,
  fileEntry,
  findAssetRecord,
  findInFlightJobs,
  JOB_TERMINAL,
  mimeForFileKey,
  patchAssetRecord,
  slotKey,
} from './tripoModels'
import { generateId } from './imageUtils'

export const MAX_PARALLEL = 3
const controllers = new Map()
const waiters = []
let running = 0
const handlers = {}

export function toast(message, type = 'info', duration) {
  useToastStore.getState().addToast(message, type, duration)
}

export function store() {
  return useCharacterStore.getState()
}

export function requireTripoKey() {
  const key = store().tripoApiKey?.trim()
  if (!key) throw new TripoApiError('Add your Tripo API key in Settings first.')
  return key
}

export function characterLabel() {
  return store().character?.name || 'character'
}

export function outfitName(outfitId) {
  const row = (store().wardrobe || []).find((o) => o.id === outfitId)
  return row?.name || 'look'
}

export function targetKey({ slot, outfitId, assetId }) {
  return `${slotKey(slot, outfitId)}::${assetId}`
}

export function getAsset(target) {
  return findAssetRecord(store().generatedModels, target.slot, target.outfitId, target.assetId)
}

export function patchAsset(target, patch) {
  const state = store()
  state.setGeneratedModels(patchAssetRecord(state.generatedModels, target.slot, target.outfitId, target.assetId, patch))
}

export function patchJob(target, jobId, patch) {
  patchAsset(target, (rec) => ({ jobs: { ...rec.jobs, [jobId]: { ...(rec.jobs?.[jobId] || { id: jobId }), ...patch } } }))
}

export async function persistCharacterMeta() {
  const data = store().getSaveData()
  await saveCharacter(data)
  store().setCharacterId(data.id)
  return data.id
}

async function persistQuietly() {
  try {
    await persistCharacterMeta()
  } catch (e) {
    console.error('persistCharacterMeta failed:', e)
  }
}

/** Throws the Tripo / transport error so the caller can show why the balance failed. */
export async function refreshTripoBalance() {
  const key = store().tripoApiKey?.trim()
  if (!key) {
    store().setTripoBalance(null)
    return null
  }
  const bal = await getTripoBalance(key)
  store().setTripoBalance(bal)
  return bal
}

export async function refreshTripoBalanceSilent() {
  try {
    return await refreshTripoBalance()
  } catch {
    return null
  }
}

export function isAssetBusy(target) {
  return controllers.has(targetKey(target))
}

export function assertAssetIdle(target) {
  if (isAssetBusy(target)) throw new TripoApiError('This asset already has a Tripo job running. Wait or cancel it first.')
}

export function cancelAssetJob(target) {
  const ac = controllers.get(targetKey(target))
  if (!ac) return false
  ac.abort()
  return true
}

async function acquireSlot() {
  if (running < MAX_PARALLEL) {
    running += 1
    return
  }
  await new Promise((resolve) => waiters.push(resolve))
  running += 1
}

function releaseSlot() {
  running = Math.max(0, running - 1)
  const next = waiters.shift()
  if (next) next()
}

/**
 * Download one artifact into IndexedDB and record it on the asset. Never throws on a failed
 * download: the entry is kept with `stored:false` + the (short-lived) remote url.
 */
export async function captureFile({ target, fileKey, url, taskId, signal }) {
  const record = getAsset(target)
  const characterId = store().ensureCharacterId()
  const filename = assetFileName(characterLabel(), record, target.outfitId ? outfitName(target.outfitId) : '', fileKey)
  const blob = url ? await fetchArtifactBlob(url, { signal }) : null
  let entry
  if (blob) {
    await putModelBlob({
      characterId,
      slot: target.slot,
      outfitId: target.outfitId,
      kind: fileKey,
      assetId: target.assetId,
      blob,
      mime: mimeForFileKey(fileKey),
      filename,
    })
    entry = fileEntry(fileKey, { stored: true, bytes: blob.size, taskId, mime: mimeForFileKey(fileKey) })
  } else {
    entry = fileEntry(fileKey, { stored: false, remoteUrl: url || null, taskId, expiresAt: artifactExpiresAt() })
  }
  patchAsset(target, (rec) => ({ files: { ...rec.files, [fileKey]: entry } }))
  return entry
}

/** Kind-specific completion handlers, registered by tripoJobs.js so resume can replay them. */
export function registerJobHandler(kind, factory) {
  handlers[kind] = factory
}

function describeFailure(kind, e) {
  if (e?.name === 'AbortError') return `Cancelled ${kind}. Tripo may still finish the task and bill it.`
  if (e?.name === 'TripoTaskError') return `Tripo ${kind} ${e.status || 'failed'}. Frozen credits should be returned. ${e.message}`
  return e?.message || `Tripo ${kind} failed`
}

/**
 * @param {{
 *   target: { slot: string, outfitId: string | null, assetId: string },
 *   kind: string, label?: string, params?: object, estimate?: number | null,
 *   create?: (ctx: { apiKey: string, signal: AbortSignal }) => Promise<{ taskId: string, checkTaskId?: string, extra?: object }>,
 *   onSuccess: (ctx: { task: object, apiKey: string, signal: AbortSignal, job: object, extra: object, capture: Function }) => Promise<string[]>,
 *   onProgress?: (task: object) => void,
 *   onFailure?: (error: Error) => void,
 *   resumeTaskId?: string | null, jobId?: string | null, silent?: boolean,
 * }} opts
 */
export async function runAssetJob(opts) {
  const { target, kind, label = kind, params = {}, estimate = null, create, onSuccess, onProgress, onFailure, resumeTaskId = null, silent = false } = opts
  const apiKey = requireTripoKey()
  assertAssetIdle(target)
  if (!getAsset(target)) throw new TripoApiError('That 3D asset no longer exists.')

  const key = targetKey(target)
  const jobId = opts.jobId || generateId()
  const ac = new AbortController()
  controllers.set(key, ac)
  store().setTripoJobActive(key, { kind, label, target })

  const existing = getAsset(target)?.jobs?.[jobId]
  patchJob(target, jobId, {
    id: jobId,
    kind,
    label,
    taskId: resumeTaskId || existing?.taskId || null,
    checkTaskId: existing?.checkTaskId || null,
    status: resumeTaskId ? 'queued' : create ? 'uploading' : 'queued',
    progress: existing?.progress || 0,
    startedAt: existing?.startedAt || Date.now(),
    finishedAt: null,
    params: existing?.params && Object.keys(existing.params).length ? existing.params : params,
    resultKeys: existing?.resultKeys || [],
    creditsConsumed: existing?.creditsConsumed ?? null,
    error: null,
  })
  patchAsset(target, { activeJobId: jobId })
  await persistQuietly()

  let extra = {}
  try {
    await acquireSlot()
    let taskId = resumeTaskId
    if (!taskId) {
      const created = await create({ apiKey, signal: ac.signal, jobId })
      taskId = created.taskId
      extra = created.extra || {}
      patchJob(target, jobId, { taskId, checkTaskId: created.checkTaskId || null, status: 'queued', progress: 10 })
      await persistQuietly()
    }

    const task = await waitForTripoTask(apiKey, taskId, {
      signal: ac.signal,
      onProgress: (t) => {
        patchJob(target, jobId, { status: t.status === 'queued' ? 'queued' : 'running', progress: Math.max(10, Number(t.progress) || 0) })
        if (onProgress) onProgress(t)
      },
    })

    patchJob(target, jobId, { status: 'downloading', progress: 100 })
    const job = getAsset(target)?.jobs?.[jobId]
    const resultKeys = await onSuccess({
      task,
      apiKey,
      signal: ac.signal,
      job,
      extra,
      capture: (args) => captureFile({ target, signal: ac.signal, ...args }),
    })

    const consumed = Number(task.credits_consumed)
    const spent = Number.isFinite(consumed) ? consumed : estimate
    patchAsset(target, (rec) => ({
      creditsConsumed: spent == null ? rec.creditsConsumed : (Number(rec.creditsConsumed) || 0) + spent,
      activeJobId: null,
      jobs: {
        ...rec.jobs,
        [jobId]: { ...rec.jobs[jobId], status: 'success', progress: 100, finishedAt: Date.now(), resultKeys: resultKeys || [], creditsConsumed: spent ?? null },
      },
    }))
    await persistQuietly()
    void refreshTripoBalanceSilent()
    return { task, resultKeys: resultKeys || [], jobId, spent }
  } catch (e) {
    const status = e?.name === 'AbortError' ? 'cancelled' : e?.name === 'TripoTaskError' && e.status === 'expired' ? 'expired' : 'failed'
    patchAsset(target, (rec) => ({
      activeJobId: null,
      jobs: { ...rec.jobs, [jobId]: { ...(rec.jobs?.[jobId] || { id: jobId, kind }), status, finishedAt: Date.now(), error: e?.message || String(e) } },
    }))
    if (onFailure) {
      try { onFailure(e) } catch { /* ignore */ }
    }
    await persistQuietly()
    void refreshTripoBalanceSilent()
    if (!silent) {
      toast(describeFailure(kind, e), e?.name === 'AbortError' ? 'warning' : 'error', 7000)
      if (e && typeof e === 'object') e.toasted = true
    }
    throw e
  } finally {
    controllers.delete(key)
    store().setTripoJobActive(key, null)
    releaseSlot()
  }
}

/** Re-attach to every non-terminal job after a reload. */
export async function resumeInFlightTripoJobs() {
  const key = store().tripoApiKey?.trim()
  const inFlight = findInFlightJobs(store().generatedModels)
  if (!inFlight.length) return
  if (!key) return

  const resumable = []
  for (const item of inFlight) {
    const target = { slot: item.slot, outfitId: item.outfitId, assetId: item.assetId }
    if (isAssetBusy(target)) continue
    const job = item.job
    if (!job) {
      // Legacy in-flight mesh record without a job entry.
      if (item.record.taskId) {
        resumable.push({ target, kind: 'mesh', jobId: generateId(), taskId: item.record.taskId, params: {} })
      } else {
        patchAsset(target, { status: 'failed', lastError: 'Interrupted before upload finished.' })
      }
      continue
    }
    if (!job.taskId) {
      patchJob(target, job.id, { status: 'failed', finishedAt: Date.now(), error: 'Interrupted before upload finished.' })
      patchAsset(target, (rec) => (job.kind === 'mesh' ? { status: 'failed', lastError: 'Interrupted before upload finished.', activeJobId: null } : { activeJobId: null }))
      continue
    }
    resumable.push({ target, kind: job.kind, jobId: job.id, taskId: job.taskId, params: job.params || {} })
  }
  await persistQuietly()
  if (!resumable.length) return

  let statuses = new Map()
  try {
    statuses = await listTripoTasks(key, resumable.map((r) => r.taskId))
  } catch (e) {
    console.error('listTripoTasks failed:', e)
  }

  for (const item of resumable) {
    const factory = handlers[item.kind]
    const snapshot = statuses.get(item.taskId)
    if (snapshot && TRIPO_FAILED.includes(snapshot.status)) {
      patchJob(item.target, item.jobId, { status: snapshot.status === 'expired' ? 'expired' : 'failed', finishedAt: Date.now(), error: snapshot.error_msg || `Tripo task ${snapshot.status}` })
      patchAsset(item.target, (rec) => (item.kind === 'mesh' ? { status: 'failed', lastError: snapshot.error_msg || `Tripo task ${snapshot.status}`, activeJobId: null } : { activeJobId: null }))
      continue
    }
    if (!factory) {
      patchJob(item.target, item.jobId, { status: 'failed', finishedAt: Date.now(), error: `No handler for ${item.kind}` })
      continue
    }
    try {
      const handler = factory({ target: item.target, params: item.params })
      await runAssetJob({ target: item.target, kind: item.kind, label: handler.label || item.kind, params: item.params, resumeTaskId: item.taskId, jobId: item.jobId, onSuccess: handler.onSuccess, onProgress: handler.onProgress, onFailure: handler.onFailure })
    } catch {
      /* toasts already shown */
    }
  }
  await persistQuietly()
}
