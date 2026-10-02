/**
 * Hosts the artifact proxies (Vite dev/preview middleware and the Cloudflare Worker) may fetch.
 * Shared so both agree; tested in src/utils/proxyAllowlist.test.js.
 */
export function isAllowedArtifactHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return (
    host === 'tripo3d.ai'
    || host === 'tripo3d.com'
    || host === 'cdn.tripo3d.ai'
    || host.endsWith('.tripo3d.ai')
    || host.endsWith('.tripo3d.com')
  )
}

export function isAllowedArtifactUrl(raw) {
  try {
    const parsed = new URL(String(raw || ''))
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && isAllowedArtifactHost(parsed.hostname)
  } catch {
    return false
  }
}
