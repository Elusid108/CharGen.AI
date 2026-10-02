/**
 * Imperative three.js viewport for the 3D Studio. The only module (besides glbTextures.js) that
 * imports three — and it does so dynamically so the Studio chunk is loaded on demand.
 *
 * createViewport(host, callbacks) → { loadFile, clear, frame, play, pause, seek, setSpeed, setLoop,
 *   setWireframe, setSkeleton, setGrid, setExposure, setGizmoMode, setSnap, setTransform,
 *   resetTransform, getTransform, getClips, getStats, dispose }
 */

const DEG = Math.PI / 180

async function loadThree() {
  const [THREE, orbit, transform, env] = await Promise.all([
    import('three'),
    import('three/examples/jsm/controls/OrbitControls.js'),
    import('three/examples/jsm/controls/TransformControls.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ])
  return { THREE, OrbitControls: orbit.OrbitControls, TransformControls: transform.TransformControls, RoomEnvironment: env.RoomEnvironment }
}

export function extensionOf(fileKeyOrName) {
  const m = /\.([a-z0-9]+)$/i.exec(String(fileKeyOrName || ''))
  return m ? m[1].toLowerCase() : ''
}

async function loadModelByExt(THREE, url, ext) {
  switch (ext) {
    case 'glb':
    case 'gltf': {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(url)
      return { object: gltf.scene, animations: gltf.animations || [] }
    }
    case 'stl': {
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
      const geometry = await new STLLoader().loadAsync(url)
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
      const material = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.6, metalness: 0.05 })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = 'stl'
      return { object: mesh, animations: [] }
    }
    case '3mf': {
      const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js')
      const group = await new ThreeMFLoader().loadAsync(url)
      group.traverse((o) => {
        if (o.isMesh && (!o.material || o.material.type === 'MeshBasicMaterial')) {
          o.material = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.6, metalness: 0.05 })
        }
      })
      return { object: group, animations: [] }
    }
    case 'fbx': {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
      const group = await new FBXLoader().loadAsync(url)
      return { object: group, animations: group.animations || [] }
    }
    case 'usdz': {
      const { USDZLoader } = await import('three/examples/jsm/loaders/USDZLoader.js')
      const group = await new USDZLoader().loadAsync(url)
      return { object: group, animations: [] }
    }
    default:
      throw new Error(`Preview not available for .${ext || '?'} files`)
  }
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose?.()
      m.dispose?.()
    }
    if (o.skeleton?.boneTexture) o.skeleton.boneTexture.dispose?.()
  })
}

/** Triangle / vertex counts plus axis-aligned bounds (model units, before the user transform). */
export function computeStats(THREE, object) {
  let triangles = 0
  let vertices = 0
  let meshes = 0
  let skinned = 0
  let bones = 0
  const materials = new Set()
  const textures = new Set()
  object.traverse((o) => {
    if (o.isBone) bones += 1
    if (!o.isMesh) return
    meshes += 1
    if (o.isSkinnedMesh) skinned += 1
    const g = o.geometry
    if (g) {
      const pos = g.getAttribute('position')
      const count = pos ? pos.count : 0
      vertices += count
      const faces = g.index ? g.index.count / 3 : count / 3
      triangles += o.isInstancedMesh ? faces * (o.count || 1) : faces
    }
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      materials.add(m.uuid)
      for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v.uuid)
    }
  })
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  if (!box.isEmpty()) {
    box.getSize(size)
    box.getCenter(center)
  }
  return {
    triangles: Math.round(triangles),
    vertices,
    meshes,
    skinned,
    bones,
    materials: materials.size,
    textures: textures.size,
    bounds: [size.x, size.y, size.z],
    center: [center.x, center.y, center.z],
    min: [box.min.x, box.min.y, box.min.z],
  }
}

/**
 * @param {HTMLElement} host
 * @param {{ onTransformChange?: (t) => void, onStats?: (s) => void, onClips?: (clips: {name:string,duration:number}[]) => void, onTick?: (t: {time:number,duration:number,playing:boolean,clip:string|null}) => void, onError?: (e) => void }} cb
 */
