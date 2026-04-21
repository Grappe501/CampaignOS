/**
 * Field narrative / message discipline — server-side draft (OpenAI only).
 * Body: { mode, tone, framework_excerpt, operator_note? }
 * Model must NOT invent policy, pillars, or candidates not present in framework_excerpt.
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

function json(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

const MODES = new Set([
  'field_canvass_intro',
  'field_phone_bank',
  'event_host_remarks',
  'talking_point_compress',
  'talking_point_expand',
  'objection_reply',
])

const TONES = new Set(['candidate', 'surrogate', 'volunteer', 'staff'])

function modeInstructions(mode: string): string {
  switch (mode) {
    case 'field_canvass_intro':
      return 'Draft a short door-to-door intro (under 120 words) using only themes from the framework JSON.'
    case 'field_phone_bank':
      return 'Draft a phone-bank opener + one pivot line + respectful close (under 140 words).'
    case 'event_host_remarks':
      return 'Draft 3–5 short remarks for a host welcoming attendees (under 160 words).'
    case 'talking_point_compress':
      return 'Compress the strongest talking points into 3 bullets (max 12 words each).'
    case 'talking_point_expand':
      return 'Expand 1–2 talking points into short paragraphs for volunteer training (under 200 words).'
    case 'objection_reply':
      return 'Using rebuttals in the framework JSON, draft 2 calm reply options to a skeptical voter.'
    default:
      return 'Professional field script aligned to the framework JSON.'
  }
}

function safeOpenAiErrorHint(status: number): string {
  if (status === 401 || status === 403) return 'Draft service authentication error — contact admin.'
  if (status === 429) return 'Rate limited — try again shortly.'
  if (status >= 500) return 'Model provider error — try again or use manual templates.'
  return 'Draft service error — try again or use manual templates.'
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
  if (!isRecord(parsed)) return json(400, { error: 'Expected JSON object' })

  const mode = typeof parsed.mode === 'string' ? parsed.mode.trim() : ''
  if (!MODES.has(mode)) {
    return json(400, { error: 'Invalid mode' })
  }

  const toneRaw = typeof parsed.tone === 'string' ? parsed.tone.trim() : 'volunteer'
  const tone = TONES.has(toneRaw) ? toneRaw : 'volunteer'

  const excerpt = parsed.framework_excerpt
  if (!isRecord(excerpt)) return json(400, { error: 'framework_excerpt object required' })

  const excerptStr = JSON.stringify(excerpt)
  if (excerptStr.length > 12_000) {
    return json(400, { error: 'framework_excerpt too large' })
  }

  const operator_note =
    typeof parsed.operator_note === 'string' ? parsed.operator_note.trim().slice(0, 600) : ''

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const system = `You assist a U.S. congressional campaign with FIELD NARRATIVE drafts for human review only.
Hard rules:
- Use ONLY themes, talking points, pillars, and rebuttals present in the provided framework_excerpt JSON.
- Do NOT invent new policy positions, new issue pillars, new candidate names, or new biographical claims.
- Do NOT promise election outcomes, legal outcomes, or benefits not implied by the framework.
- Output JSON only with keys "title" (short label) and "body" (markdown). No HTML.
- Tone: ${tone} — candidate is first-person as the candidate; surrogate/third-person careful; volunteer is neighbor-to-neighbor; staff is operational.
- Advisory only — not for auto-send or bulk texting without human approval.`

  const user = `Mode: ${mode}
Instructions: ${modeInstructions(mode)}
Framework excerpt (source of truth — do not exceed): ${excerptStr}
Operator note (optional local context): ${operator_note || 'none'}`

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.35,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    }),
  })

  const rawText = await openaiRes.text()
  if (!openaiRes.ok) {
    return json(502, {
      error: safeOpenAiErrorHint(openaiRes.status),
      mode,
    })
  }

  let data: unknown
  try {
    data = JSON.parse(rawText) as unknown
  } catch {
    return json(502, { error: 'Invalid OpenAI response' })
  }
  const choices = isRecord(data) ? data.choices : undefined
  const first = Array.isArray(choices) ? choices[0] : undefined
  const message = isRecord(first) ? first.message : undefined
  const content =
    isRecord(message) && typeof message.content === 'string' ? message.content.trim() : ''

  let obj: unknown
  try {
    obj = JSON.parse(content)
  } catch {
    return json(502, { error: 'Model did not return JSON' })
  }
  if (!isRecord(obj) || typeof obj.title !== 'string' || typeof obj.body !== 'string') {
    return json(502, { error: 'Invalid draft shape from model' })
  }

  return json(200, {
    title: obj.title.trim().slice(0, 200),
    body: obj.body.trim().slice(0, 10_000),
    mode,
  })
}
