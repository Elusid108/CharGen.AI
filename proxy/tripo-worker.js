/**
 * Cloudflare Worker: CORS-enabling relay for the Tripo v3 API and its artifact CDN.
 *
 *   /v3/*            -> https://openapi.tripo3d.ai/v3/*   (international keys; forwards the browser's Authorization header)
 *   /cn/v3/*         -> https://openapi.tripo3d.com/v3/*  (China-region keys)
 *   /artifact?url=   -> fetches an allow-listed Tripo CDN URL
 *
 * The Worker stores no API key. Deploy with `wrangler deploy` (see proxy/README.md) and paste the
 * Worker URL into CharGen.AI Settings -> Tripo proxy URL.
 */
import { isAllowedArtifactUrl } from './artifactAllowlist.js'
import { resolveUpstreamUrl } from './tripoUpstream.js'

const FORWARD_HEADERS = ['authorization', 'content-type', 'accept']

function allowedOrigin(origin, env) {
  const list = String(env?.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean)
  if (list.includes('*')) return '*'
  return list.includes(origin) ? origin : ''
}

function corsHeaders(origin, env) {
  const allow = allowedOrigin(origin, env)
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (allow) headers['Access-Control-Allow-Origin'] = allow
  return headers
}

function json(status, message, cors) {
  return new Response(JSON.stringify({ code: status, message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function withCors(res, cors, extra = {}) {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries({ ...cors, ...extra })) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (origin && !allowedOrigin(origin, env)) return json(403, 'origin not allowed', cors)

    const url = new URL(request.url)

    const upstreamUrl = resolveUpstreamUrl(url.pathname, url.search)
    if (upstreamUrl) {
      if (!request.headers.get('Authorization')) return json(401, 'missing Authorization header', cors)
      const headers = new Headers()
      for (const name of FORWARD_HEADERS) {
        const value = request.headers.get(name)
        if (value) headers.set(name, value)
      }
      const upstream = new Request(upstreamUrl, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      })
      const res = await fetch(upstream)
      return withCors(res, cors)
    }

    if (url.pathname === '/artifact' && request.method === 'GET') {
      const target = url.searchParams.get('url')
      if (!isAllowedArtifactUrl(target)) return json(403, 'host not allowed', cors)
      const res = await fetch(target, { redirect: 'follow' })
      return withCors(res, cors, { 'Cache-Control': 'private, max-age=300' })
    }

    return json(404, 'not found', cors)
  },
}
