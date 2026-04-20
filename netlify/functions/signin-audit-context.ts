type NetlifyEvent = {
  httpMethod: string
  headers: Record<string, string | undefined>
  body?: string
}

type NetlifyResponse = {
  statusCode: number
  headers?: Record<string, string>
  body?: string
}

/**
 * Returns best-effort client IP from edge headers for audit logging (risk signal only).
 */
export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event) }
  }
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const forwarded = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For']
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null
  const clientIp = first || event.headers['x-real-ip'] || event.headers['client-ip'] || null

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event),
    },
    body: JSON.stringify({
      observedIp: clientIp,
      source: 'netlify_edge_headers',
    }),
  }
}

function corsHeaders(event: NetlifyEvent): Record<string, string> {
  const origin = event.headers.origin || event.headers.Origin || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
