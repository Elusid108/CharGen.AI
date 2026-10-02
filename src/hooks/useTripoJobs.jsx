/**
 * One hook for every billed Tripo action: opens the schema-driven options dialog, shows the
 * credit estimate against the live balance, and dispatches the confirmed job. Jobs run in the
 * background (the runner owns progress, persistence and failure toasts).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useCharacterStore } from './useCharacter'
import { useToastStore } from './useToast'
import { useUiStore } from './useUi'
import { findAssetRecord, getModelRecord, lockViewsReady } from '../utils/tripoModels'
import { defaultJobValues, jobCallArgs, jobValuesError } from '../utils/tripoJobSchemas'
import {
  makePrintVersion,
  refreshTripoBalanceSilent,
  startCompleteJob,
  startConvertJob,
  startDecimateJob,
  startMeshJob,
  startRetargetJob,
  startRigJob,
  startSegmentJob,
  startTextureJob,
} from '../utils/tripoJobs'
import TripoOptionsModal from '../components/Studio3D/TripoOptionsModal'

const STARTERS = {
  mesh: startMeshJob,
  texture: startTextureJob,
  rig: startRigJob,
  retarget: startRetargetJob,
  convert: startConvertJob,
  decimate: startDecimateJob,
  segment: startSegmentJob,
  complete: startCompleteJob,
  print: makePrintVersion,
}

function sourceForSlot(slot) {
  if (slot === 'lock') return 'multiview'
  if (slot === 'concept') return 'text'
  return 'image'
}

/** Can a mesh be generated for this slot right now? Returns { ok, hint }. */
export function meshSourceReady(slot, outfitId, { generatedImages, wardrobe }) {
  if (slot === 'lock') {
    const views = lockViewsReady(generatedImages)
    return views.ready ? { ok: true, hint: '' } : { ok: false, hint: 'Generate the front T-pose plus a side or back view first.' }
  }
  if (slot === 'mannequin') return generatedImages?.mannequin ? { ok: true, hint: '' } : { ok: false, hint: 'Generate the mannequin image first.' }
  if (slot === 'concept') return { ok: true, hint: '' }
  if (slot === 'outfit') {
    const outfit = (wardrobe || []).find((o) => o.id === outfitId)
    return outfit?.image ? { ok: true, hint: '' } : { ok: false, hint: 'Generate the 2D look first.' }
  }
  return { ok: false, hint: 'Unknown slot.' }
}

export function useTripoJobs({ stats = null } = {}) {
  const tripoApiKey = useCharacterStore((s) => s.tripoApiKey)
  const tripoBalance = useCharacterStore((s) => s.tripoBalance)
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const addToast = useToastStore((s) => s.addToast)
  const currentTab = useUiStore((s) => s.currentTab)
  const focusStudio = useUiStore((s) => s.focusStudio)
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    if (tripoApiKey) void refreshTripoBalanceSilent()
  }, [tripoApiKey])

  const requireKey = useCallback(() => {
    if (tripoApiKey?.trim()) return true
    addToast('Add your Tripo API key in Settings first. 3D jobs never use the Google key.', 'warning', 5000)
    return false
  }, [tripoApiKey, addToast])

  /**
   * @param {string} kind
   * @param {{ slot: string, outfitId?: string|null, assetId?: string|null }} target
   * @param {object} preset initial values (e.g. { profile: 'print' } or { format: 'STL' })
   */
  const openJob = useCallback((kind, target, preset = {}) => {
    if (!STARTERS[kind]) return
    if (!requireKey()) return
    void refreshTripoBalanceSilent()
    const models = useCharacterStore.getState().generatedModels
    const slot = target.slot
    const outfitId = slot === 'outfit' ? target.outfitId || null : null
    const record = target.assetId ? findAssetRecord(models, slot, outfitId, target.assetId) : getModelRecord(models, slot, outfitId)
    if (kind !== 'mesh' && !record) {
      addToast('Generate a 3D mesh first.', 'warning')
      return
    }
    const ctx = {
      slot,
      outfitId,
      source: sourceForSlot(slot),
      record,
      hasRig: !!record?.rig?.taskId,
      rigType: record?.rig?.type || 'biped',
      stats: stats && stats.forFileKey ? stats : record?.stats || stats || null,
      profile: record?.profile || 'animation',
    }
    setDialog({ kind, target: { slot, outfitId, assetId: record?.id || null }, ctx, values: defaultJobValues(kind, ctx, preset) })
  }, [requireKey, addToast, stats])

  const closeDialog = useCallback(() => setDialog(null), [])

  const confirm = useCallback((values) => {
    if (!dialog) return
    const { kind, target, ctx } = dialog
    const error = jobValuesError(kind, values, ctx)
    if (error) {
      addToast(error, 'warning')
      return
    }
    const args = jobCallArgs(kind, values, ctx)
    const starter = STARTERS[kind]
    const call = kind === 'mesh'
      ? { slot: target.slot, outfitId: target.outfitId, ...args }
      : { slot: target.slot, outfitId: target.outfitId, assetId: target.assetId, ...args }
    setDialog(null)
    const promise = starter(call)
    promise.catch((e) => {
      if (e?.name === 'AbortError' || e?.toasted) return
      addToast(e?.message || 'Tripo job failed', 'error', 6000)
    })
    if (kind === 'mesh') {
      const created = getModelRecord(useCharacterStore.getState().generatedModels, target.slot, target.outfitId)
      if (created && currentTab !== 'studio3d') focusStudio({ slot: target.slot, outfitId: target.outfitId, assetId: created.id })
    }
  }, [dialog, addToast, currentTab, focusStudio])

  const overlays = useMemo(() => (
    <TripoOptionsModal
      open={!!dialog}
      kind={dialog?.kind}
      ctx={dialog?.ctx}
      initialValues={dialog?.values}
      balance={tripoBalance}
      onCancel={closeDialog}
      onConfirm={confirm}
    />
  ), [dialog, tripoBalance, closeDialog, confirm])

  return { openJob, overlays, dialog, tripoApiKey, tripoBalance, generatedModels, closeDialog }
}