export async function createViewport(host, cb = {}) {
  const { THREE, OrbitControls, TransformControls, RoomEnvironment } = await loadThree()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1120)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000)
  camera.position.set(1.6, 1.2, 2.4)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  host.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 0.6)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(3, 5, 2)
  scene.add(key)

  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b)
  grid.material.transparent = true
  grid.material.opacity = 0.7
  scene.add(grid)
  const axes = new THREE.AxesHelper(0.5)
  scene.add(axes)

  const root = new THREE.Group()
  root.name = 'asset-root'
  scene.add(root)

  const orbit = new OrbitControls(camera, renderer.domElement)
  orbit.enableDamping = true
  orbit.dampingFactor = 0.08
  orbit.target.set(0, 0.8, 0)

  const gizmo = new TransformControls(camera, renderer.domElement)
  gizmo.setSize(0.8)
  gizmo.enabled = false
  gizmo.visible = false
  const gizmoHelper = gizmo.getHelper()
  scene.add(gizmoHelper)
  gizmoHelper.visible = false
  gizmo.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value
  })
  gizmo.addEventListener('objectChange', () => {
    if (cb.onTransformChange) cb.onTransformChange(api.getTransform())
  })

  let model = null
  let mixer = null
  let actions = {}
  let clips = []
  let currentClip = null
  let playing = false
  let speed = 1
  let loop = true
  let skeletonHelper = null
  let wireframe = false
  let stats = null
  let disposed = false
  let lastTick = 0
  const clock = new THREE.Clock()

  function resize() {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  let raf = 0
  function tick() {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    const dt = clock.getDelta()
    if (mixer && playing) mixer.update(dt * speed)
    orbit.update()
    renderer.render(scene, camera)
    if (mixer && cb.onTick) {
      const now = performance.now()
      if (now - lastTick > 66 || !playing) {
        lastTick = now
        cb.onTick(api.getPlayback())
      }
    }
  }
  raf = requestAnimationFrame(tick)

  function applyWireframe(obj, on) {
    obj.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of mats) if ('wireframe' in m) m.wireframe = on
    })
  }

  function clearModel() {
    if (mixer) {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
    if (skeletonHelper) {
      scene.remove(skeletonHelper)
      skeletonHelper.dispose?.()
      skeletonHelper = null
    }
    gizmo.detach()
    if (model) {
      root.remove(model)
      disposeObject(model)
    }
    model = null
    mixer = null
    actions = {}
    clips = []
    currentClip = null
    playing = false
    stats = null
  }

  const api = {
    /** Load a model file into the root group; resolves with stats. */
    async loadFile(url, fileKeyOrName, { autoFrame = true, transform = null } = {}) {
      const ext = extensionOf(fileKeyOrName)
      const loaded = await loadModelByExt(THREE, url, ext)
      if (disposed) {
        disposeObject(loaded.object)
        return null
      }
      clearModel()
      model = loaded.object
      root.add(model)
      if (transform) api.setTransform(transform)
      else api.resetTransform()
      applyWireframe(model, wireframe)

      clips = (loaded.animations || []).map((c) => ({ name: c.name || `clip ${clips.length + 1}`, duration: c.duration, clip: c }))
      if (clips.length) {
        mixer = new THREE.AnimationMixer(model)
        for (const c of clips) {
          const action = mixer.clipAction(c.clip)
          action.clampWhenFinished = true
          actions[c.name] = action
        }
      }
      stats = computeStats(THREE, model)
      if (cb.onStats) cb.onStats(stats)
      if (cb.onClips) cb.onClips(clips.map((c) => ({ name: c.name, duration: c.duration })))
      if (api.skeletonOn) api.setSkeleton(true)
      if (autoFrame) api.frame()
      if (clips.length) api.play(clips[0].name)
      return stats
    },

    clear() {
      clearModel()
      if (cb.onStats) cb.onStats(null)
      if (cb.onClips) cb.onClips([])
    },

    /** Fit the camera to the (transformed) model. */
    frame() {
      const box = new THREE.Box3().setFromObject(root)
      if (box.isEmpty()) {
        orbit.target.set(0, 0.8, 0)
        camera.position.set(1.6, 1.2, 2.4)
        orbit.update()
        return
      }
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      const radius = (size.length() / 2) || 0.5
      const dist = radius / Math.sin((camera.fov * DEG) / 2) * 1.15
      camera.near = Math.max(0.001, dist / 500)
      camera.far = Math.max(100, dist * 50)
      camera.updateProjectionMatrix()
      const dir = new THREE.Vector3(0.55, 0.35, 1).normalize()
      camera.position.copy(center).addScaledVector(dir, dist)
      orbit.target.copy(center)
      orbit.update()
      grid.position.y = box.min.y
    },

    // --- animation ---
    getClips: () => clips.map((c) => ({ name: c.name, duration: c.duration })),
    play(name = currentClip || clips[0]?.name) {
      if (!mixer || !name || !actions[name]) return
      if (currentClip && currentClip !== name) actions[currentClip].stop()
      const action = actions[name]
      if (currentClip !== name) action.reset()
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      action.paused = false
      action.enabled = true
      action.play()
      currentClip = name
      playing = true
      if (cb.onTick) cb.onTick(api.getPlayback())
    },
    pause() {
      playing = false
      if (currentClip && actions[currentClip]) actions[currentClip].paused = true
      if (cb.onTick) cb.onTick(api.getPlayback())
    },
    stop() {
      playing = false
      if (currentClip && actions[currentClip]) {
        actions[currentClip].reset()
        actions[currentClip].paused = true
        mixer.update(0)
      }
      if (cb.onTick) cb.onTick(api.getPlayback())
    },
    seek(time) {
      if (!mixer || !currentClip) return
      const action = actions[currentClip]
      const dur = action.getClip().duration || 0
      action.paused = false
      action.enabled = true
      if (!action.isRunning()) action.play()
      action.time = Math.max(0, Math.min(dur, Number(time) || 0))
      mixer.update(0)
      if (!playing) action.paused = true
      if (cb.onTick) cb.onTick(api.getPlayback())
    },
    setSpeed(v) {
      speed = Math.max(0.05, Math.min(4, Number(v) || 1))
    },
    setLoop(on) {
      loop = !!on
      if (currentClip && actions[currentClip]) actions[currentClip].setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    },
    getPlayback() {
      const action = currentClip ? actions[currentClip] : null
      return {
        clip: currentClip,
        time: action ? action.time : 0,
        duration: action ? action.getClip().duration : 0,
        playing,
        speed,
        loop,
      }
    },

    // --- display ---
    setWireframe(on) {
      wireframe = !!on
      if (model) applyWireframe(model, wireframe)
    },
    skeletonOn: false,
    setSkeleton(on) {
      api.skeletonOn = !!on
      if (skeletonHelper) {
        scene.remove(skeletonHelper)
        skeletonHelper.dispose?.()
        skeletonHelper = null
      }
      if (!on || !model) return
      let hasBones = false
      model.traverse((o) => {
        if (o.isSkinnedMesh || o.isBone) hasBones = true
      })
      if (!hasBones) return
      skeletonHelper = new THREE.SkeletonHelper(model)
      skeletonHelper.material.depthTest = false
      skeletonHelper.material.depthWrite = false
      skeletonHelper.material.transparent = true
      skeletonHelper.renderOrder = 999
      scene.add(skeletonHelper)
    },
    hasSkeleton() {
      let has = false
      model?.traverse((o) => {
        if (o.isSkinnedMesh) has = true
      })
      return has
    },
    setGrid(on) {
      grid.visible = !!on
      axes.visible = !!on
    },
    setExposure(v) {
      renderer.toneMappingExposure = Math.max(0.1, Math.min(4, Number(v) || 1))
    },
    setBackground(hex) {
      scene.background = new THREE.Color(hex)
    },

    // --- transform gizmo ---
    setGizmoMode(mode) {
      if (!mode || !model) {
        gizmo.detach()
        gizmo.enabled = false
        gizmoHelper.visible = false
        return
      }
      gizmo.setMode(mode)
      gizmo.attach(root)
      gizmo.enabled = true
      gizmoHelper.visible = true
    },
    setSnap(on) {
      gizmo.setTranslationSnap(on ? 0.05 : null)
      gizmo.setRotationSnap(on ? 15 * DEG : null)
      gizmo.setScaleSnap(on ? 0.1 : null)
    },
    setTransform(t) {
      const p = Array.isArray(t?.position) ? t.position : [0, 0, 0]
      const r = Array.isArray(t?.rotation) ? t.rotation : [0, 0, 0]
      const s = Number(t?.scale) > 0 ? Number(t.scale) : 1
      root.position.set(Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0)
      root.rotation.set((Number(r[0]) || 0) * DEG, (Number(r[1]) || 0) * DEG, (Number(r[2]) || 0) * DEG)
      root.scale.setScalar(s)
    },
    resetTransform() {
      root.position.set(0, 0, 0)
      root.rotation.set(0, 0, 0)
      root.scale.setScalar(1)
      if (cb.onTransformChange) cb.onTransformChange(api.getTransform())
    },
    /** Rotation in degrees, uniform scale — matches the record's `transform` field. */
    getTransform() {
      const round = (n) => Math.round(n * 1000) / 1000
      return {
        position: [round(root.position.x), round(root.position.y), round(root.position.z)],
        rotation: [round(root.rotation.x / DEG), round(root.rotation.y / DEG), round(root.rotation.z / DEG)],
        scale: round(root.scale.x),
      }
    },
    getStats: () => stats,
    /** Current frame as a JPEG data URL (for thumbnails). */
    snapshot(type = 'image/jpeg', quality = 0.85) {
      renderer.render(scene, camera)
      return renderer.domElement.toDataURL(type, quality)
    },

    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      clearModel()
      gizmo.dispose()
      orbit.dispose()
      scene.remove(gizmoHelper)
      pmrem.dispose()
      scene.environment?.dispose?.()
      grid.geometry.dispose()
      grid.material.dispose()
      axes.geometry.dispose()
      axes.material.dispose()
      renderer.dispose()
      renderer.forceContextLoss?.()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    },
  }

  return api
}
