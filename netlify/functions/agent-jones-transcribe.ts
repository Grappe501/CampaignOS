/**
 * Agent Jones — OpenAI speech-to-text only (no chat).
 * Same OPENAI_API_KEY as agent-jones; optional OPENAI_TRANSCRIPTION_MODEL (default whisper-1).
 *
 * Body: JSON { audioBase64: string, mimeType?: string }
 * Response: { text: string }
 */

type NetlifyEvent = {
  httpMethod?: string
  body?: string | null
}

type NetlifyResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

/** ~4 MiB raw audio after base64 decode */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024
/** Base64 expands payload; reject obviously huge bodies */
const MAX_B64_CHARS = 6 * 1024 * 1024

function json(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  }
}

function pickFilename(mimeType: string): string {
  const m = mimeType.toLowerCase()
  if (m.includes('wav')) return 'clip.wav'
  if (m.includes('mp4') || m.includes('m4a') || m.includes('mp3')) return 'clip.m4a'
  return 'clip.webm'
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) {
    return json(503, { error: 'OPENAI_API_KEY is not configured' })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(event.body ?? '{}')
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  if (!parsed || typeof parsed !== 'object') {
    return json(400, { error: 'Expected JSON object' })
  }

  const o = parsed as Record<string, unknown>
  const audioBase64 =
    typeof o.audioBase64 === 'string' ? o.audioBase64.trim() : ''
  const mimeTypeRaw =
    typeof o.mimeType === 'string' && o.mimeType.trim()
      ? o.mimeType.trim()
      : 'audio/webm'

  if (!audioBase64) {
    return json(400, { error: 'audioBase64 required' })
  }
  if (audioBase64.length > MAX_B64_CHARS) {
    return json(400, { error: 'audio payload too large' })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(audioBase64, 'base64')
  } catch {
    return json(400, { error: 'invalid base64 audio' })
  }

  if (buffer.length < 200) {
    return json(400, { error: 'audio too short' })
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    return json(400, { error: 'audio too large' })
  }

  const model =
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'whisper-1'
  const filename = pickFilename(mimeTypeRaw)

  const blob = new Blob([buffer], { type: mimeTypeRaw })
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('model', model)

  const openaiRes = await fetch(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    },
  )

  const raw = await openaiRes.text()
  if (!openaiRes.ok) {
    return json(502, {
      error: 'OpenAI transcription failed',
      detail: raw.slice(0, 480),
    })
  }

  let data: unknown
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    return json(502, { error: 'Invalid OpenAI response' })
  }

  const text =
    data &&
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).text === 'string'
      ? String((data as Record<string, unknown>).text).trim()
      : ''

  if (!text) {
    return json(502, { error: 'empty transcription' })
  }

  return json(200, { text })
}
