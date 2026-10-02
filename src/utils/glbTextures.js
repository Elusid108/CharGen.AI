/**
 * Extract PBR texture maps from a GLB as PNG blobs (browser only; dynamic three import).
 * Used when an FBX archive from Tripo ships without textures so Unity / Unreal still get a
 * texture set beside the FBX.
 */

const MAP_SLOTS = [
  ['map', 'BaseColor'],
  ['normalMap', 'Normal'],
  ['metalnessMap', 'MetallicRoughness'],
  ['roughnessMap', 'MetallicRoughness'],
  ['emissiveMap', 'Emissive'],
  ['aoMap', 'Occlusion'],
]

async function imageToPngBlob(image) {
  const w = image.width || image.videoWidth || 0
  const h = image.height || image.videoHeight || 0
  if (!w || !h) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

/**
 * @param {Blob|ArrayBuffer|Uint8Array} glb
 * @param {string} baseName
 * @returns {Promise<{ name: string, blob: Blob, slot: string }[]>}
 */
export async function extractPbrTextures(glb, baseName = 'texture') {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
  const buffer = glb instanceof Blob ? await glb.arrayBuffer() : glb instanceof Uint8Array ? glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) : glb
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject))
  const seen = new Map()
  const out = []
  let matIndex = 0
  const materials = []
  gltf.scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) if (!materials.includes(m)) materials.push(m)
  })
  for (const m of materials) {
    matIndex += 1
    for (const [slot, label] of MAP_SLOTS) {
      const tex = m[slot]
      if (!tex || !tex.image) continue
      if (seen.has(tex.uuid)) continue
      const blob = await imageToPngBlob(tex.image)
      if (!blob) continue
      seen.set(tex.uuid, true)
      const name = `${baseName}${materials.length > 1 ? `_mat${matIndex}` : ''}_${label}.png`
      out.push({ name, blob, slot: label })
    }
  }
  gltf.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose?.()
      m.dispose?.()
    }
  })
  return out
}
