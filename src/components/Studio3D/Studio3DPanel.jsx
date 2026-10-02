import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useCharacterStore } from '../../hooks/useCharacter'
import { useUiStore } from '../../hooks/useUi'
import { useToastStore } from '../../hooks/useToast'
import { useTripoJobs, meshSourceReady } from '../../hooks/useTripoJobs'
import { findAssetRecord, listAllAssets, recordHasMesh } from '../../utils/tripoModels'
import { defaultViewKey, isPreviewableKey, viewableFiles } from '../../utils/studioFiles'
import { resolveTripoTransportStatus } from '../../utils/tripo'
import {
  cancelAssetJob,
  deleteModelVersion,
  downloadAssetFile,
  getAssetFileUrl,
  isAssetBusy,
  refreshTripoBalanceSilent,
  restoreModelVersion,
  resumeInFlightTripoJobs,
} from '../../utils/tripoJobs'
import { patchAsset, persistCharacterMeta } from '../../utils/tripoJobRunner'
import ThreeViewport from './ThreeViewport'
import ViewportToolbar from './ViewportToolbar'
import AnimationBar from './AnimationBar'
import StatsPanel from './StatsPanel'
import AssetList from './AssetList'
import ActionRail from './ActionRail'
import ExportBundleModal from './ExportBundleModal'

const DEFAULT_SETTINGS = { gizmoMode: null, snap: false, wireframe: false, skeleton: false, grid: true, exposure: 1 }
const STATS_KEYS = ['mesh.glb', 'rig.glb']

function sameTarget(a, b) {
  return !!a && !!b && a.slot === b.slot && (a.outfitId || null) === (b.outfitId || null) && a.assetId === b.assetId
}

