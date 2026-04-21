/**
 * Placeholder for SendGrid/Twilio-backed sends. Returns structured "not wired" until keys exist.
 * POST { channel: "email"|"sms", event_id: string, preview_only?: boolean }
 */

type NetlifyEvent = { httpMethod?: string; body?: string | null }
type NetlifyResponse = { statusCode: number; headers: Record<string, string>; body: string }

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(code: number, o: unknown): NetlifyResponse {
  return { statusCode: code, headers: cors, body: JSON.stringify(o) }
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const hasSendgrid = Boolean(process.env.SENDGRID_API_KEY?.trim())
  const hasTwilio =
    Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
    Boolean(process.env.TWILIO_PHONE_NUMBER?.trim())

  return json(501, {
    ok: false,
    error: 'Delivery channel stub — implement SendGrid/Twilio send in a gated deploy.',
    sendgrid_configured: hasSendgrid,
    twilio_configured: hasTwilio,
    hint: 'Set SENDGRID_API_KEY / Twilio vars on Netlify; wire sends only after permission review.',
  })
}
