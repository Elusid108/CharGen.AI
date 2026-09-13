/** Official v3 list prices ($1 = 100 credits). No cheaper retry SKU exists. */

export const TRIPO_ENGINES = {
  h3: {
    id: 'h3',
    model: 'v3.1-20260211',
    label: 'Quality (H3)',
    hint: 'Best for print and general digital use. Texture is included in the base price.',
    withTexture: 30,
    noTexture: 20,
  },
  p1: {
    id: 'p1',
    model: 'P1-20260311',
    label: 'Game topology (P1)',
    hint: 'Cleaner low-poly mesh for engines. All-in price — quality add-ons do not apply.',
    withTexture: 50,
    noTexture: 40,
    faceLimit: 5000,
  },
}

export const TEXTURE_QUALITY_OPTIONS = [
  { id: 'standard', label: 'Standard texture', extra: 0, hint: 'Included in the textured base price' },
  { id: 'detailed', label: 'Detailed texture', extra: 20, hint: '+20 credits on H3' },
  { id: 'extreme', label: 'Extreme / 8K texture', extra: 30, hint: '+30 credits on H3' },
]

export const GEOMETRY_QUALITY_OPTIONS = [
  { id: 'standard', label: 'Standard geometry', extra: 0 },
  { id: 'detailed', label: 'Detailed geometry', extra: 20, hint: '+20 credits on H3' },
]

export const RIG_CREDITS = 25
export const RETARGET_CREDITS = 10
export const CONVERT_BASE_CREDITS = 5
export const CONVERT_EXTRA_FLAG_CREDITS = 5

export const LOCOMOTION_CLIPS = [
  { id: 'idle', preset: 'preset:idle', kind: 'animIdle', label: 'Idle' },
  { id: 'walk', preset: 'preset:walk', kind: 'animWalk', label: 'Walk' },
  { id: 'run', preset: 'preset:run', kind: 'animRun', label: 'Run' },
]

export function estimateMeshCredits(engineId, texture, opts = {}) {
  const engine = TRIPO_ENGINES[engineId] || TRIPO_ENGINES.h3
  let total = texture ? engine.withTexture : engine.noTexture
  if (engineId === 'p1') return total
  if (texture) {
    const tex = TEXTURE_QUALITY_OPTIONS.find((row) => row.id === opts.textureQuality)
    if (tex) total += tex.extra
  }
  if (opts.geometryQuality === 'detailed') total += 20
  return total
}

export function estimateRetargetCredits(clipCount = 3) {
  return RETARGET_CREDITS * Math.max(1, clipCount)
}

/** STL convert with flatten_bottom + pivot_to_center_bottom. */
export function estimateStlCredits() {
  return CONVERT_BASE_CREDITS + CONVERT_EXTRA_FLAG_CREDITS + CONVERT_EXTRA_FLAG_CREDITS
}

/** FBX convert with pivot_to_center_bottom. */
export function estimateFbxCredits() {
  return CONVERT_BASE_CREDITS + CONVERT_EXTRA_FLAG_CREDITS
}

export function formatCredits(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}
