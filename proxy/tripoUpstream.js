/**
 * Tripo API hosts per region. A key is valid in exactly one of them, so the relays expose both:
 * Vite serves `/tripo-api` (ov) and `/tripo-cn-api` (cn); the Worker serves `/v3/*` and `/cn/v3/*`.
 * Shared by vite.config.js and tripo-worker.js; tested in src/utils/proxyAllowlist.test.js.
 */
export const TRIPO_UPSTREAMS = {
  ov: 'https://openapi.tripo3d.ai',
  cn: 'https://openapi.tripo3d.com',
}

/** Worker path -> upstream URL, or null when the path is not an API route. */
export function resolveUpstreamUrl(pathname, search = '') {
  const path = String(pathname || '')
  if (path.startsWith('/v3/')) return `${TRIPO_UPSTREAMS.ov}${path}${search}`
  if (path.startsWith('/cn/v3/')) return `${TRIPO_UPSTREAMS.cn}${path.slice(3)}${search}`
  return null
}
