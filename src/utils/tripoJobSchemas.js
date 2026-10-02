/**
 * Schema-driven option dialogs for every billed Tripo job. Pure: no DOM, no store.
 * The options modal renders `fields`, the hook turns values into start-job arguments.
 */

import {
  TRIPO_MODELS,
  MODEL_IDS,
  RIG_TYPES,
  RIG_SPECS,
  CONVERT_FORMATS,
  CONVERT_FORMAT_IDS,
  ANIMATION_PRESETS,
  ANIMATION_CATEGORIES,
  MAX_PRESETS_PER_RETARGET,
  TEXTURE_QUALITIES,
  GEOMETRY_QUALITIES,
  TEXTURE_ALIGNMENTS,
  ORIENTATIONS,
  presetsForRigType,
  buildConvertPayload,
  clampFaceLimit,
} from './tripoEndpoints'
import { estimateJobCredits } from './tripoCredits'
import { MESH_PROFILES, PROFILE_IDS, printScaleFactor } from './meshProfiles'

export const JOB_KIND_LABELS = {
  mesh: 'Generate 3D mesh',
  texture: 'Re-texture',
  rig: 'Rig',
  retarget: 'Animate',
  convert: 'Convert / export',
  decimate: 'Build LOD',
  segment: 'Segment parts',
  complete: 'Complete parts',
  print: 'Make print version',
}

const TEXTURED_FORMATS = ['GLTF', 'FBX', 'USDZ', 'OBJ']
const PRINT_FORMATS = ['STL', '3MF', 'OBJ']
const ANIMATABLE_FORMATS = ['FBX', 'GLTF', 'USDZ']

function opt(id, label, hint) {
  return { id, label, hint }
}

const isLowPoly = (v) => !!TRIPO_MODELS[v.model]?.lowPoly
const isImageSource = (_, ctx) => ctx?.source === 'image'

