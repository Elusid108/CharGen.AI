/**
 * Export bundle planner — pure (no DOM, no store). Decides the folder layout of a ZIP for one
 * 3D asset version, what is missing per target, the manifest, and the README. Building the ZIP
 * (JSZip) is here too because JSZip runs in node for tests.
 */

import JSZip from 'jszip'
import { parseFileKey, assetBaseName, safeFileStem } from './tripoModels'
import { PRESET_BY_ID, CONVERT_FORMATS } from './tripoEndpoints'
import { estimateJobCredits } from './tripoCredits'
import { buildConvertPayload } from './tripoEndpoints'

export const EXPORT_TARGETS = {
  unity_unreal: {
    id: 'unity_unreal',
    label: 'Unity / Unreal',
    hint: 'FBX with Mixamo-compatible rig, textures beside it, clips as GLB references.',
    folder: 'model/fbx',
  },
  gltf: {
    id: 'gltf',
    label: 'glTF / GLB',
    hint: 'GLB for web, Godot, three.js and the VRM (UniVRM) pipeline; separate-texture glTF when converted.',
    folder: 'model/glb',
  },
  usdz: {
    id: 'usdz',
    label: 'USDZ',
    hint: 'Apple AR Quick Look, Omniverse, USD pipelines.',
    folder: 'model/usdz',
  },
  print: {
    id: 'print',
    label: '3D print',
    hint: 'STL + 3MF, flat base, pivot at centre-bottom, scaled to the print height.',
    folder: 'print',
  },
}
export const TARGET_IDS = Object.keys(EXPORT_TARGETS)

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|tga|targa|bmp|tif{1,2}|exr|hdr)$/i

function convertCost(format, flags = {}) {
  const payload = buildConvertPayload({ taskId: 'estimate', format, ...flags })
  return estimateJobCredits('convert', { payload }).credits
}

function has(record, key) {
  return !!record?.files?.[key]
}

/**
 * Present / missing files for one target.
 * @returns {{ present: string[], missing: { fileKey: string, label: string, job: { kind: string, preset: object }|null, estimatedCredits: number, optional: boolean, reason: string }[] }}
 */
export function targetStatus(record, targetId) {
  const present = []
  const missing = []
  const hasRig = !!record?.rig?.taskId
  const push = (key, ok, job, credits, optional, reason) => {
    if (ok) present.push(key)
    else missing.push({ fileKey: key, label: reason, job, estimatedCredits: credits, optional, reason })
  }
  switch (targetId) {
    case 'unity_unreal':
      push('rig.glb', hasRig, { kind: 'rig', preset: { spec: 'mixamo' } }, estimateJobCredits('rig').credits, true, 'Mixamo rig (recommended for humanoid retargeting)')
      push('convert.FBX.zip', has(record, 'convert.FBX.zip'), { kind: 'convert', preset: { format: 'FBX', withAnimation: hasRig, fbxPreset: 'mixamo' } }, convertCost('FBX'), false, hasRig ? 'FBX with rig and animations' : 'FBX mesh')
      break
    case 'gltf':
      push('mesh.glb', has(record, 'mesh.glb'), null, 0, false, 'Base GLB')
      push('rig.glb', hasRig, { kind: 'rig', preset: {} }, estimateJobCredits('rig').credits, true, 'Rigged GLB')
      push('convert.GLTF.zip', has(record, 'convert.GLTF.zip'), { kind: 'convert', preset: { format: 'GLTF', withAnimation: hasRig } }, convertCost('GLTF'), true, 'glTF with separate textures')
      break
    case 'usdz':
      push('convert.USDZ.usdz', has(record, 'convert.USDZ.usdz'), { kind: 'convert', preset: { format: 'USDZ', withAnimation: hasRig } }, convertCost('USDZ'), false, 'USDZ')
      break
    case 'print': {
      const both = has(record, 'convert.STL.stl') && has(record, 'convert.3MF.3mf')
      const cost = convertCost('STL', { flattenBottom: true, pivotToCenterBottom: true }) + convertCost('3MF', { flattenBottom: true, pivotToCenterBottom: true })
      if (both) {
        present.push('convert.STL.stl', 'convert.3MF.3mf')
      } else {
        const job = { kind: 'print', preset: {} }
        if (!has(record, 'convert.STL.stl')) missing.push({ fileKey: 'convert.STL.stl', label: 'STL (print version)', job, estimatedCredits: cost, optional: false, reason: 'STL (print version)' })
        if (!has(record, 'convert.3MF.3mf')) missing.push({ fileKey: 'convert.3MF.3mf', label: '3MF (print version)', job, estimatedCredits: has(record, 'convert.STL.stl') ? cost / 2 : 0, optional: false, reason: '3MF (print version)' })
      }
      break
    }
    default:
      break
  }
  return { present, missing }
}

