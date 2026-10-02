/**
 * Tripo OpenAPI v3 (path-style) registry: routes, option enums, and pure payload builders.
 * Verified against the official @vastai/tripo-sdk. Every builder drops undefined keys and
 * clamps numbers so a payload can be asserted in tests without a network.
 */

export const TRIPO_ROUTES = {
  files: '/files',
  balance: '/account/balance',
  task: (id) => `/tasks/${id}`,
  tasksList: '/tasks/list',
  textToModel: '/generation/text-to-model',
  imageToModel: '/generation/image-to-model',
  multiviewToModel: '/generation/multiview-to-model',
  texture: '/models/texture',
  convert: '/models/convert',
  segment: '/mesh/segment',
  complete: '/mesh/complete',
  decimate: '/mesh/decimate',
  rigCheck: '/animations/rig-check',
  rig: '/animations/rig',
  retarget: '/animations/retarget',
}

export const TRIPO_MODELS = {
  'v3.1-20260211': { id: 'v3.1-20260211', label: 'H3.1 — quality (default)', family: 'h3', quad: false, lowPoly: false, hint: 'Best geometry and PBR texture. Texture included in the base price.' },
  'v3.0-20250812': { id: 'v3.0-20250812', label: 'H3.0 — stable', family: 'h3', quad: false, lowPoly: false, hint: 'Previous quality model.' },
  'v2.5-20250123': { id: 'v2.5-20250123', label: 'H2.5 — legacy', family: 'h2', quad: false, lowPoly: false, hint: 'Older model; cheaper look, fewer options.' },
  'P1-20260311': { id: 'P1-20260311', label: 'P1 — game low-poly', family: 'p1', quad: false, lowPoly: true, faceLimit: { min: 1000, max: 20000, def: 5000 }, hint: 'Clean low-poly topology for engines. All-in price.' },
  'P2-20260801': { id: 'P2-20260801', label: 'P2 — quad topology', family: 'p2', quad: true, lowPoly: true, faceLimit: { min: 1000, max: 50000, def: 8000 }, hint: 'Quad output for sculpt / subdivision workflows.' },
}
export const DEFAULT_MODEL = 'v3.1-20260211'
export const MODEL_IDS = Object.keys(TRIPO_MODELS)
export const RIG_MODELS = { biped: 'v1.0-20240301', other: 'v2.5-20260210' }
export const DECIMATE_MODEL = 'P-v2.0-20251226'
export const SEGMENT_MODEL = 'v1.0-20250506'

export const RIG_TYPES = ['biped', 'quadruped', 'hexapod', 'octopod', 'avian', 'serpentine', 'aquatic', 'others']
export const RIG_SPECS = ['mixamo', 'tripo']
export const RIG_OUT_FORMATS = ['glb', 'fbx']

function preset(id, presetName, label, category, rigTypes) {
  return { id, preset: presetName, label, category, rigTypes }
}

export const ANIMATION_PRESETS = [
  preset('idle', 'preset:idle', 'Idle', 'locomotion', ['biped']),
  preset('walk', 'preset:walk', 'Walk', 'locomotion', ['biped']),
  preset('run', 'preset:run', 'Run', 'locomotion', ['biped']),
  preset('turn', 'preset:turn', 'Turn', 'locomotion', ['biped']),
  preset('jump', 'preset:jump', 'Jump', 'action', ['biped']),
  preset('climb', 'preset:climb', 'Climb', 'action', ['biped']),
  preset('dive', 'preset:dive', 'Dive', 'action', ['biped']),
  preset('slash', 'preset:slash', 'Slash', 'action', ['biped']),
  preset('shoot', 'preset:shoot', 'Shoot', 'action', ['biped']),
  preset('hurt', 'preset:hurt', 'Hurt', 'reaction', ['biped']),
  preset('fall', 'preset:fall', 'Fall', 'reaction', ['biped']),
  preset('quadruped-walk', 'preset:quadruped:walk', 'Walk (quadruped)', 'locomotion', ['quadruped']),
  preset('hexapod-walk', 'preset:hexapod:walk', 'Walk (hexapod)', 'locomotion', ['hexapod']),
  preset('octopod-walk', 'preset:octopod:walk', 'Walk (octopod)', 'locomotion', ['octopod']),
  preset('serpentine-march', 'preset:serpentine:march', 'March (serpentine)', 'locomotion', ['serpentine']),
  preset('aquatic-march', 'preset:aquatic:march', 'March (aquatic)', 'locomotion', ['aquatic']),
]
export const ANIMATION_CATEGORIES = ['locomotion', 'action', 'reaction']
export const MAX_PRESETS_PER_RETARGET = 5
export const PRESET_BY_ID = Object.fromEntries(ANIMATION_PRESETS.map((p) => [p.id, p]))
export const PRESET_BY_NAME = Object.fromEntries(ANIMATION_PRESETS.map((p) => [p.preset, p]))