export const JOB_OPTION_SCHEMAS = {
  mesh: {
    fields: [
      { id: 'profile', type: 'radio', label: 'Mesh profile', options: PROFILE_IDS.map((id) => opt(id, MESH_PROFILES[id].label, MESH_PROFILES[id].hint)) },
      { id: 'prompt', type: 'textarea', label: 'Prompt', placeholder: 'A stylised robot fox with brass joints, full body, neutral pose', visibleWhen: (_, ctx) => ctx?.slot === 'concept' },
      { id: 'negativePrompt', type: 'text', label: 'Negative prompt', placeholder: 'blurry, extra limbs', visibleWhen: (_, ctx) => ctx?.slot === 'concept' },
      { id: 'model', type: 'select', label: 'Model version', options: MODEL_IDS.map((id) => opt(id, TRIPO_MODELS[id].label, TRIPO_MODELS[id].hint)) },
      { id: 'texture', type: 'toggle', label: 'Texture / PBR', hint: 'Off = untextured geometry (cheaper, what a printer needs).', visibleWhen: (v) => !isLowPoly(v) },
      { id: 'textureQuality', type: 'radio', label: 'Texture quality', inline: true, options: TEXTURE_QUALITIES.map((q) => opt(q, q)), visibleWhen: (v) => !isLowPoly(v) && v.texture !== false },
      { id: 'geometryQuality', type: 'radio', label: 'Geometry quality', inline: true, options: GEOMETRY_QUALITIES.map((q) => opt(q, q)), visibleWhen: (v) => !isLowPoly(v) },
      { id: 'faceLimit', type: 'range', label: 'Face limit', step: 500, visibleWhen: isLowPoly, range: (v) => TRIPO_MODELS[v.model]?.faceLimit || { min: 1000, max: 20000 } },
      { id: 'quad', type: 'toggle', label: 'Quad topology', hint: 'Quad-dominant output for sculpting / subdivision.', visibleWhen: (v) => !isLowPoly(v) },
      { id: 'orientation', type: 'select', label: 'Orientation', options: ORIENTATIONS.map((o) => opt(o, o === 'align_image' ? 'Align to image' : 'Default')), visibleWhen: isImageSource },
      { id: 'textureAlignment', type: 'select', label: 'Texture alignment', options: TEXTURE_ALIGNMENTS.map((o) => opt(o, o === 'original_image' ? 'Match source image' : 'Geometry')), visibleWhen: (v, ctx) => isImageSource(v, ctx) && v.texture !== false },
      { id: 'autoSize', type: 'toggle', label: 'Auto size', hint: 'Scale the result to real-world size (metres).' },
      { id: 'modelSeed', type: 'number', label: 'Model seed', placeholder: 'random', hint: 'Set a number to reproduce a shape.' },
    ],
  },
  texture: {
    fields: [
      { id: 'prompt', type: 'textarea', label: 'Texture prompt', placeholder: 'Weathered brass, matte black rubber joints, glowing cyan eyes' },
      { id: 'textureQuality', type: 'radio', label: 'Texture quality', inline: true, options: TEXTURE_QUALITIES.map((q) => opt(q, q)) },
      { id: 'textureAlignment', type: 'select', label: 'Texture alignment', options: TEXTURE_ALIGNMENTS.map((o) => opt(o, o === 'original_image' ? 'Match source image' : 'Geometry')) },
    ],
  },
  rig: {
    fields: [
      { id: 'rigType', type: 'select', label: 'Rig type', options: [opt('auto', 'Auto-detect (rig-check)'), ...RIG_TYPES.map((t) => opt(t, t))] },
      { id: 'spec', type: 'radio', label: 'Skeleton spec', inline: true, options: RIG_SPECS.map((s) => opt(s, s === 'mixamo' ? 'Mixamo (Unity / Unreal humanoid)' : 'Tripo')) },
      { id: 'outFormat', type: 'radio', label: 'Rig output', inline: true, options: [opt('glb', 'GLB'), opt('fbx', 'FBX')] },
    ],
  },
  retarget: {
    fields: [
      { id: 'presets', type: 'multiselect', label: 'Animation clips', max: MAX_PRESETS_PER_RETARGET, hint: `Up to ${MAX_PRESETS_PER_RETARGET} clips per job. Each clip is billed separately.`, options: (ctx) => presetsForRigType(ctx?.rigType || 'biped').map((p) => ({ id: p.id, label: p.label, group: p.category })), groups: ANIMATION_CATEGORIES },
    ],
  },
  convert: {
    fields: [
      { id: 'format', type: 'select', label: 'Format', options: CONVERT_FORMAT_IDS.map((id) => opt(id, CONVERT_FORMATS[id].label)) },
      { id: 'withAnimation', type: 'toggle', label: 'Include rig + animations', hint: 'Converts the rigged task instead of the raw mesh.', visibleWhen: (v, ctx) => !!ctx?.hasRig && ANIMATABLE_FORMATS.includes(v.format) },
      { id: 'animateInPlace', type: 'toggle', label: 'Animate in place', visibleWhen: (v, ctx) => !!ctx?.hasRig && v.withAnimation && ANIMATABLE_FORMATS.includes(v.format) },
      { id: 'fbxPreset', type: 'select', label: 'FBX preset', options: [opt('none', 'Generic'), opt('mixamo', 'Mixamo (Unity / Unreal)')], visibleWhen: (v) => v.format === 'FBX' },
      { id: 'textureSize', type: 'select', label: 'Texture size', options: [1024, 2048, 4096].map((n) => opt(String(n), `${n} px`)), visibleWhen: (v) => TEXTURED_FORMATS.includes(v.format) },
      { id: 'textureFormat', type: 'select', label: 'Texture format', options: ['PNG', 'JPEG', 'WEBP'].map((f) => opt(f, f)), visibleWhen: (v) => TEXTURED_FORMATS.includes(v.format) },
      { id: 'heightMm', type: 'number', label: 'Print height (mm)', min: 10, max: 1000, hint: 'Needs the mesh opened in the viewport once so its real height is known.', visibleWhen: (v) => PRINT_FORMATS.includes(v.format) },
      { id: 'flattenBottom', type: 'toggle', label: 'Flatten bottom (+5)', visibleWhen: (v) => PRINT_FORMATS.includes(v.format) },
      { id: 'pivotToCenterBottom', type: 'toggle', label: 'Pivot at centre-bottom (+5)', visibleWhen: (v) => PRINT_FORMATS.includes(v.format) },
      { id: 'faceLimit', type: 'number', label: 'Face limit', placeholder: 'keep', min: 500, max: 500000 },
      { id: 'quad', type: 'toggle', label: 'Quad topology (+5)' },
      { id: 'packUv', type: 'toggle', label: 'Pack UVs (+5)', visibleWhen: (v) => TEXTURED_FORMATS.includes(v.format) },
      { id: 'forceSymmetry', type: 'toggle', label: 'Force symmetry (+5)' },
      { id: 'bake', type: 'toggle', label: 'Bake textures (+5)', visibleWhen: (v) => TEXTURED_FORMATS.includes(v.format) },
    ],
  },
  decimate: {
    fields: [
      { id: 'faceLimit', type: 'range', label: 'Target faces', step: 250, range: () => ({ min: 500, max: 50000 }) },
      { id: 'quad', type: 'toggle', label: 'Quad topology' },
    ],
  },
  segment: {
    fields: [{ id: 'note', type: 'note', text: 'Splits the mesh into named parts (head, torso, limbs…). Output is a new GLB stored on this asset.' }],
  },
  complete: {
    fields: [{ id: 'partNames', type: 'text', label: 'Part names (optional)', placeholder: 'left_arm, right_arm', hint: 'Comma-separated. Leave blank to complete every part.' }],
  },
  print: {
    fields: [
      { id: 'heightMm', type: 'number', label: 'Print height (mm)', min: 10, max: 1000 },
      { id: 'formats', type: 'multiselect', label: 'Files', max: 2, options: () => [opt('STL', 'STL'), opt('3MF', '3MF')] },
      { id: 'note', type: 'note', text: 'Flattened base and pivot at centre-bottom are always on for print versions.' },
    ],
  },
}

