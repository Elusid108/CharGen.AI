/**
 * Mesh profiles: what a generated asset is for. They pre-fill the generation options and decide
 * which follow-up operations make sense. Both are editable in the options dialog.
 */

import { DEFAULT_MODEL, TRIPO_MODELS, clampFaceLimit } from './tripoEndpoints'

export const MESH_PROFILES = {
  animation: {
    id: 'animation',
    label: 'Animation / game',
    hint: 'Textured PBR, rig-ready, LODs via decimate. Export FBX / glTF / USDZ.',
    generation: {
      model: DEFAULT_MODEL,
      texture: true,
      textureQuality: 'detailed',
      geometryQuality: 'standard',
      quad: false,
      autoSize: true,
      orientation: 'align_image',
      textureAlignment: 'original_image',
      smartLowPoly: false,
    },
    followUps: ['rig', 'retarget', 'decimate', 'convert:FBX', 'convert:GLTF', 'convert:USDZ'],
  },
  print: {
    id: 'print',
    label: '3D print',
    hint: 'Untextured, detailed geometry, flattened base, pivot at centre-bottom, scaled to a height in mm.',
    generation: {
      model: DEFAULT_MODEL,
      texture: false,
      geometryQuality: 'detailed',
      quad: false,
      autoSize: true,
      smartLowPoly: false,
    },
    convert: { formats: ['STL', '3MF'], flattenBottom: true, flattenBottomThreshold: 0.01, pivotToCenterBottom: true },
    followUps: ['convert:STL', 'convert:3MF'],
  },
}
export const PROFILE_IDS = Object.keys(MESH_PROFILES)

/**
 * Merge profile defaults with user overrides and drop fields that do not apply to the source.
 * @param {'animation'|'print'} profileId
 * @param {object} overrides
 * @param {{ source: 'multiview'|'image'|'text' }} ctx
 */
export function profileGenerationOptions(profileId, overrides = {}, { source = 'image' } = {}) {
  const profile = MESH_PROFILES[profileId] || MESH_PROFILES.animation
  const merged = { ...profile.generation, ...stripUndefined(overrides) }
  const model = TRIPO_MODELS[merged.model] ? merged.model : DEFAULT_MODEL
  const out = { ...merged, model }
  if (source !== 'image') {
    delete out.orientation
    delete out.textureAlignment
    delete out.enableImageAutofix
  }
  if (out.texture === false) {
    delete out.textureQuality
    delete out.textureAlignment
  }
  if (TRIPO_MODELS[model].lowPoly) out.faceLimit = clampFaceLimit(model, out.faceLimit)
  else if (out.faceLimit == null) delete out.faceLimit
  return out
}

function stripUndefined(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined) out[k] = v
  return out
}

/** scale_factor for convert: target height in mm over the viewer-measured height in metres. */
export function printScaleFactor(stats, heightMm) {
  const y = Number(stats?.bounds?.[1])
  const h = Number(heightMm)
  if (!Number.isFinite(y) || y <= 0 || !Number.isFinite(h) || h <= 0) return null
  return h / (y * 1000)
}

export function profileBadge(record) {
  const p = MESH_PROFILES[record?.profile] || MESH_PROFILES.animation
  return { id: p.id, label: p.label }
}