/** Credits needed to fill every required (non-optional) gap across the chosen targets. */
export function estimateBundleGap(record, targets = TARGET_IDS) {
  let credits = 0
  const jobs = []
  const seen = new Set()
  for (const t of targets) {
    for (const m of targetStatus(record, t).missing) {
      if (m.optional || !m.job) continue
      const sig = `${m.job.kind}:${JSON.stringify(m.job.preset)}`
      if (seen.has(sig)) continue
      seen.add(sig)
      credits += m.estimatedCredits
      jobs.push({ ...m.job, fileKey: m.fileKey, estimatedCredits: m.estimatedCredits, target: t })
    }
  }
  return { credits, jobs }
}

function lodIndex(record, faceLimit) {
  const sorted = [...(record?.lods || [])].sort((a, b) => b.faceLimit - a.faceLimit)
  const i = sorted.findIndex((l) => l.faceLimit === faceLimit)
  return i < 0 ? sorted.length + 1 : i + 1
}

/**
 * Where each stored file goes in the ZIP.
 * @param {object} record
 * @param {{ targets?: string[], characterName?: string, outfitName?: string, sources?: { name: string, ext: string }[] }} opts
 * @returns {{ base: string, entries: { path: string, fileKey?: string, kind: 'file'|'archive'|'source', targets: string[], source?: string }[], missing: object[], targets: string[] }}
 */
export function planBundle(record, { targets = TARGET_IDS, characterName = 'character', outfitName = '', sources = [] } = {}) {
  const base = assetBaseName(characterName, record, outfitName)
  const entries = []
  const want = new Set(targets)
  const add = (path, fileKey, kind, tg) => entries.push({ path: `${base}/${path}`, fileKey, kind, targets: tg })
  const files = record?.files || {}
  const heightMm = record?.printSpec?.heightMm || 100

  for (const s of sources) entries.push({ path: `${base}/source/${safeFileStem(s.name).toLowerCase()}.${s.ext || 'jpg'}`, kind: 'source', source: s.name, targets: [] })
  if (files['preview.jpg']) add('source/preview.jpg', 'preview.jpg', 'file', [])

  for (const key of Object.keys(files)) {
    const p = parseFileKey(key)
    if (!p || p.family === 'preview') continue
    switch (p.family) {
      case 'mesh':
        if (want.has('gltf') || want.has('unity_unreal')) add(`model/glb/${base}.glb`, key, 'file', ['gltf', 'unity_unreal'])
        break
      case 'rig':
        if (p.ext === 'glb' && (want.has('gltf') || want.has('unity_unreal'))) add(`model/glb/${base}_rigged.glb`, key, 'file', ['gltf', 'unity_unreal'])
        if (p.ext === 'fbx' && want.has('unity_unreal')) add(`model/fbx/${base}_rigged.fbx`, key, 'file', ['unity_unreal'])
        break
      case 'anim':
        if (want.has('gltf') || want.has('unity_unreal')) add(`animations/${base}@${p.arg}.${p.ext}`, key, 'file', ['gltf', 'unity_unreal'])
        break
      case 'lod':
        if (want.has('gltf') || want.has('unity_unreal')) add(`lod/${base}_lod${lodIndex(record, Number(p.arg))}_${p.arg}.glb`, key, 'file', ['gltf', 'unity_unreal'])
        break
      case 'convert': {
        const fmt = String(p.arg).toUpperCase()
        if (fmt === 'FBX' && want.has('unity_unreal')) add('model/fbx', key, 'archive', ['unity_unreal'])
        else if (fmt === 'GLTF' && want.has('gltf')) add('model/gltf', key, 'archive', ['gltf'])
        else if (fmt === 'OBJ' && (want.has('gltf') || want.has('print'))) add('model/obj', key, 'archive', ['gltf', 'print'])
        else if (fmt === 'USDZ' && want.has('usdz')) add(`model/usdz/${base}.usdz`, key, 'file', ['usdz'])
        else if (fmt === 'STL' && want.has('print')) add(`print/${base}_${heightMm}mm.stl`, key, 'file', ['print'])
        else if (fmt === '3MF' && want.has('print')) add(`print/${base}_${heightMm}mm.3mf`, key, 'file', ['print'])
        break
      }
      case 'segment':
      case 'complete':
      case 'texture':
        if (want.has('gltf') || want.has('unity_unreal')) add(`extras/${base}_${p.family}-${p.arg}.${p.ext}`, key, 'file', ['gltf', 'unity_unreal'])
        break
      default:
        break
    }
  }

  const missing = []
  for (const t of targets) for (const m of targetStatus(record, t).missing) missing.push({ target: t, ...m })
  return { base, entries, missing, targets: [...targets] }
}

