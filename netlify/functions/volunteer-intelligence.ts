/**
 * Volunteer intelligence — OpenAI embeddings + Responses API structured recommendation ranking.
 * OPENAI_API_KEY server-side only. Optional: VOLUNTEER_INTEL_MODEL (default gpt-4o-mini), OPENAI_EMBEDDING_MODEL (default text-embedding-3-small).
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
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

const REC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ranked_opportunities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          opportunity_id: { type: 'string' },
          ai_fit_score: { type: 'number' },
          recommendation_strength: {
            type: 'string',
            enum: ['strong', 'good', 'moderate', 'weak'],
          },
          top_reasons: { type: 'array', items: { type: 'string' } },
          blockers: { type: 'array', items: { type: 'string' } },
          suggested_next_step: { type: 'string' },
          confidence: { type: 'number' },
          explanation_summary: { type: 'string' },
        },
        required: [
          'opportunity_id',
          'ai_fit_score',
          'recommendation_strength',
          'top_reasons',
          'blockers',
          'suggested_next_step',
          'confidence',
          'explanation_summary',
        ],
      },
    },
  },
  required: ['ranked_opportunities'],
} as const

const SYSTEM = [
  'You are a volunteer operations assistant for a political campaign.',
  'You receive JSON describing one volunteer and several opportunity candidates with eligibility and scores.',
  'Rank opportunities from strongest to weakest fit. Never invent qualifications not present in the input.',
  'If a candidate is not claim-eligible, explain blockers factually and suggest a constructive next step.',
  'Do not tell the volunteer to claim opportunities that are blocked for them.',
  'Output must match the JSON schema exactly.',
].join('\n')

function parseResponsesOutput(data: Record<string, unknown>): string | null {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }
  const out = data.output
  if (!Array.isArray(out)) return null
  for (const item of out) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (o.type !== 'message' && o.type !== 'output_message') continue
    const content = o.content
    if (typeof content === 'string' && content.trim()) return content.trim()
    if (Array.isArray(content)) {
      const parts: string[] = []
      for (const c of content) {
        if (!c || typeof c !== 'object') continue
        const x = c as Record<string, unknown>
        if (x.type === 'output_text' && typeof x.text === 'string') parts.push(x.text)
        if (x.type === 'text' && typeof x.text === 'string') parts.push(x.text)
      }
      const t = parts.join('').trim()
      if (t) return t
    }
  }
  return null
}

async function openaiResponsesStructured(input: string, model: string, key: string): Promise<{ text: string; usedResponsesApi: boolean }> {
  const body = {
    model,
    input: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: input },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'volunteer_recommendations',
        strict: true,
        schema: REC_SCHEMA,
      },
    },
    store: false,
    temperature: 0.2,
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const raw = await res.text()
  let data: Record<string, unknown>
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    throw new Error('OpenAI Responses: invalid JSON')
  }

  if (!res.ok) {
    const err = typeof data.error === 'object' && data.error && 'message' in (data.error as object)
      ? String((data.error as { message?: string }).message)
      : raw.slice(0, 200)
    throw new Error(`OpenAI Responses: ${err}`)
  }

  const text = parseResponsesOutput(data)
  if (!text) throw new Error('OpenAI Responses: empty output')
  return { text, usedResponsesApi: true }
}

async function openaiChatCompletionsStructured(input: string, model: string, key: string): Promise<{ text: string; usedResponsesApi: boolean }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: input },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'volunteer_recommendations',
          strict: true,
          schema: REC_SCHEMA,
        },
      },
    }),
  })

  const raw = await res.text()
  let data: { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error('OpenAI Chat: invalid JSON')
  }

  if (!res.ok) {
    throw new Error(`OpenAI Chat: ${data.error?.message ?? raw.slice(0, 200)}`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAI Chat: empty content')
  return { text, usedResponsesApi: false }
}

async function embedText(text: string, key: string): Promise<{ embedding: number[]; model: string }> {
  const model = process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small'
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text }),
  })
  const raw = await res.text()
  let data: { data?: { embedding?: number[] }[]; error?: { message?: string } }
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error('OpenAI Embeddings: invalid JSON')
  }
  if (!res.ok) {
    throw new Error(`OpenAI Embeddings: ${data.error?.message ?? raw.slice(0, 200)}`)
  }
  const emb = data.data?.[0]?.embedding
  if (!emb || !Array.isArray(emb)) throw new Error('OpenAI Embeddings: missing vector')
  return { embedding: emb, model }
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
  const action = typeof o.action === 'string' ? o.action : ''

  if (action === 'embed') {
    const text = typeof o.text === 'string' ? o.text.trim() : ''
    if (!text || text.length > 32000) {
      return json(400, { error: 'Missing or oversized text' })
    }
    try {
      const { embedding, model } = await embedText(text, key)
      return json(200, {
        embedding,
        model,
        dimensions: embedding.length,
      })
    } catch (e) {
      return json(502, { error: e instanceof Error ? e.message : 'embed failed' })
    }
  }

  if (action === 'recommend') {
    const volunteerSummary = o.volunteerSummary
    const candidates = o.candidates
    if (!volunteerSummary || typeof volunteerSummary !== 'object') {
      return json(400, { error: 'volunteerSummary required' })
    }
    if (!Array.isArray(candidates)) {
      return json(400, { error: 'candidates array required' })
    }

    const payload = JSON.stringify({ volunteer: volunteerSummary, candidates }, null, 0)
    const model = process.env.VOLUNTEER_INTEL_MODEL?.trim() || 'gpt-4o-mini'

    try {
      let text: string
      let usedResponsesApi: boolean
      try {
        const r = await openaiResponsesStructured(payload, model, key)
        text = r.text
        usedResponsesApi = r.usedResponsesApi
      } catch {
        const r = await openaiChatCompletionsStructured(payload, model, key)
        text = r.text
        usedResponsesApi = r.usedResponsesApi
      }

      const parsedOut = JSON.parse(text) as {
        ranked_opportunities: Array<Record<string, unknown>>
      }
      const ranked = parsedOut.ranked_opportunities ?? []
      const out = ranked.map((row) => ({
        opportunity_id: String(row.opportunity_id ?? ''),
        ai_fit_score: Number(row.ai_fit_score ?? 0),
        recommendation_strength: row.recommendation_strength,
        top_reasons: Array.isArray(row.top_reasons) ? row.top_reasons.map(String) : [],
        blockers: Array.isArray(row.blockers) ? row.blockers.map(String) : [],
        suggested_next_step: String(row.suggested_next_step ?? ''),
        confidence: Number(row.confidence ?? 0),
        explanation_summary: String(row.explanation_summary ?? ''),
      }))

      return json(200, {
        ranked: out,
        model,
        usedResponsesApi,
      })
    } catch (e) {
      return json(502, { error: e instanceof Error ? e.message : 'recommend failed' })
    }
  }

  return json(400, { error: 'Unknown action' })
}

export default handler
