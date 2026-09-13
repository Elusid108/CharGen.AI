import { useEffect, useState } from 'react'
import { useCharacterStore } from './useCharacter'
import { useToastStore } from './useToast'
import {
  estimateFbxCredits,
  estimateMeshCredits,
  estimateRetargetCredits,
  estimateStlCredits,
  RIG_CREDITS,
} from '../utils/tripoCredits'
import {
  refreshTripoBalanceSilent,
  retryMeshGeneration,
  startConvertJob,
  startMeshGeneration,
  startRetargetJob,
  startRigJob,
} from '../utils/tripoJobs'
import TripoConfirmModal from '../components/ImageGeneration/TripoConfirmModal'
import Model3DViewerModal from '../components/ImageGeneration/Model3DViewerModal'

export function useTripoConfirm() {
  const tripoApiKey = useCharacterStore((s) => s.tripoApiKey)
  const tripoBalance = useCharacterStore((s) => s.tripoBalance)
  const tripoBusy = useCharacterStore((s) => s.tripoBusy)
  const addToast = useToastStore((s) => s.addToast)

  const [confirm, setConfirm] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [engine, setEngine] = useState('h3')
  const [texture, setTexture] = useState(true)
  const [textureQuality, setTextureQuality] = useState('standard')
  const [geometryQuality, setGeometryQuality] = useState('standard')
  const [faceLimit, setFaceLimit] = useState(5000)

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
    setTextureQuality('standard')
    setGeometryQuality('standard')
    setFaceLimit(5000)
    setConfirm({ kind: 'mesh', slot, outfitId: outfitId || null, isRetry })
  }

  const openPaidConfirm = (kind, slot, outfitId, extra = {}) => {
    if (!requireKey()) return
    void refreshTripoBalanceSilent()
    setConfirm({ kind, slot, outfitId: outfitId || null, ...extra })
  }

  const openViewer = (slot, outfitId, mode = 'mesh') => {
    setViewer({ slot, outfitId: outfitId || null, mode })
  }

  const estimate = !confirm
    ? 0
    : confirm.kind === 'mesh'
      ? estimateMeshCredits(engine, texture, { textureQuality, geometryQuality })
      : confirm.kind === 'rig'
        ? RIG_CREDITS
        : confirm.kind === 'stl'
          ? estimateStlCredits()
          : confirm.kind === 'fbx'
            ? estimateFbxCredits()
            : confirm.kind === 'retarget'
              ? estimateRetargetCredits((confirm.clips || ['idle', 'walk', 'run']).length)
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
        description: 'Converts this mesh with a flattened bottom. Geometry only — no textures or bones. Preview stays in the app.',
        confirmLabel: 'Make STL',
      }
    }
    if (confirm.kind === 'retarget') {
      const n = (confirm.clips || ['idle', 'walk', 'run']).length
      return {
        title: 'Add locomotion animations?',
        description: `Retarget idle, walk, and run onto the rigged mesh (${n} clips). Each clip is 10 credits. Playback stays in the 3D viewer.`,
        confirmLabel: 'Animate mesh',
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
    const { kind, slot, outfitId, isRetry, clips } = confirm
    try {
      let mode = null
      if (kind === 'mesh') {
        const fn = isRetry ? retryMeshGeneration : startMeshGeneration
        mode = await fn({
          slot,
          outfitId,
          engine,
          texture,
          textureQuality,
          geometryQuality,
          faceLimit,
        })
      } else if (kind === 'rig') {
        mode = await startRigJob({ slot, outfitId })
      } else if (kind === 'stl') {
        mode = await startConvertJob({ slot, outfitId, format: 'STL' })
      } else if (kind === 'fbx') {
        mode = await startConvertJob({ slot, outfitId, format: 'FBX' })
      } else if (kind === 'retarget') {
        mode = await startRetargetJob({ slot, outfitId, clips: clips || ['idle', 'walk', 'run'] })
      }
      setConfirm(null)
      if (mode) openViewer(slot, outfitId, mode)
    } catch {
      /* job helpers toast */
    }
  }

  const overlays = (
    <>
      <TripoConfirmModal
        open={!!confirm}
        kind={confirm?.kind === 'mesh' ? 'mesh' : confirm?.kind}
        title={copy.title}
        description={copy.description}
        engine={engine}
        onEngineChange={setEngine}
        texture={texture}
        onTextureChange={setTexture}
        textureQuality={textureQuality}
        onTextureQualityChange={setTextureQuality}
        geometryQuality={geometryQuality}
        onGeometryQualityChange={setGeometryQuality}
        faceLimit={faceLimit}
        onFaceLimitChange={setFaceLimit}
        estimate={estimate}
        balance={tripoBalance}
        busy={tripoBusy}
        confirmLabel={copy.confirmLabel}
        onCancel={() => {
          if (!tripoBusy) setConfirm(null)
        }}
        onConfirm={() => void handleConfirm()}
      />
      <Model3DViewerModal
        open={!!viewer}
        slot={viewer?.slot}
        outfitId={viewer?.outfitId}
        initialMode={viewer?.mode || 'mesh'}
        busy={tripoBusy}
        onClose={() => setViewer(null)}
        onRig={() => viewer && openPaidConfirm('rig', viewer.slot, viewer.outfitId)}
        onStl={() => viewer && openPaidConfirm('stl', viewer.slot, viewer.outfitId)}
        onFbx={() => viewer && openPaidConfirm('fbx', viewer.slot, viewer.outfitId)}
        onRetarget={(nextClips) => viewer && openPaidConfirm('retarget', viewer.slot, viewer.outfitId, { clips: nextClips })}
      />
    </>
  )

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
    openViewer,
    handleConfirm,
    closeConfirm: () => {
      if (!tripoBusy) setConfirm(null)
    },
    overlays,
  }
}
