export const config = { runtime: 'edge' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, mcp-protocol-version, mcp-session-id, x-xydc-authorization, x-xydc-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id',
}

function normalizeXydcAuth(raw) {
  let s = (raw || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
  s = s.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim()
  for (let i = 0; i < 5; i++) {
    const m = s.match(/^bearer\s*:\s*/i) || s.match(/^bearer\s+/i)
    if (!m) break
    s = s.slice(m[0].length).trim()
  }
  s = s.replace(/\s+/g, '').replace(/^["'`]+/, '').replace(/["'`]+$/, '')
  return s ? `Bearer ${s}` : ''
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }
  const rawAuth = req.headers.get('x-xydc-authorization') || req.headers.get('x-xydc-token') || req.headers.get('authorization') || ''
  const auth = normalizeXydcAuth(rawAuth)
  const body = await req.text()
  const res = await fetch('https://mcp.xydc.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': auth,
      'MCP-Protocol-Version': req.headers.get('mcp-protocol-version') || '2025-11-25',
      ...(req.headers.get('mcp-session-id') ? { 'Mcp-Session-Id': req.headers.get('mcp-session-id') } : {}),
    },
    body,
  })
  const headers = new Headers(CORS)
  headers.set('Content-Type', res.headers.get('content-type') || 'application/json')
  const sid = res.headers.get('mcp-session-id')
  if (sid) headers.set('Mcp-Session-Id', sid)
  return new Response(res.body, { status: res.status, headers })
}