export const CONVERT_FORMATS = {
  GLTF: { id: 'GLTF', ext: 'zip', archive: true, label: 'glTF (separate textures)', textured: true },
  USDZ: { id: 'USDZ', ext: 'usdz', archive: false, label: 'USDZ (Apple AR / USD)', textured: true },
  FBX: { id: 'FBX', ext: 'zip', archive: true, label: 'FBX (Unity / Unreal)', textured: true },
  OBJ: { id: 'OBJ', ext: 'zip', archive: true, label: 'OBJ + MTL', textured: true },
  STL: { id: 'STL', ext: 'stl', archive: false, label: 'STL (3D print)', textured: false },
  '3MF': { id: '3MF', ext: '3mf', archive: false, label: '3MF (3D print)', textured: false },
}
export const CONVERT_FORMAT_IDS = Object.keys(CONVERT_FORMATS)
export const TEXTURE_FORMATS = ['PNG', 'JPEG', 'WEBP', 'TIFF', 'TARGA', 'BMP', 'HDR', 'OPEN_EXR', 'DPX']
export const TEXTURE_QUALITIES = ['standard', 'detailed', 'extreme']
export const GEOMETRY_QUALITIES = ['standard', 'detailed']
export const TEXTURE_ALIGNMENTS = ['original_image', 'geometry']
export const ORIENTATIONS = ['default', 'align_image']
export const FBX_PRESETS = ['mixamo']
/** Convert flags Tripo bills as add-ons (5 credits each on top of the 5 base). */
export const CONVERT_PAID_FLAGS = ['flatten_bottom', 'pivot_to_center_bottom', 'quad', 'pack_uv', 'force_symmetry', 'bake']

export const TRIPO_TERMINAL = ['success', 'failed', 'cancelled', 'banned', 'expired', 'unknown']
export const TRIPO_FAILED = ['failed', 'cancelled', 'banned', 'expired', 'unknown']

