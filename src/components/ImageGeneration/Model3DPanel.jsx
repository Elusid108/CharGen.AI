import React, { useEffect, useMemo } from 'react'
import { Box } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useTripoConfirm } from '../../hooks/useTripoConfirm'
import { base64ToDataUrl } from '../../utils/imageUtils'
import { lockViewsReady } from '../../utils/tripoModels'
import { formatCredits } from '../../utils/tripoCredits'
import { resumeInFlightTripoJobs } from '../../utils/tripoJobs'
import Model3DSlot from './Model3DSlot'

export default function Model3DPanel() {
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const {
    tripoBalance,
    tripoBusy,
    tripoApiKey,
    openMeshConfirm,
    openPaidConfirm,
    openViewer,
    overlays,
  } = useTripoConfirm()

  const views = useMemo(() => lockViewsReady(generatedImages), [generatedImages])
  const lockReady = views.ready
  const mannequinReady = !!generatedImages.mannequin

  useEffect(() => {
    void resumeInFlightTripoJobs()
  }, [])

  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Box size={18} className="text-cyan-400" />
            3D Studio
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tripo jobs only run when you confirm a button below — never from Generate All Images.
            Meshes stay in this browser until you download them. Failed jobs return frozen credits.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {tripoApiKey
            ? tripoBalance
              ? `${formatCredits(tripoBalance.balance)} credits`
              : 'Tripo key saved'
            : 'No Tripo key'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Model3DSlot
          title="Turnaround lock"
          description="Front + left + back T-pose. Best geometry and the best source for rigging."
          slot="lock"
          generatedModels={generatedModels}
          canGenerate={lockReady && !tripoBusy}
          generateHint={lockReady ? '' : 'Generate front T-pose plus side or back first.'}
          sourceThumbs={[views.front, views.left, views.back].filter(Boolean).map((b) => base64ToDataUrl(b))}
          tripoBusy={tripoBusy}
          onGenerate={() => openMeshConfirm('lock', null, false)}
          onRetry={() => openMeshConfirm('lock', null, true)}
          onView={() => openViewer('lock', null, 'mesh')}
          onRig={() => openPaidConfirm('rig', 'lock')}
          onStl={() => openPaidConfirm('stl', 'lock')}
          onFbx={() => openPaidConfirm('fbx', 'lock')}
        />
        <Model3DSlot
          title="Mannequin"
          description="Single relaxed underwear pose. Fine for a dress-up mesh; auto-rig is less reliable than the T-pose lock."
          slot="mannequin"
          generatedModels={generatedModels}
          canGenerate={mannequinReady && !tripoBusy}
          generateHint={mannequinReady ? '' : 'Generate the mannequin image first.'}
          sourceThumbs={generatedImages.mannequin ? [base64ToDataUrl(generatedImages.mannequin)] : []}
          tripoBusy={tripoBusy}
          onGenerate={() => openMeshConfirm('mannequin', null, false)}
          onRetry={() => openMeshConfirm('mannequin', null, true)}
          onView={() => openViewer('mannequin', null, 'mesh')}
          onRig={() => openPaidConfirm('rig', 'mannequin')}
          onStl={() => openPaidConfirm('stl', 'mannequin')}
          onFbx={() => openPaidConfirm('fbx', 'mannequin')}
        />
      </div>

      {overlays}
    </div>
  )
}
