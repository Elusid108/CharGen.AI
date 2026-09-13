/** Official v3 list prices ($1 = 100 credits). No cheaper retry SKU exists. */

export const TRIPO_ENGINES = {
  h3: {
    id: 'h3',
    model: 'v3.1-20260211',
    label: 'Quality (H3)',
    hint: 'Best for print and general digital use. ~30 credits with texture.',
    withTexture: 30,
    noTexture: 20,
  },
  p1: {
    id: 'p1',
    model: 'P1-20260311',
    label: 'Game topology (P1)',
    hint: 'Cleaner low-poly mesh for engines. ~50 credits with texture.',
    withTexture: 50,
    noTexture: 40,
    faceLimit: 5000,
  },
}

export const RIG_CREDITS = 25
export const CONVERT_BASE_CREDITS = 5
export const CONVERT_EXTRA_FLAG_CREDITS = 5

export function estimateMeshCredits(engineId, texture) {
  const engine = TRIPO_ENGINES[engineId] || TRIPO_ENGINES.h3
  return texture ? engine.withTexture : engine.noTexture
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
