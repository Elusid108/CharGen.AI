import React, { useMemo, useState } from 'react'
import { X, Package, Loader2, Check, AlertTriangle } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useToastStore } from '../../hooks/useToast'
import { APP_VERSION } from '../../appVersion'
import { EXPORT_TARGETS, TARGET_IDS, planBundle, targetStatus, estimateBundleGap, buildExportManifest, readmeText, buildAssetBundle, bundleHasImages } from '../../utils/assetExport'
import { getAssetFileBlob } from '../../utils/tripoJobs'
import { base64ToImageFile } from '../../utils/tripoModels'
import { saveBlobFile } from '../../utils/tripo'
import { formatCredits } from '../../utils/tripoCredits'

function sourcesFor(record, generatedImages, outfit) {
  if (record.slot === 'lock') {
    return [['front', generatedImages?.tpose], ['left', generatedImages?.side], ['back', generatedImages?.back]].filter(([, b]) => b).map(([name, b64]) => ({ name, b64 }))
  }
  if (record.slot === 'mannequin') return generatedImages?.mannequin ? [{ name: 'mannequin', b64: generatedImages.mannequin }] : []
  if (record.slot === 'outfit') return outfit?.image ? [{ name: 'outfit', b64: outfit.image }] : []
  return []
}

export default function ExportBundleModal({ target, record, onClose, onGenerateMissing }) {
  const characterName = useCharacterStore((s) => s.character?.name) || 'character'
  const characterId = useCharacterStore((s) => s.characterId)
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const wardrobe = useCharacterStore((s) => s.wardrobe)
  const addToast = useToastStore((s) => s.addToast)
  const [targets, setTargets] = useState(() => (record.profile === 'print' ? ['print'] : ['unity_unreal', 'gltf']))
  const [building, setBuilding] = useState(false)

  const outfit = record.slot === 'outfit' ? (wardrobe || []).find((o) => o.id === record.outfitId) : null
  const outfitName = outfit?.name || ''
  const statuses = useMemo(() => Object.fromEntries(TARGET_IDS.map((t) => [t, targetStatus(record, t)])), [record])
  const gap = useMemo(() => estimateBundleGap(record, targets), [record, targets])
  const sources = useMemo(() => sourcesFor(record, generatedImages, outfit), [record, generatedImages, outfit])
  const plan = useMemo(() => planBundle(record, { targets, characterName, outfitName, sources: sources.map((s) => ({ name: s.name, ext: 'jpg' })) }), [record, targets, characterName, outfitName, sources])

  const toggle = (id) => setTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const build = async () => {
    if (!targets.length) return
    setBuilding(true)
    try {
      const manifest = buildExportManifest(record, { characterName, characterId, outfitName, targets, plan, appVersion: APP_VERSION })
      const readme = readmeText(manifest)
      const getBytes = (fileKey) => getAssetFileBlob({ ...target, fileKey })
      const getSource = async (name) => {
        const s = sources.find((x) => x.name === name)
        return s ? base64ToImageFile(s.b64, name) : null
      }
      const { zip, included, skipped } = await buildAssetBundle({ plan, manifest, readme, getBytes, getSource })

      // Unity / Unreal: if the FBX archive carried no textures, extract them from the GLB.
      const fbxDir = `${plan.base}/model/fbx`
      if (targets.includes('unity_unreal') && included.some((p) => p.startsWith(`${fbxDir}/`)) && !bundleHasImages(included, fbxDir) && record.texture) {
        try {
          const glb = await getAssetFileBlob({ ...target, fileKey: 'mesh.glb' })
          if (glb) {
            const { extractPbrTextures } = await import('../../utils/glbTextures')
            const maps = await extractPbrTextures(glb, plan.base)
            for (const m of maps) zip.file(`${fbxDir}/textures/${m.name}`, m.blob)
          }
        } catch (e) {
          console.warn('texture extraction failed', e)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      saveBlobFile(blob, `${plan.base}_bundle.zip`)
      addToast(`Bundle built (${included.length} files${skipped.length ? `, ${skipped.length} skipped` : ''}).`, 'success', 5000)
      onClose()
    } catch (e) {
      addToast(`Export failed: ${e?.message || e}`, 'error', 6000)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" data-testid="export-modal">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package size={18} className="text-cyan-400" /> Export bundle</h3>
            <p className="text-xs text-slate-400 mt-1">One ZIP, laid out by engine convention, with a manifest and README. Nothing here calls Tripo; missing files are listed with their cost.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-2 mb-4">
          {TARGET_IDS.map((id) => {
            const t = EXPORT_TARGETS[id]
            const st = statuses[id]
            const on = targets.includes(id)
            const required = st.missing.filter((m) => !m.optional)
            const optional = st.missing.filter((m) => m.optional)
            return (
              <label key={id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${on ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'}`}>
                <input type="checkbox" className="mt-1" checked={on} onChange={() => toggle(id)} data-testid={`target-${id}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">{t.label}</span>
                  <span className="block text-[11px] text-slate-400">{t.hint}</span>
                  <span className="block text-[11px] mt-1">
                    {st.present.length ? <span className="text-emerald-400 inline-flex items-center gap-1 mr-2"><Check size={11} />{st.present.length} ready</span> : null}
                    {required.map((m) => (
                      <span key={m.fileKey} className="text-amber-300 inline-flex items-center gap-1 mr-2"><AlertTriangle size={11} />{m.reason} (~{formatCredits(m.estimatedCredits)} cr)</span>
                    ))}
                    {optional.map((m) => (
                      <span key={m.fileKey} className="text-slate-500 mr-2">{m.reason} (optional, ~{formatCredits(m.estimatedCredits)} cr)</span>
                    ))}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs space-y-1 mb-4">
          <div className="flex justify-between"><span className="text-slate-400">Files in this bundle</span><span className="font-mono text-slate-200">{plan.entries.length + 2}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Folder</span><span className="font-mono text-slate-200 truncate ml-3">{plan.base}/</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Credits to complete the selected targets</span><span className="font-mono text-slate-200">{formatCredits(gap.credits)}</span></div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {gap.jobs.length > 0 && onGenerateMissing ? (
            <button type="button" onClick={() => onGenerateMissing(gap.jobs[0].kind, gap.jobs[0].preset)} className="btn-secondary text-sm" disabled={building}>
              Generate missing: {gap.jobs[0].kind === 'print' ? 'print files' : `${gap.jobs[0].preset?.format || gap.jobs[0].kind}`}…
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="btn-secondary text-sm" disabled={building}>Cancel</button>
          <button type="button" onClick={() => void build()} className="btn-primary text-sm flex items-center gap-1" disabled={building || !targets.length} data-testid="build-bundle">
            {building ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Build ZIP
          </button>
        </div>
      </div>
    </div>
  )
}