export const JOB_COPY = {
  mesh: (ctx) => ({
    title: ctx?.slot === 'concept' ? 'Generate 3D model from text?' : ctx?.slot === 'lock' ? 'Generate 3D model from the turnaround?' : 'Generate 3D model from this image?',
    description: ctx?.slot === 'lock'
      ? 'Uploads the front T-pose plus side / back views to Tripo and starts a billed job.'
      : ctx?.slot === 'concept'
        ? 'Sends your prompt to Tripo text-to-model. No character images are uploaded.'
        : ctx?.slot === 'outfit'
          ? 'Uploads this look\'s 2D image to Tripo and starts a billed job.'
          : 'Uploads the mannequin image to Tripo and starts a billed job.',
    confirmLabel: 'Generate 3D',
  }),
  texture: () => ({ title: 'Re-texture this mesh?', description: 'Creates a new textured version (PBR) of the current geometry. The original stays in history.', confirmLabel: 'Re-texture' }),
  rig: () => ({ title: 'Rig this mesh?', description: 'A free rig-check runs first. If Tripo cannot rig the mesh you are not charged.', confirmLabel: 'Rig mesh' }),
  retarget: () => ({ title: 'Add animation clips?', description: 'Retargets Tripo preset clips onto the rig. Each clip becomes a playable GLB in the viewport and an export file.', confirmLabel: 'Animate' }),
  convert: () => ({ title: 'Convert this asset?', description: 'Tripo converts the stored task — nothing is re-generated. Paid flags add 5 credits each.', confirmLabel: 'Convert' }),
  decimate: () => ({ title: 'Build a LOD?', description: 'Decimates the mesh to a face budget. Keeps textures. Stored as an extra LOD file on this asset.', confirmLabel: 'Build LOD' }),
  segment: () => ({ title: 'Segment this mesh?', description: 'Splits the mesh into semantic parts.', confirmLabel: 'Segment' }),
  complete: () => ({ title: 'Complete hidden parts?', description: 'Fills in occluded / missing geometry per part.', confirmLabel: 'Complete' }),
  print: () => ({ title: 'Make a print version?', description: 'Converts to STL and 3MF with a flattened base, pivot at centre-bottom and scaled to the height you choose.', confirmLabel: 'Make print files' }),
}

function profileDefaults(profile) {
  const p = MESH_PROFILES[profile] || MESH_PROFILES.animation
  const g = { ...p.generation }
  return {
    profile: p.id,
    model: g.model,
    texture: g.texture !== false,
    textureQuality: g.textureQuality || 'standard',
    geometryQuality: g.geometryQuality || 'standard',
    quad: !!g.quad,
    autoSize: g.autoSize !== false,
    orientation: g.orientation || 'default',
    textureAlignment: g.textureAlignment || 'original_image',
    faceLimit: TRIPO_MODELS[g.model]?.faceLimit?.def ?? 5000,
  }
}