function clampInt(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function finite(v) {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function compact(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = v
  }
  return out
}

export function modelInfo(modelId) {
  return TRIPO_MODELS[modelId] || TRIPO_MODELS[DEFAULT_MODEL]
}

export function modelForEngine(engineId) {
  if (engineId === 'p1') return 'P1-20260311'
  if (engineId === 'p2') return 'P2-20260801'
  if (engineId === 'h2') return 'v2.5-20250123'
  return DEFAULT_MODEL
}

export function engineForModel(modelId) {
  return modelInfo(modelId).family
}

export function clampFaceLimit(modelId, faceLimit) {
  const info = modelInfo(modelId)
  const n = finite(faceLimit)
  if (!info.faceLimit) return n == null ? undefined : clampInt(n, 500, 200000)
  return n == null ? info.faceLimit.def : clampInt(n, info.faceLimit.min, info.faceLimit.max)
}

/**
 * Shared generation body. Mirrors the legacy `generationPayload` rules: low-poly families always
 * send face_limit + auto_size; H3 sends texture/geometry quality only when not 'standard'; pbr === texture.
 */
export function buildGenerationPayload(opts = {}) {
  const model = TRIPO_MODELS[opts.model] ? opts.model : DEFAULT_MODEL
  const info = TRIPO_MODELS[model]
  const texture = opts.texture !== false
  const payload = { model, texture, pbr: texture }
  if (info.lowPoly) {
    payload.face_limit = clampFaceLimit(model, opts.faceLimit)
    payload.auto_size = opts.autoSize !== false
  } else {
    if (texture && TEXTURE_QUALITIES.includes(opts.textureQuality) && opts.textureQuality !== 'standard') {
      payload.texture_quality = opts.textureQuality
    }
    if (GEOMETRY_QUALITIES.includes(opts.geometryQuality) && opts.geometryQuality !== 'standard') {
      payload.geometry_quality = opts.geometryQuality
    }
    if (opts.faceLimit != null) payload.face_limit = clampFaceLimit(model, opts.faceLimit)
    if (opts.autoSize === true) payload.auto_size = true
  }
  if (opts.quad === true) payload.quad = true
  if (texture && TEXTURE_ALIGNMENTS.includes(opts.textureAlignment)) payload.texture_alignment = opts.textureAlignment
  if (ORIENTATIONS.includes(opts.orientation) && opts.orientation !== 'default') payload.orientation = opts.orientation
  if (opts.style) payload.style = String(opts.style)
  if (opts.smartLowPoly === true) payload.smart_low_poly = true
  if (opts.compress === true) payload.compress = true
  if (opts.exportUv === true) payload.export_uv = true
  if (opts.enableImageAutofix === true) payload.enable_image_autofix = true
  const seeds = opts.seeds || {}
  if (finite(seeds.image) != null) payload.image_seed = Math.round(finite(seeds.image))
  if (finite(seeds.model) != null) payload.model_seed = Math.round(finite(seeds.model))
  if (finite(seeds.texture) != null) payload.texture_seed = Math.round(finite(seeds.texture))
  return { ...payload, ...compact(opts.extra || {}) }
}

export function buildImageToModelPayload(opts, inputToken) {
  if (!inputToken) throw new Error('image-to-model needs an uploaded file token')
  return { ...buildGenerationPayload(opts), input: inputToken }
}

const VIEW_ORDER = ['front', 'left', 'back', 'right']

/** @param {{ front: string, left?: string, back?: string, right?: string }} tokens */
export function buildMultiviewPayload(opts, tokens) {
  if (!tokens?.front) throw new Error('multiview-to-model needs a front view')
  const inputs = VIEW_ORDER.filter((v) => tokens[v]).map((v) => ({ [v]: tokens[v] }))
  const { orientation, textureAlignment, enableImageAutofix, ...rest } = opts || {}
  return { ...buildGenerationPayload(rest), inputs }
}

export function buildTextToModelPayload(opts, prompt, negativePrompt) {
  const text = String(prompt || '').trim()
  if (!text) throw new Error('text-to-model needs a prompt')
  const { orientation, textureAlignment, enableImageAutofix, ...rest } = opts || {}
  return compact({ ...buildGenerationPayload(rest), prompt: text, negative_prompt: String(negativePrompt || '').trim() || undefined })
}

export function buildTexturePayload({ taskId, texture = true, pbr, textureQuality, textureAlignment, textPrompt, imagePromptToken, styleImageToken, bake, compress, partNames, seeds } = {}) {
  if (!taskId) throw new Error('texture needs a source task id')
  return compact({
    input: taskId,
    texture: !!texture,
    pbr: pbr == null ? !!texture : !!pbr,
    texture_quality: TEXTURE_QUALITIES.includes(textureQuality) && textureQuality !== 'standard' ? textureQuality : undefined,
    texture_alignment: TEXTURE_ALIGNMENTS.includes(textureAlignment) ? textureAlignment : undefined,
    text_prompt: String(textPrompt || '').trim() || undefined,
    image_prompt: imagePromptToken || undefined,
    style_image: styleImageToken || undefined,
    bake: bake === false ? false : undefined,
    compress: compress === true ? true : undefined,
    part_names: Array.isArray(partNames) && partNames.length ? partNames : undefined,
    model_seed: finite(seeds?.model) != null ? Math.round(finite(seeds.model)) : undefined,
    texture_seed: finite(seeds?.texture) != null ? Math.round(finite(seeds.texture)) : undefined,
  })
}

export function buildConvertPayload({ taskId, format, quad, faceLimit, textureSize, textureFormat, flattenBottom, flattenBottomThreshold, pivotToCenterBottom, withAnimation, packUv, forceSymmetry, bake, scaleFactor, fbxPreset, exportVertexColors, animateInPlace, exportOrientation, partNames } = {}) {
  if (!taskId) throw new Error('convert needs a source task id')
  const fmt = String(format || '').toUpperCase()
  if (!CONVERT_FORMATS[fmt]) throw new Error(`Unsupported convert format: ${format}`)
  const ts = finite(textureSize)
  const sf = finite(scaleFactor)
  return compact({
    input: taskId,
    format: fmt,
    quad: quad === true ? true : undefined,
    face_limit: faceLimit != null ? clampInt(Number(faceLimit) || 10000, 500, 500000) : undefined,
    texture_size: ts != null ? clampInt(ts, 256, 8192) : undefined,
    texture_format: TEXTURE_FORMATS.includes(textureFormat) ? textureFormat : undefined,
    flatten_bottom: flattenBottom === true ? true : undefined,
    flatten_bottom_threshold: flattenBottom === true && finite(flattenBottomThreshold) != null ? Math.max(0, Math.min(1, finite(flattenBottomThreshold))) : undefined,
    pivot_to_center_bottom: pivotToCenterBottom === true ? true : undefined,
    with_animation: withAnimation === true ? true : undefined,
    pack_uv: packUv === true ? true : undefined,
    force_symmetry: forceSymmetry === true ? true : undefined,
    bake: bake === true ? true : undefined,
    scale_factor: sf != null && sf > 0 ? sf : undefined,
    fbx_preset: fmt === 'FBX' && FBX_PRESETS.includes(fbxPreset) ? fbxPreset : undefined,
    export_vertex_colors: exportVertexColors === true ? true : undefined,
    animate_in_place: animateInPlace === true ? true : undefined,
    export_orientation: exportOrientation || undefined,
    part_names: Array.isArray(partNames) && partNames.length ? partNames : undefined,
  })
}

export function buildRigCheckPayload(taskId) {
  if (!taskId) throw new Error('rig-check needs a source task id')
  return { input: taskId }
}

export function rigModelFor(rigType) {
  return rigType === 'biped' ? RIG_MODELS.biped : RIG_MODELS.other
}

export function buildRigPayload({ taskId, rigType = 'biped', spec = 'mixamo', outFormat = 'glb' } = {}) {
  if (!taskId) throw new Error('rig needs a source task id')
  const type = RIG_TYPES.includes(rigType) ? rigType : 'biped'
  return {
    input: taskId,
    model: rigModelFor(type),
    rig_type: type,
    spec: RIG_SPECS.includes(spec) ? spec : 'mixamo',
    out_format: RIG_OUT_FORMATS.includes(outFormat) ? outFormat : 'glb',
  }
}

/** Presets are ids from ANIMATION_PRESETS (or raw `preset:` names). Always sends `animations`. */
export function buildRetargetPayload({ rigTaskId, presets, outFormat = 'glb', bakeAnimation = true, exportWithGeometry = true, animateInPlace = true } = {}) {
  if (!rigTaskId) throw new Error('retarget needs a rig task id')
  const names = [...new Set((presets || []).map((p) => PRESET_BY_ID[p]?.preset || (PRESET_BY_NAME[p] ? p : null)).filter(Boolean))]
  if (!names.length) throw new Error('Pick at least one animation')
  if (names.length > MAX_PRESETS_PER_RETARGET) throw new Error(`At most ${MAX_PRESETS_PER_RETARGET} animations per job`)
  return {
    input: rigTaskId,
    animations: names,
    out_format: RIG_OUT_FORMATS.includes(outFormat) ? outFormat : 'glb',
    bake_animation: bakeAnimation !== false,
    export_with_geometry: exportWithGeometry !== false,
    animate_in_place: animateInPlace !== false,
  }
}

export function buildDecimatePayload({ taskId, faceLimit, quad, bake = true, partNames } = {}) {
  if (!taskId) throw new Error('decimate needs a source task id')
  return compact({
    input: taskId,
    model: DECIMATE_MODEL,
    face_limit: faceLimit != null ? clampInt(Number(faceLimit) || 4000, 200, 200000) : undefined,
    quad: quad === true ? true : undefined,
    bake: bake === false ? false : undefined,
    part_names: Array.isArray(partNames) && partNames.length ? partNames : undefined,
  })
}

export function buildSegmentPayload({ taskId } = {}) {
  if (!taskId) throw new Error('segment needs a source task id')
  return { input: taskId, model: SEGMENT_MODEL }
}

export function buildCompletePayload({ taskId, partNames } = {}) {
  if (!taskId) throw new Error('complete needs a source task id')
  return compact({ input: taskId, model: SEGMENT_MODEL, part_names: Array.isArray(partNames) && partNames.length ? partNames : undefined })
}

export function presetsForRigType(rigType) {
  return ANIMATION_PRESETS.filter((p) => p.rigTypes.includes(rigType))
}

export function presetFileKey(presetId) {
  return `anim.${presetId}.glb`
}

/** Map a retarget task output to [{ preset, id, url }] regardless of how Tripo keyed it. */
export function normalizeRetargetOutput(output, presets = []) {
  const out = output && typeof output === 'object' ? output : {}
  const wanted = presets.map((p) => PRESET_BY_ID[p] || PRESET_BY_NAME[p]).filter(Boolean)
  const urls = out.model_urls
  const rows = []
  if (urls && typeof urls === 'object' && !Array.isArray(urls)) {
    for (const [key, url] of Object.entries(urls)) {
      const p = PRESET_BY_NAME[key] || PRESET_BY_ID[key] || PRESET_BY_NAME[`preset:${key}`] || PRESET_BY_ID[String(key).replace(/^preset:/, '').replace(/:/g, '-')]
      if (p && url) rows.push({ preset: p.preset, id: p.id, url })
    }
  } else if (Array.isArray(urls)) {
    urls.forEach((url, i) => {
      const p = wanted[i]
      if (p && url) rows.push({ preset: p.preset, id: p.id, url })
    })
  }
  if (!rows.length) {
    const single = out.model_url || out.pbr_model || out.model || out.base_model
    if (single && wanted[0]) rows.push({ preset: wanted[0].preset, id: wanted[0].id, url: single })
  }
  return rows
}
