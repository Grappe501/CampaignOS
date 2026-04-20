/**
 * Client for Netlify `agent-jones-transcribe` (OpenAI STT, server-side key).
 */

import { getNetlifyFunctionsOrigin } from './agentJones'

export type AgentJonesTranscribeErrorBody = {
  error: string
  detail?: string
}

export class AgentJonesTranscribeError extends Error {
  readonly status: number
  readonly body: AgentJonesTranscribeErrorBody | null

  constructor(
    message: string,
    status: number,
    body: AgentJonesTranscribeErrorBody | null,
  ) {
    super(message)
    this.name = 'AgentJonesTranscribeError'
    this.status = status
    this.body = body
  }
}

export function getAgentJonesTranscribeUrl(): string {
  const origin = getNetlifyFunctionsOrigin()
  const path = '/.netlify/functions/agent-jones-transcribe'
  return origin ? `${origin}${path}` : path
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = reader.result
      if (typeof s !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const comma = s.indexOf(',')
      resolve(comma >= 0 ? s.slice(comma + 1) : s)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Sends recorded audio to OpenAI via Netlify; returns transcript text (trimmed).
 */
export async function transcribeAgentJonesAudio(blob: Blob): Promise<string> {
  const audioBase64 = await blobToBase64(blob)
  const mimeType = blob.type && blob.type.trim() ? blob.type : 'audio/webm'

  const url = getAgentJonesTranscribeUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType }),
  })

  const raw = await res.text()
  let data: unknown = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    const err =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as AgentJonesTranscribeErrorBody).error === 'string'
        ? (data as AgentJonesTranscribeErrorBody)
        : null
    throw new AgentJonesTranscribeError(
      err?.error ?? `Transcription failed (${res.status})`,
      res.status,
      err,
    )
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof (data as Record<string, unknown>).text !== 'string'
  ) {
    throw new AgentJonesTranscribeError(
      'Invalid transcription response',
      res.status,
      null,
    )
  }

  const text = String((data as Record<string, unknown>).text).trim()
  if (!text) {
    throw new AgentJonesTranscribeError('Empty transcript', res.status, null)
  }

  return text
}