/**
 * @param {object} record
 * @param {{ characterName?: string, characterId?: string|null, outfitName?: string, targets?: string[], plan?: object, appVersion?: string, now?: number }} opts
 */
export function buildExportManifest(record, { characterName = 'character', characterId = null, outfitName = '', targets = TARGET_IDS, plan = null, appVersion = '', now = Date.now() } = {}) {
  const p = plan || planBundle(record, { targets, characterName, outfitName })
  const jobs = Object.values(record?.jobs || {}).map((j) => ({ id: j.id, kind: j.kind, status: j.status, taskId: j.taskId, creditsConsumed: j.creditsConsumed, finishedAt: j.finishedAt, params: j.params }))
  const textures = []
  for (const key of Object.keys(record?.files || {})) {
    const pf = parseFileKey(key)
    if (pf?.family === 'convert' && CONVERT_FORMATS[String(pf.arg).toUpperCase()]?.textured) textures.push(String(pf.arg).toUpperCase())
  }
  return {
    schema: 'chargen.asset-bundle/1',
    tool: { name: 'CharGen.AI', version: appVersion },
    exportedAt: new Date(now).toISOString(),
    character: { id: characterId, name: characterName },
    asset: {
      id: record?.id,
      slot: record?.slot,
      outfit: record?.slot === 'outfit' ? { id: record?.outfitId, name: outfitName } : null,
      profile: record?.profile,
      source: record?.source,
      modelVersion: record?.modelVersion,
      generation: record?.generation || null,
      taskId: record?.taskId,
      createdAt: record?.createdAt,
      completedAt: record?.completedAt,
    },
    units: { linear: 'metres', note: 'Tripo auto-size output; FBX importers may read as centimetres (Unity: set Scale Factor 1, Unreal: Import Uniform Scale 100 if the model looks tiny).' },
    transform: record?.transform || null,
    printSpec: record?.printSpec || null,
    stats: record?.stats || null,
    rig: record?.rig ? { type: record.rig.type, spec: record.rig.spec, outFormat: record.rig.outFormat, taskId: record.rig.taskId } : null,
    animations: (record?.animations || []).map((a) => ({ id: a.id, preset: a.preset, label: PRESET_BY_ID[a.id]?.label || a.id, file: p.entries.find((e) => e.fileKey === a.fileKey)?.path || null })),
    lods: (record?.lods || []).map((l) => ({ faceLimit: l.faceLimit, quad: !!l.quad, file: p.entries.find((e) => e.fileKey === l.fileKey)?.path || null })),
    formats: textures,
    files: p.entries.filter((e) => e.fileKey).map((e) => ({ path: e.path, fileKey: e.fileKey, kind: e.kind, bytes: record?.files?.[e.fileKey]?.bytes ?? null, taskId: record?.files?.[e.fileKey]?.taskId ?? null })),
    targets: p.targets,
    credits: { total: Object.values(record?.jobs || {}).reduce((s, j) => s + (Number(j.creditsConsumed) || 0), 0) || Number(record?.creditsConsumed) || 0, jobs },
    missing: p.missing.map((m) => ({ target: m.target, fileKey: m.fileKey, reason: m.reason, optional: m.optional, estimatedCredits: m.estimatedCredits })),
  }
}

