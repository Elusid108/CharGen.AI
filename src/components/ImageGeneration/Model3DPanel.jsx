import React, { useMemo } from 'react'
import { Box, Maximize2 } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useUiStore } from '../../hooks/useUi'
import { useTripoJobs } from '../../hooks/useTripoJobs'
import { base64ToDataUrl } from '../../utils/imageUtils'
import { lockViewsReady } from '../../utils/tripoModels'
import { formatCredits } from '../../utils/tripoCredits'
import Model3DCard from './Model3DCard'

export default function Model3DPanel() {
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const focusStudio = useUiStore((s) => s.focusStudio)
  const { tripoBalance, tripoApiKey, openJob, overlays } = useTripoJobs()

  const views = useMemo(() => lockViewsReady(generatedImages), [generatedImages])
  const lockReady = views.ready
  const mannequinReady = !!generatedImages.mannequin

  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Box size={18} className="text-cyan-400" />
            3D models
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tripo jobs only run when you confirm a dialog — never from Generate All Images. Pick a game
            (textured, rig-ready) or print (untextured, detailed) mesh; rigging, animation clips, LODs and
            exports live in the 3D Studio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {tripoApiKey ? (tripoBalance ? `${formatCredits(tripoBalance.balance)} credits` : 'Tripo key saved') : 'No Tripo key'}
          </span>
          <button type="button" onClick={() => focusStudio(null)} className="btn-secondary text-xs flex items-center gap-1">
            <Maximize2 size={12} /> 3D Studio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Model3DCard
          title="Turnaround lock"
          description="Front + left + back T-pose → multiview. Best geometry and the best source for rigging."
          slot="lock"
          generatedModels={generatedModels}
          canGenerate={lockReady}
          generateHint={lockReady ? '' : 'Generate front T-pose plus side or back first.'}
          sourceThumbs={[views.front, views.left, views.back].filter(Boolean).map((b) => base64ToDataUrl(b))}
          onGenerate={(profile) => openJob('mesh', { slot: 'lock' }, { profile })}
        />
        <Model3DCard
          title="Mannequin"
          description="Single relaxed underwear pose. Fine for a dress-up mesh; auto-rig is less reliable than the T-pose lock."
          slot="mannequin"
          generatedModels={generatedModels}
          canGenerate={mannequinReady}
          generateHint={mannequinReady ? '' : 'Generate the mannequin image first.'}
          sourceThumbs={generatedImages.mannequin ? [base64ToDataUrl(generatedImages.mannequin)] : []}
          onGenerate={(profile) => openJob('mesh', { slot: 'mannequin' }, { profile })}
        />
      </div>

      {overlays}
    </div>
  )
}