/** @param {string} kind @param {object} ctx @param {object} preset values to overlay */
export function defaultJobValues(kind, ctx = {}, preset = {}) {
  switch (kind) {
    case 'mesh':
      return { ...profileDefaults(preset.profile || 'animation'), prompt: '', negativePrompt: '', modelSeed: '', ...preset }
    case 'texture':
      return { prompt: '', textureQuality: 'detailed', textureAlignment: 'original_image', ...preset }
    case 'rig':
      return { rigType: 'auto', spec: 'mixamo', outFormat: 'glb', ...preset }
    case 'retarget':
      return { presets: [], ...preset }
    case 'convert':
      return {
        format: 'FBX',
        withAnimation: !!ctx.hasRig,
        animateInPlace: false,
        fbxPreset: 'mixamo',
        textureSize: '2048',
        textureFormat: 'PNG',
        heightMm: ctx.record?.printSpec?.heightMm || 100,
        flattenBottom: false,
        pivotToCenterBottom: false,
        faceLimit: '',
        quad: false,
        packUv: false,
        forceSymmetry: false,
        bake: false,
        ...preset,
      }
    case 'decimate':
      return { faceLimit: 4000, quad: false, ...preset }
    case 'segment':
      return { ...preset }
    case 'complete':
      return { partNames: '', ...preset }
    case 'print':
      return { heightMm: ctx.record?.printSpec?.heightMm || 100, formats: ['STL', '3MF'], ...preset }
    default:
      return { ...preset }
  }
}

/** Apply one field change, cascading dependent defaults (profile → generation defaults, model → face limit). */
export function applyJobValue(kind, values, fieldId, value) {
  const next = { ...values, [fieldId]: value }
  if (kind === 'mesh') {
    if (fieldId === 'profile') return { ...next, ...profileDefaults(value), prompt: values.prompt, negativePrompt: values.negativePrompt, modelSeed: values.modelSeed }
    if (fieldId === 'model') {
      const info = TRIPO_MODELS[value]
      if (info?.lowPoly) next.faceLimit = clampFaceLimit(value, values.faceLimit)
      if (info?.family === 'p2') next.quad = true
    }
  }
  if (kind === 'convert' && fieldId === 'format') {
    const print = PRINT_FORMATS.includes(value)
    if (print) {
      next.flattenBottom = true
      next.pivotToCenterBottom = true
    }
  }
  return next
}

export function visibleFields(kind, values, ctx = {}) {
  const schema = JOB_OPTION_SCHEMAS[kind]
  if (!schema) return []
  return schema.fields.filter((f) => !f.visibleWhen || f.visibleWhen(values, ctx))
}

export function fieldOptions(field, ctx = {}) {
  return typeof field.options === 'function' ? field.options(ctx) : field.options || []
}

function numOrUndef(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function splitNames(s) {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean)
}

/** Build the convert options (camelCase, for startConvertJob) from dialog values. */
export function convertOptionsFromValues(values, ctx = {}) {
  const fmt = String(values.format || 'FBX').toUpperCase()
  const print = PRINT_FORMATS.includes(fmt)
  const textured = TEXTURED_FORMATS.includes(fmt)
  const anim = !!ctx.hasRig && !!values.withAnimation && ANIMATABLE_FORMATS.includes(fmt)
  const heightMm = numOrUndef(values.heightMm)
  const scaleFactor = print && heightMm ? printScaleFactor(ctx.stats || ctx.record?.stats, heightMm) : null
  return {
    quad: !!values.quad,
    faceLimit: numOrUndef(values.faceLimit),
    textureSize: textured ? numOrUndef(values.textureSize) : undefined,
    textureFormat: textured ? values.textureFormat : undefined,
    flattenBottom: print && !!values.flattenBottom,
    flattenBottomThreshold: print && values.flattenBottom ? 0.01 : undefined,
    pivotToCenterBottom: print && !!values.pivotToCenterBottom,
    withAnimation: anim,
    animateInPlace: anim && !!values.animateInPlace,
    packUv: textured && !!values.packUv,
    forceSymmetry: !!values.forceSymmetry,
    bake: textured && !!values.bake,
    scaleFactor: scaleFactor || undefined,
    fbxPreset: fmt === 'FBX' && values.fbxPreset === 'mixamo' ? 'mixamo' : undefined,
  }
}