export default function Studio3DPanel() {
  const generatedModels = useCharacterStore((s) => s.generatedModels)
  const generatedImages = useCharacterStore((s) => s.generatedImages)
  const wardrobe = useCharacterStore((s) => s.wardrobe)
  const tripoApiKey = useCharacterStore((s) => s.tripoApiKey)
  const tripoBalance = useCharacterStore((s) => s.tripoBalance)
  const tripoProxyUrl = useCharacterStore((s) => s.tripoProxyUrl)
  const tripoActiveJobs = useCharacterStore((s) => s.tripoActiveJobs)
  const studioFocus = useUiStore((s) => s.studioFocus)
  const clearStudioFocus = useUiStore((s) => s.clearStudioFocus)
  const addToast = useToastStore((s) => s.addToast)

  const [selected, setSelected] = useState(null)
  const [viewKey, setViewKey] = useState(null)
  const [src, setSrc] = useState(null)
  const [stats, setStats] = useState(null)
  const [clips, setClips] = useState([])
  const [playback, setPlayback] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [exportOpen, setExportOpen] = useState(false)
  const viewportRef = useRef(null)
  const transformTimer = useRef(null)

  const record = useMemo(
    () => (selected ? findAssetRecord(generatedModels, selected.slot, selected.outfitId, selected.assetId) : null),
    [generatedModels, selected],
  )
  const files = useMemo(() => viewableFiles(record), [record])
  const filesSignature = useMemo(() => files.map((f) => `${f.key}:${f.stored ? 1 : 0}`).join('|'), [files])
  const entry = record && viewKey ? record.files?.[viewKey] : null
  const activeJob = record?.activeJobId ? record.jobs?.[record.activeJobId] : null
  const busy = !!(selected && (isAssetBusy(selected) || (activeJob && !['success', 'failed', 'cancelled', 'expired'].includes(activeJob.status))))
  const transportStatus = resolveTripoTransportStatus({ proxyUrl: tripoProxyUrl, hostname: typeof window !== 'undefined' ? window.location.hostname : '' })
  const statsForJobs = stats && viewKey && STATS_KEYS.includes(viewKey) ? { ...stats, forFileKey: viewKey } : record?.stats || null

  const { openJob, overlays } = useTripoJobs({ stats: statsForJobs })

  useEffect(() => {
    if (tripoApiKey) {
      void refreshTripoBalanceSilent()
      void resumeInFlightTripoJobs()
    }
  }, [tripoApiKey])

  // Jump requested from another panel.
  useEffect(() => {
    if (!studioFocus) return
    if (studioFocus.assetId) {
      setSelected({ slot: studioFocus.slot, outfitId: studioFocus.outfitId || null, assetId: studioFocus.assetId })
      if (studioFocus.fileKey) setViewKey(studioFocus.fileKey)
    }
    clearStudioFocus()
  }, [studioFocus, clearStudioFocus])

  // Default selection + drop a selection whose record vanished.
  useEffect(() => {
    if (selected && record) return
    const all = listAllAssets(generatedModels)
    const pick = all.find((a) => !a.archived && recordHasMesh(a.record)) || all.find((a) => !a.archived) || null
    if (pick) {
      const next = { slot: pick.slot, outfitId: pick.outfitId, assetId: pick.record.id }
      if (!sameTarget(next, selected)) setSelected(next)
    } else if (selected) {
      setSelected(null)
    }
  }, [generatedModels, selected, record])

  // Keep the view key valid for the selected record.
  useEffect(() => {
    const next = defaultViewKey(record, viewKey)
    if (next !== viewKey) setViewKey(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, filesSignature])

  // Resolve the file to an object URL.
  useEffect(() => {
    let cancelled = false
    let url = null
    if (!selected || !record || !viewKey || !isPreviewableKey(viewKey) || !record.files?.[viewKey]) {
      setSrc(null)
      return undefined
    }
    getAssetFileUrl({ ...selected, fileKey: viewKey }).then((u) => {
      if (cancelled) {
        if (u && u.startsWith('blob:')) URL.revokeObjectURL(u)
        return
      }
      url = u
      setSrc(u)
    }).catch(() => {
      if (!cancelled) setSrc(null)
    })
    return () => {
      cancelled = true
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.slot, selected?.outfitId, selected?.assetId, viewKey, entry?.stored, entry?.taskId])

  useEffect(() => () => clearTimeout(transformTimer.current), [])

  const handleTransformChange = useCallback((t) => {
    if (!selected) return
    clearTimeout(transformTimer.current)
    const target = selected
    transformTimer.current = setTimeout(() => {
      patchAsset(target, { transform: t })
      persistCharacterMeta().catch(() => {})
    }, 400)
  }, [selected])

  const handleStats = useCallback((s) => {
    setStats(s)
    if (!s || !selected || !viewKey || !STATS_KEYS.includes(viewKey)) return
    const next = { triangles: s.triangles, vertices: s.vertices, bounds: s.bounds, forFileKey: viewKey }
    const prev = record?.stats
    if (prev && prev.forFileKey === viewKey && prev.triangles === next.triangles && prev.vertices === next.vertices) return
    patchAsset(selected, { stats: next })
    persistCharacterMeta().catch(() => {})
  }, [selected, viewKey, record?.stats])

  const handleClips = useCallback((c) => {
    setClips(c)
    if (!c.length) setPlayback(null)
  }, [])

  const handleSelect = useCallback((target) => {
    setSelected(target)
    setSettings((s) => ({ ...s, gizmoMode: null }))
  }, [])

  const handleSnapshot = () => {
    const data = viewportRef.current?.snapshot()
    if (!data) return
    const a = document.createElement('a')
    a.href = data
    a.download = `${(record?.slot || 'asset')}_${(record?.id || '').slice(0, 6)}.jpg`
    a.click()
  }

  const handleDelete = async (assetId) => {
    if (!selected) return
    if (!window.confirm('Delete this 3D version and every file stored for it? This cannot be undone.')) return
    await deleteModelVersion({ slot: selected.slot, outfitId: selected.outfitId, assetId })
    if (assetId === selected.assetId) setSelected(null)
  }

  // Keyboard shortcuts (ignored while typing).
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'g') setSettings((s) => ({ ...s, gizmoMode: s.gizmoMode === 'translate' ? null : 'translate' }))
      else if (k === 'r') setSettings((s) => ({ ...s, gizmoMode: s.gizmoMode === 'rotate' ? null : 'rotate' }))
      else if (k === 's') setSettings((s) => ({ ...s, gizmoMode: s.gizmoMode === 'scale' ? null : 'scale' }))
      else if (k === 'f') viewportRef.current?.frame()
      else if (k === 'escape') setSettings((s) => ({ ...s, gizmoMode: null }))
      else if (k === ' ' && clips.length) {
        e.preventDefault()
        if (playback?.playing) viewportRef.current?.pause()
        else viewportRef.current?.play(playback?.clip)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clips.length, playback?.playing, playback?.clip])

  const sourceReady = useCallback((slot, outfitId) => meshSourceReady(slot, outfitId, { generatedImages, wardrobe }), [generatedImages, wardrobe])
  const hasSkeleton = !!(stats && stats.skinned > 0)

  return (
    <div className="h-full flex min-w-0 bg-slate-950" data-testid="studio3d">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/60 shrink-0 hidden md:flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-slate-800">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Assets</p>
        </div>
        <div className="flex-1 min-h-0">
          <AssetList
            generatedModels={generatedModels}
            wardrobe={wardrobe}
            selected={selected}
            onSelect={handleSelect}
            onGenerate={(slot, outfitId) => openJob('mesh', { slot, outfitId })}
            sourceReady={sourceReady}
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!tripoApiKey ? (
          <div className="px-3 py-1.5 text-[11px] text-amber-300 bg-amber-950/30 border-b border-amber-900/50 flex items-center gap-2">
            <KeyRound size={12} /> Add a Tripo API key in Settings to generate, rig, animate or convert. Viewing stored meshes works without it.
          </div>
        ) : null}
        <ViewportToolbar
          files={files}
          viewKey={viewKey}
          onViewKey={setViewKey}
          settings={settings}
          onSettings={setSettings}
          onFrame={() => viewportRef.current?.frame()}
          onResetTransform={() => viewportRef.current?.resetTransform()}
          onSnapshot={handleSnapshot}
          hasSkeleton={hasSkeleton}
        />
        <div className="flex-1 min-h-0 relative">
          <ThreeViewport
            ref={viewportRef}
            src={src}
            fileKey={viewKey}
            transform={record?.transform}
            settings={settings}
            onTransformChange={handleTransformChange}
            onStats={handleStats}
            onClips={handleClips}
            onTick={setPlayback}
            emptyHint={record ? (viewKey ? 'Loading…' : 'This version has no previewable file yet.') : 'Select an asset, or press + beside a source to generate one.'}
          />
        </div>
        <AnimationBar
          clips={clips}
          playback={playback}
          onPlay={(name) => viewportRef.current?.play(name)}
          onPause={() => viewportRef.current?.pause()}
          onStop={() => viewportRef.current?.stop()}
          onSeek={(t) => viewportRef.current?.seek(t)}
          onSpeed={(v) => {
            viewportRef.current?.setSpeed(v)
            setPlayback((p) => (p ? { ...p, speed: v } : p))
          }}
          onLoop={(on) => {
            viewportRef.current?.setLoop(on)
            setPlayback((p) => (p ? { ...p, loop: on } : p))
          }}
        />
        <StatsPanel record={record} stats={src ? stats : null} viewKey={viewKey} />
      </div>

      <aside className="w-72 border-l border-slate-800 bg-slate-900/60 shrink-0 hidden lg:block min-h-0">
        <ActionRail
          record={record}
          target={selected}
          busy={busy}
          activeJob={activeJob}
          balance={tripoBalance}
          tripoApiKey={tripoApiKey}
          transportStatus={transportStatus}
          viewKey={viewKey}
          generatedModels={generatedModels}
          onJob={(kind, preset) => selected && openJob(kind, selected, preset)}
          onCancel={() => {
            if (selected && cancelAssetJob(selected)) addToast('Cancelling… Tripo may still bill a task that already started.', 'warning', 5000)
          }}
          onDownload={(key) => selected && key && void downloadAssetFile({ ...selected, fileKey: key })}
          onExport={() => setExportOpen(true)}
          onSelectVersion={(assetId) => selected && setSelected({ ...selected, assetId })}
          onRestore={(assetId) => selected && void restoreModelVersion({ slot: selected.slot, outfitId: selected.outfitId, assetId })}
          onDelete={(assetId) => void handleDelete(assetId)}
          onRefreshBalance={() => void refreshTripoBalanceSilent()}
        />
      </aside>

      {overlays}
      {exportOpen && record && selected ? (
        <ExportBundleModal
          target={selected}
          record={record}
          onClose={() => setExportOpen(false)}
          onGenerateMissing={(kind, preset) => {
            setExportOpen(false)
            openJob(kind, selected, preset)
          }}
        />
      ) : null}
      {Object.keys(tripoActiveJobs || {}).length > 1 ? (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-cyan-200 bg-cyan-950/80 border border-cyan-800 rounded-full px-3 py-1 pointer-events-none">
          {Object.keys(tripoActiveJobs).length} Tripo jobs running
        </div>
      ) : null}
    </div>
  )
}