export function readmeText(manifest) {
  const a = manifest.asset || {}
  const lines = []
  lines.push(`${manifest.character?.name || 'Character'} — 3D asset bundle (${a.profile || 'animation'} profile)`)
  lines.push(`Exported ${manifest.exportedAt} by ${manifest.tool?.name || 'CharGen.AI'} ${manifest.tool?.version || ''}`.trim())
  lines.push('')
  lines.push('Layout')
  lines.push('  source/          reference images used for generation + Tripo preview render')
  lines.push('  model/glb/       GLB mesh (+ _rigged.glb when rigged) — web, Godot 4, three.js, Blender')
  lines.push('  model/gltf/      glTF with separate textures (only when converted)')
  lines.push('  model/fbx/       FBX (+ textures) for Unity / Unreal; Mixamo-compatible skeleton when rigged with spec=mixamo')
  lines.push('  model/usdz/      USDZ for Apple AR Quick Look / USD pipelines')
  lines.push('  animations/      one GLB per preset clip (geometry + skinned clip), e.g. name@walk.glb')
  lines.push('  lod/             decimated meshes, lod1 = highest remaining face count')
  lines.push('  print/           STL + 3MF, flat base, pivot at centre-bottom, scaled to the print height in the file name')
  lines.push('  manifest.json    everything below as data (ids, Tripo task ids, options, credits, missing files)')
  lines.push('')
  lines.push('Units: Tripo exports in metres with auto-size. If an FBX imports 100× too small or large, set the')
  lines.push('import scale (Unity: Scale Factor; Unreal: Import Uniform Scale) rather than editing the mesh.')
  lines.push('')
  lines.push('Unity: import the FBX, set Rig → Animation Type: Humanoid (Mixamo spec) and let Unity build the avatar;')
  lines.push('  reuse the same avatar for the animation clips. GLB clips can be converted with glTFast / UnityGLTF.')
  lines.push('Unreal: import FBX with Skeletal Mesh; retarget with the UE5 Mixamo-compatible IK Rig; textures import beside the FBX.')
  lines.push('Godot / three.js: load model/glb directly; animations/*.glb carry a clip each (AnimationMixer / AnimationPlayer).')
  lines.push('VRM: open model/glb in Blender or Unity with UniVRM, map humanoid bones from the Mixamo names, export VRM.')
  lines.push('Print: slice print/*.stl or *.3mf; the model is already on a flat base at the height in the file name.')
  if (manifest.rig) lines.push('')
  if (manifest.rig) lines.push(`Rig: ${manifest.rig.type} / ${manifest.rig.spec} (Tripo task ${manifest.rig.taskId})`)
  if (manifest.animations?.length) lines.push(`Clips: ${manifest.animations.map((c) => c.label).join(', ')}`)
  if (manifest.missing?.length) {
    lines.push('')
    lines.push('Not included (generate in CharGen → 3D Studio):')
    for (const m of manifest.missing) lines.push(`  - ${m.target}: ${m.reason}${m.optional ? ' (optional)' : ''}${m.estimatedCredits ? ` ~${m.estimatedCredits} credits` : ''}`)
  }
  lines.push('')
  lines.push(`Credits spent on this asset: ${manifest.credits?.total ?? 0}`)
  return lines.join('\n') + '\n'
}

export function isZip(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5 || b[2] === 7)
}

