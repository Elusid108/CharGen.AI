import React, { useEffect, useRef } from 'react'

export default function Model3DStlPreview({ blobUrl }) {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !blobUrl) return undefined
    let disposed = false
    let renderer
    let controls
    let resizeObserver

    ;(async () => {
      const THREE = await import('three')
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      if (disposed || !hostRef.current) return

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x020617)
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200)
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      host.innerHTML = ''
      host.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.7))
      const key = new THREE.DirectionalLight(0xffffff, 0.9)
      key.position.set(2, 4, 3)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x67e8f9, 0.35)
      fill.position.set(-3, 1, -2)
      scene.add(fill)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }

      const geometry = await new STLLoader().loadAsync(blobUrl)
      if (disposed) {
        geometry.dispose()
        return
      }
      geometry.computeVertexNormals()
      geometry.center()
      const material = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.05,
        roughness: 0.55,
      })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const box = new THREE.Box3().setFromObject(mesh)
      const size = box.getSize(new THREE.Vector3()).length() || 1
      const mid = box.getCenter(new THREE.Vector3())
      controls.target.copy(mid)
      camera.position.copy(mid).add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.8))
      camera.near = size / 100
      camera.far = size * 20
      camera.updateProjectionMatrix()
      controls.update()

      const resize = () => {
        if (!hostRef.current || !renderer) return
        const w = hostRef.current.clientWidth || 1
        const h = hostRef.current.clientHeight || 1
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h, false)
      }
      resize()
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)

      const tick = () => {
        if (disposed) return
        controls.update()
        renderer.render(scene, camera)
        requestAnimationFrame(tick)
      }
      tick()
    })().catch(() => {})

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      controls?.dispose()
      renderer?.dispose()
      if (host) host.innerHTML = ''
    }
  }, [blobUrl])

  return <div ref={hostRef} className="absolute inset-0 touch-none" />
}
