import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Loader2, Box } from 'lucide-react'
import { createViewport } from '../../utils/threeScene'

/**
 * Thin React wrapper over threeScene.createViewport. Loads `src` (object URL) whenever it or
 * `fileKey` changes, and forwards display settings. Imperative playback API via ref.
 */
const ThreeViewport = forwardRef(function ThreeViewport(
  { src, fileKey, transform, settings, onTransformChange, onStats, onClips, onTick, emptyHint },
  ref,
) {
  const hostRef = useRef(null)
  const apiRef = useRef(null)
  const cbRef = useRef({})
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  cbRef.current = { onTransformChange, onStats, onClips, onTick }

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return undefined
    ;(async () => {
      try {
        const api = await createViewport(host, {
          onTransformChange: (t) => cbRef.current.onTransformChange?.(t),
          onStats: (s) => cbRef.current.onStats?.(s),
          onClips: (c) => cbRef.current.onClips?.(c),
          onTick: (p) => cbRef.current.onTick?.(p),
        })
        if (cancelled) {
          api.dispose()
          return
        }
        apiRef.current = api
        setReady(true)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'WebGL viewport failed to start')
      }
    })()
    return () => {
      cancelled = true
      apiRef.current?.dispose()
      apiRef.current = null
      setReady(false)
    }
  }, [])

  // Load the file.
  useEffect(() => {
    const api = apiRef.current
    if (!ready || !api) return undefined
    let cancelled = false
    if (!src) {
      api.clear()
      setError(null)
      return undefined
    }
    setLoading(true)
    setError(null)
    api.loadFile(src, fileKey, { transform }).then(() => {
      if (!cancelled) setLoading(false)
    }).catch((e) => {
      if (cancelled) return
      setLoading(false)
      setError(e?.message || 'Could not load this file')
      api.clear()
    })
    return () => {
      cancelled = true
    }
    // transform is applied at load time only; live edits go through setTransform below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, src, fileKey])

  useEffect(() => {
    const api = apiRef.current
    if (!ready || !api || !settings) return
    api.setGizmoMode(settings.gizmoMode || null)
    api.setSnap(!!settings.snap)
    api.setWireframe(!!settings.wireframe)
    api.setSkeleton(!!settings.skeleton)
    api.setGrid(settings.grid !== false)
    api.setExposure(settings.exposure ?? 1)
  }, [ready, settings, src, fileKey])

  useImperativeHandle(ref, () => ({
    get api() {
      return apiRef.current
    },
    play: (name) => apiRef.current?.play(name),
    pause: () => apiRef.current?.pause(),
    stop: () => apiRef.current?.stop(),
    seek: (t) => apiRef.current?.seek(t),
    setSpeed: (v) => apiRef.current?.setSpeed(v),
    setLoop: (on) => apiRef.current?.setLoop(on),
    frame: () => apiRef.current?.frame(),
    resetTransform: () => apiRef.current?.resetTransform(),
    setTransform: (t) => apiRef.current?.setTransform(t),
    getTransform: () => apiRef.current?.getTransform(),
    hasSkeleton: () => !!apiRef.current?.hasSkeleton(),
    snapshot: () => apiRef.current?.snapshot(),
  }), [])

  return (
    <div className="relative w-full h-full bg-[#0b1120]" data-testid="three-viewport">
      <div ref={hostRef} className="absolute inset-0" />
      {(!src && ready && !error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
          <Box size={36} className="mb-2" />
          <p className="text-sm">{emptyHint || 'Select an asset to preview it here.'}</p>
        </div>
      )}
      {(loading || !ready) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 pointer-events-none">
          <Loader2 className="animate-spin text-cyan-400" size={28} />
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
          <p className="text-xs text-red-300 bg-red-950/70 border border-red-800 rounded-lg px-3 py-1.5">{error}</p>
        </div>
      )}
    </div>
  )
})

export default ThreeViewport
