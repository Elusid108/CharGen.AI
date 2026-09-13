import { useEffect, useState } from 'react'
import { useCharacterStore } from './useCharacter'
import { useToastStore } from './useToast'
import {
  estimateFbxCredits,
  estimateMeshCredits,
  estimateStlCredits,
  RIG_CREDITS,
} from '../utils/tripoCredits'
import {
  refreshTripoBalanceSilent,
  retryMeshGeneration,
  startConvertJob,
  startMeshGeneration,
  startRigJob,
} from '../utils/tripoJobs'

export function useTripoConfirm() {
  const tripoApiKey = useCharacterStore((s) => s.tripoApiKey)
  const tripoBalance = useCharacterStore((s) => s.tripoBalance)
  const tripoBusy = useCharacterStore((s) => s.tripoBusy)
  const addToast = useToastStore((s) => s.addToast)

  const [confirm, setConfirm] = useState(null)
  const [engine, setEngine] = useState('h3')
  const [texture, setTexture] = useState(true)

  useEffect(() => {
    if (tripoApiKey) void refreshTripoBalanceSilent()
  }, [tripoApiKey])

  const requireKey = () => {
    if (tripoApiKey) return true
    addToast('Add your Tripo API key in Settings first. 3D jobs never use the Google key.', 'warning', 5000)
    return false
  }

  const openMeshConfirm = (slot, outfitId, isRetry) => {
    if (!requireKey()) return
    void refreshTripoBalanceSilent()
    setEngine('h3')
    setTexture(true)
    setConfirm({ kind: 'mesh', slot, outfitId: outfitId || null, isRetry })
  }

  const openPaidConfirm = (kind, slot, outfitId) => {
    if (!requireKey()) return
    void refreshTripoBalanceSilent()
    setConfirm({ kind, slot, outfitId: outfitId || null })
  }

  const estimate = !confirm
    ? 0
    : confirm.kind === 'mesh'
      ? estimateMeshCredits(engine, texture)
      : confirm.kind === 'rig'
        ? RIG_CREDITS
        : confirm.kind === 'stl'
          ? estimateStlCredits()
          : confirm.kind === 'fbx'
            ? estimateFbxCredits()
            : 0

  const copy = (() => {
    if (!confirm) return {}
    if (confirm.kind === 'mesh') {
      const source = confirm.slot === 'lock'
        ? 'the front T-pose plus side/back views'
        : confirm.slot === 'mannequin'
          ? 'the mannequin image'
          : 'this wardrobe look'
      return {
        title: confirm.isRetry ? 'Retry 3D generation?' : 'Generate 3D model?',
        description: `This uploads ${source} to Tripo and starts a billed job. Nothing else in CharGen will call Tripo unless you press a 3D button.`,
        confirmLabel: 'Generate 3D',
      }
    }
    if (confirm.kind === 'rig') {
      return {
        title: 'Mixamo rig this mesh?',
        description: 'A free rig-check runs first. If the mesh cannot be rigged you are not charged 25 credits. T-pose lock meshes rig more reliably than relaxed poses.',
        confirmLabel: 'Rig mesh',
      }
    }
    if (confirm.kind === 'stl') {
      return {
        title: 'Export STL for 3D print?',
        description: 'Converts this mesh with a flattened bottom. Geometry only — no textures or bones.',
        confirmLabel: 'Export STL',
      }
    }
    return {
      title: 'Export FBX for game engines?',
      description: 'Converts the rigged mesh when a Mixamo rig exists, otherwise the raw mesh. Use Mixamo preset for Unity/Unreal.',
      confirmLabel: 'Export FBX',
    }
  })()

  const handleConfirm = async () => {
    if (!confirm) return
    const { kind, slot, outfitId, isRetry } = confirm
    try {
      if (kind === 'mesh') {
        const fn = isRetry ? retryMeshGeneration : startMeshGeneration
        await fn({ slot, outfitId, engine, texture })
      } else if (kind === 'rig') {
        await startRigJob({ slot, outfitId })
      } else if (kind === 'stl') {
        await startConvertJob({ slot, outfitId, format: 'STL' })
      } else if (kind === 'fbx') {
        await startConvertJob({ slot, outfitId, format: 'FBX' })
      }
      setConfirm(null)
    } catch {
      /* job helpers toast */
    }
  }

  return {
    confirm,
    engine,
    setEngine,
    texture,
    setTexture,
    estimate,
    copy,
    tripoBalance,
    tripoBusy,
    tripoApiKey,
    openMeshConfirm,
    openPaidConfirm,
    handleConfirm,
    closeConfirm: () => {
      if (!tripoBusy) setConfirm(null)
    },
  }
}
