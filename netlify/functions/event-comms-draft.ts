/**
 * Event communications — server-side draft generation (OpenAI only).
 * Body: JSON EventCommsDraftRequest-compatible shape.
 * Response: { title, body, mode }
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
  'press_release',
  'media_advisory',
  'pitch_email',
  'talking_points',
  'reporter_summary',
  'announcement_email',
  'social_package',
  'live_coverage_prompts',
  'post_event_recap',
])

function modeInstructions(mode: string): string {
  switch (mode) {
    case 'press_release':
      return 'Write a press release markdown with headline, dateline placeholder, quote placeholders, and boilerplate.'
    case 'media_advisory':
      return 'Write a media advisory: what, when, where, who, RSVP/contact — concise.'
    case 'pitch_email':
      return 'Write a short email pitch to 2–3 local reporters (no recipient names).'
    case 'talking_points':
      return '5–8 bullet talking points for surrogates and staff; include discipline reminders.'
    case 'reporter_summary':
      return 'One-page factual summary for reporters — not opinion; include logistics.'
    case 'announcement_email':
      return 'Supporter announcement email with subject line + body; include CTA and volunteer link placeholders.'
    case 'social_package':
      return 'Package: 3 short posts (Facebook, X, Instagram) with hashtags placeholders; include one thread outline.'
    case 'live_coverage_prompts':
      return 'Checklist of live-post prompts + photo moments + backup if crowd is thin.'
    case 'post_event_recap':
      return 'Recap narrative + thank-you note + 3 pull quotes placeholders + internal lessons bullets.'
    default:
      return 'Professional communications draft.'
  }
}

/** Client-visible message only — never return raw upstream bodies (may contain request ids). */
function safeOpenAiErrorHint(status: number): string {
  if (status === 401 || status === 403) return 'Draft service authentication error — contact admin.'
  if (status === 429) return 'Rate limited — try again shortly.'
  if (status >= 500) return 'Model provider error — try again or use the manual template.'
  return 'Draft service error — try again or use the manual template.'
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

  const ev = parsed.event
  if (!isRecord(ev)) return json(400, { error: 'event object required' })

  const title = typeof ev.title === 'string' ? ev.title.trim().slice(0, 200) : ''
  const start = typeof ev.start_at === 'string' ? ev.start_at : ''
  if (!title || !start) {
    return json(400, { error: 'event.title and event.start_at required' })
  }

  const snap = {
    title,
    event_type: typeof ev.event_type === 'string' ? ev.event_type : '',
    start_at: start,
    end_at: typeof ev.end_at === 'string' ? ev.end_at : '',
    timezone: typeof ev.timezone === 'string' ? ev.timezone : '',
    venue_name: typeof ev.venue_name === 'string' ? ev.venue_name : null,
    address_or_virtual: typeof ev.address_or_virtual === 'string' ? ev.address_or_virtual : null,
    postal_code: typeof ev.postal_code === 'string' ? ev.postal_code : null,
    county_id: typeof ev.county_id === 'string' ? ev.county_id : null,
    visibility_scope: typeof ev.visibility_scope === 'string' ? ev.visibility_scope : null,
    stage_status: typeof ev.stage_status === 'string' ? ev.stage_status : null,
    public_title: typeof ev.public_title === 'string' ? ev.public_title : null,
    public_description: typeof ev.public_description === 'string' ? ev.public_description : null,
    event_objective: typeof ev.event_objective === 'string' ? ev.event_objective.slice(0, 500) : null,
    notes: typeof ev.notes === 'string' ? ev.notes.slice(0, 800) : null,
    operational_status: typeof ev.operational_status === 'string' ? ev.operational_status : null,
  }

  const pressCtx =
    typeof parsed.press_context === 'string' ? parsed.press_context.trim().slice(0, 800) : ''

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const system = `You draft campaign event communications for staff review only.
Rules: Output JSON only with keys "title" (string) and "body" (string, markdown). No HTML.
Use only facts present in the event snapshot JSON — do not invent attendance, quotes, endorsements, or venue details not given.
If a field is missing, write a clear bracketed placeholder like [Add confirmed speaker] instead of fabricating names.
Advisory draft — not for automatic publishing or sending.`

  const user = `Mode: ${mode}
Instructions: ${modeInstructions(mode)}
Event snapshot (source of truth): ${JSON.stringify(snap)}
Communications context (deterministic hints): ${pressCtx || 'none'}`

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
      max_tokens: 2200,
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
    body: obj.body.trim().slice(0, 12000),
    mode,
  })
}