/** @returns {{ credits: number, approx: boolean, notes: string[] }} */
export function jobEstimate(kind, values, ctx = {}) {
  const notes = []
  switch (kind) {
    case 'mesh': {
      const est = estimateJobCredits('mesh', { model: values.model, texture: values.texture !== false, textureQuality: values.textureQuality, geometryQuality: values.geometryQuality })
      return { ...est, notes }
    }
    case 'retarget': {
      const n = (values.presets || []).length
      if (!n) notes.push('Pick at least one clip.')
      return { ...estimateJobCredits('retarget', { presets: values.presets || [] }), notes }
    }
    case 'convert': {
      const options = convertOptionsFromValues(values, ctx)
      const payload = buildConvertPayload({ taskId: 'estimate', format: values.format || 'FBX', ...options })
      if (PRINT_FORMATS.includes(String(values.format).toUpperCase()) && !options.scaleFactor) notes.push('Open the mesh in the viewport first so the print height can be applied; otherwise the model keeps its native scale.')
      return { ...estimateJobCredits('convert', { payload }), notes }
    }
    case 'print': {
      const formats = values.formats?.length ? values.formats : ['STL', '3MF']
      let credits = 0
      for (const format of formats) {
        const payload = buildConvertPayload({ taskId: 'estimate', format, flattenBottom: true, pivotToCenterBottom: true })
        credits += estimateJobCredits('convert', { payload }).credits
      }
      if (!printScaleFactor(ctx.stats || ctx.record?.stats, values.heightMm)) notes.push('Open the mesh in the viewport first so the print height can be applied.')
      return { credits, approx: false, notes }
    }
    default:
      return { ...estimateJobCredits(kind, values), notes }
  }
}

/** Arguments for the matching start function in tripoJobs.js (target is merged by the caller). */
export function jobCallArgs(kind, values, ctx = {}) {
  switch (kind) {
    case 'mesh': {
      const seed = numOrUndef(values.modelSeed)
      return {
        profile: values.profile || 'animation',
        prompt: values.prompt || '',
        negativePrompt: values.negativePrompt || '',
        options: {
          model: values.model,
          texture: values.texture !== false,
          textureQuality: values.textureQuality,
          geometryQuality: values.geometryQuality,
          faceLimit: isLowPoly(values) ? numOrUndef(values.faceLimit) : undefined,
          quad: !!values.quad,
          autoSize: values.autoSize !== false,
          orientation: values.orientation,
          textureAlignment: values.textureAlignment,
          seeds: seed == null ? undefined : { model: Math.round(seed) },
        },
      }
    }
    case 'texture':
      return { prompt: values.prompt || '', textureQuality: values.textureQuality || 'standard', textureAlignment: values.textureAlignment }
    case 'rig':
      return { rigType: values.rigType || 'auto', spec: values.spec || 'mixamo', outFormat: values.outFormat || 'glb' }
    case 'retarget':
      return { presets: values.presets || [] }
    case 'convert':
      return { format: String(values.format || 'FBX').toUpperCase(), options: convertOptionsFromValues(values, ctx) }
    case 'decimate':
      return { faceLimit: numOrUndef(values.faceLimit) || 4000, quad: !!values.quad }
    case 'segment':
      return {}
    case 'complete':
      return { partNames: splitNames(values.partNames) }
    case 'print':
      return { heightMm: numOrUndef(values.heightMm) || 100, formats: values.formats?.length ? values.formats : ['STL', '3MF'] }
    default:
      return { ...values }
  }
}

/** Validation message or null. */
export function jobValuesError(kind, values, ctx = {}) {
  if (kind === 'mesh' && ctx.slot === 'concept' && !String(values.prompt || '').trim()) return 'Write a prompt first.'
  if (kind === 'retarget' && !(values.presets || []).length) return 'Pick at least one clip.'
  if (kind === 'retarget' && (values.presets || []).length > MAX_PRESETS_PER_RETARGET) return `At most ${MAX_PRESETS_PER_RETARGET} clips per job.`
  if (kind === 'print' && !(values.formats || []).length) return 'Pick at least one file type.'
  return null
}

export { ANIMATION_PRESETS }