/**
 * Unpack a Tripo convert archive into `destDir`, flat (companion textures stay beside the model so
 * engine importers find them). The main model file is renamed to `{mainName}.{ext}`.
 * @returns {Promise<{ path: string, data: Uint8Array }[]>}
 */
export async function relocateArchive(archiveBytes, { destDir, mainName, mainExts = ['fbx', 'gltf', 'obj'] }) {
  const zip = await JSZip.loadAsync(archiveBytes)
  const out = []
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const mains = names.filter((n) => mainExts.includes((/\.([a-z0-9]+)$/i.exec(n)?.[1] || '').toLowerCase()))
  const mainFile = mains.length === 1 ? mains[0] : null
  for (const name of names) {
    const data = await zip.files[name].async('uint8array')
    const leaf = name.split('/').pop()
    if (!leaf || leaf.startsWith('.') || leaf.startsWith('__MACOSX')) continue
    const ext = (/\.([a-z0-9]+)$/i.exec(leaf)?.[1] || '').toLowerCase()
    const renamed = name === mainFile && mainName ? `${mainName}.${ext}` : leaf
    out.push({ path: `${destDir}/${renamed}`, data, isImage: IMAGE_EXT_RE.test(leaf) })
  }
  return out
}

/**
 * Build the ZIP. `getBytes(fileKey)` resolves to Uint8Array|Blob|null. `extras` are extra
 * [{ path, data }] rows (e.g. textures extracted from the GLB when the FBX archive has none).
 * @returns {Promise<{ zip: JSZip, included: string[], skipped: { fileKey: string, reason: string }[] }>}
 */
export async function buildAssetBundle({ plan, manifest, readme, getBytes, getSource = null, extras = [] }) {
  const zip = new JSZip()
  const included = []
  const skipped = []
  zip.file(`${plan.base}/README.txt`, readme)
  zip.file(`${plan.base}/manifest.json`, JSON.stringify(manifest, null, 2))
  for (const entry of plan.entries) {
    if (entry.kind === 'source') {
      const data = getSource ? await getSource(entry.source) : null
      if (data) {
        zip.file(entry.path, data)
        included.push(entry.path)
      }
      continue
    }
    const data = await getBytes(entry.fileKey)
    if (!data) {
      skipped.push({ fileKey: entry.fileKey, reason: 'not stored in this browser' })
      continue
    }
    if (entry.kind === 'archive') {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer())
      if (!isZip(bytes)) {
        const ext = parseFileKey(entry.fileKey)?.arg?.toLowerCase() || 'bin'
        zip.file(`${entry.path}/${plan.base}.${ext}`, bytes)
        included.push(`${entry.path}/${plan.base}.${ext}`)
        continue
      }
      const rows = await relocateArchive(bytes, { destDir: entry.path, mainName: plan.base })
      for (const r of rows) {
        zip.file(r.path, r.data)
        included.push(r.path)
      }
      continue
    }
    zip.file(entry.path, data)
    included.push(entry.path)
  }
  for (const x of extras) {
    zip.file(x.path, x.data)
    included.push(x.path)
  }
  return { zip, included, skipped }
}

/** Does a built bundle already hold image files under `dir`? */
export function bundleHasImages(included, dir) {
  return included.some((p) => p.startsWith(`${dir}/`) && IMAGE_EXT_RE.test(p))
}

/** Library bulk ZIP: path for one stored blob row inside the character's folder. */
export function libraryBlobPath(characterFolder, characterName, row) {
  const parts = String(row?.id || '').split('::')
  const slotKey = parts[1] || 'model'
  const assetId = parts.length >= 4 ? parts[2] : 'legacy'
  const fileKey = parts.length >= 4 ? parts.slice(3).join('::') : row?.kind || 'file.bin'
  const leaf = row?.filename && row.filename.includes('.') ? row.filename : `${safeFileStem(characterName)}_${slotKey}_${fileKey}`
  return `${characterFolder}/models/${slotKey}/${assetId.slice(0, 8)}/${leaf}`
}
