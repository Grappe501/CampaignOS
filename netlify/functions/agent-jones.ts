/**
 * Agent Jones — server-side OpenAI only. No DB, no Twilio/SendGrid.
 * Env: OPENAI_API_KEY (required), OPENAI_MODEL (optional, default gpt-4o-mini).
 *
 * Context shape mirrors `src/lib/agentJonesContext.ts` but is validated here
 * independently so this bundle stays self-contained.
 */

type AgentJonesSafeContext = {
  progressSlice:
    | 'unmatched'
    | 'matched_no_branch'
    | 'exception_pending'
    | 'matched_ready'
  voterLoading: boolean
  profileHints?: {
    onboarding_branch?: string
    onboarding_status?: string
    active_space?: string
    exception_request_status?: string
    voter_status?: string
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    contact?: { addressLabel?: string; addressUrl?: string }
    social?: { platform: string; label: string; url: string }[]
  }
  currentTaskTitle?: string
  currentTaskStatus?: string
  currentTrainingTitle?: string
  currentTrainingStatus?: string
}

type RequestBody = {
  context: AgentJonesSafeContext
  /** Short line, normally a deterministic prompt label from the UI */
  userMessage: string
  model?: string
}

type NetlifyEvent = {
  httpMethod?: string
  body?: string | null
}

type NetlifyResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const MAX_USER_MESSAGE = 600

const SLICES = new Set([
  'unmatched',
  'matched_no_branch',
  'exception_pending',
  'matched_ready',
])

const SCROLL_IDS = new Set([
  'voter-workspace',
  'exception-request',
  'onboarding-branch',
  'workspace-cards',
  'agent-jones',
])

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
  return typeof x === 'object' && x !== null
}

function validateProfileHints(
  raw: unknown,
): AgentJonesSafeContext['profileHints'] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: NonNullable<AgentJonesSafeContext['profileHints']> = {}
  const keys = [
    'onboarding_branch',
    'onboarding_status',
    'active_space',
    'exception_request_status',
    'voter_status',
  ] as const
  for (const k of keys) {
    const v = raw[k]
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t || t.length > 128) continue
    out[k] = t
  }
  return Object.keys(out).length ? out : undefined
}

function validateSummaryLine(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t || t.length > max) return undefined
  if (/[<>\\]/.test(t)) return undefined
  return t
}

function validateUrl(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t || t.length > max) return undefined
  if (!/^https?:\/\//i.test(t)) return undefined
  if (/[<>\\"']/u.test(t)) return undefined
  return t
}

function validateCampaign(raw: unknown): AgentJonesSafeContext['campaign'] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined

  const slogan = validateSummaryLine(raw.slogan, 140)
  const shortBio = validateSummaryLine(raw.shortBio, 520)

  const issuePillarsRaw = raw.issuePillars
  const issuePillars: { title: string; summary: string }[] = []
  if (Array.isArray(issuePillarsRaw)) {
    for (const item of issuePillarsRaw.slice(0, 8)) {
      if (!isRecord(item)) continue
      const title = validateSummaryLine(item.title, 80)
      const summary = validateSummaryLine(item.summary, 240)
      if (!title || !summary) continue
      issuePillars.push({ title, summary })
    }
  }

  const ctasRaw = raw.ctas
  const ctas: { label: string; url: string }[] = []
  if (Array.isArray(ctasRaw)) {
    for (const item of ctasRaw.slice(0, 8)) {
      if (!isRecord(item)) continue
      const label = validateSummaryLine(item.label, 80)
      const url = validateUrl(item.url, 240)
      if (!label || !url) continue
      ctas.push({ label, url })
    }
  }

  const contactRaw = raw.contact
  const contact =
    isRecord(contactRaw)
      ? {
          addressLabel: validateSummaryLine(contactRaw.addressLabel, 180),
          addressUrl: validateUrl(contactRaw.addressUrl, 240),
        }
      : undefined

  const socialRaw = raw.social
  const social: { platform: string; label: string; url: string }[] = []
  if (Array.isArray(socialRaw)) {
    for (const item of socialRaw.slice(0, 12)) {
      if (!isRecord(item)) continue
      const platform = validateSummaryLine(item.platform, 32)
      const label = validateSummaryLine(item.label, 48)
      const url = validateUrl(item.url, 240)
      if (!platform || !label || !url) continue
      social.push({ platform, label, url })
    }
  }

  const out: NonNullable<AgentJonesSafeContext['campaign']> = {}
  if (slogan) out.slogan = slogan
  if (shortBio) out.shortBio = shortBio
  if (issuePillars.length) out.issuePillars = issuePillars
  if (ctas.length) out.ctas = ctas
  if (contact && (contact.addressLabel || contact.addressUrl)) out.contact = contact
  if (social.length) out.social = social
  return Object.keys(out).length ? out : undefined
}

function validateContext(raw: unknown): AgentJonesSafeContext | null {
  if (!isRecord(raw)) return null
  const slice = raw.progressSlice
  const voterLoading = raw.voterLoading
  if (typeof slice !== 'string' || !SLICES.has(slice)) return null
  if (typeof voterLoading !== 'boolean') return null
  const hints = validateProfileHints(raw.profileHints)
  const campaign = validateCampaign(raw.campaign)
  const currentTaskTitle = validateSummaryLine(raw.currentTaskTitle, 120)
  const currentTaskStatus = validateSummaryLine(raw.currentTaskStatus, 64)
  const currentTrainingTitle = validateSummaryLine(raw.currentTrainingTitle, 120)
  const currentTrainingStatus = validateSummaryLine(raw.currentTrainingStatus, 64)
  return {
    progressSlice: slice as AgentJonesSafeContext['progressSlice'],
    voterLoading,
    ...(hints ? { profileHints: hints } : {}),
    ...(campaign ? { campaign } : {}),
    ...(currentTaskTitle ? { currentTaskTitle } : {}),
    ...(currentTaskStatus ? { currentTaskStatus } : {}),
    ...(currentTrainingTitle ? { currentTrainingTitle } : {}),
    ...(currentTrainingStatus ? { currentTrainingStatus } : {}),
  }
}

function buildSystemPrompt(context: AgentJonesSafeContext): string {
  return `You are Agent Jones, a concise campaign volunteer coach for CampaignOS.

Rules:
- You ONLY reason about the volunteer using the JSON "dashboardContext" below. Do not claim you queried a database, opened Supabase, or accessed tools beyond this context.
- Progress is exactly one of: unmatched, matched_no_branch, exception_pending, matched_ready. voterLoading means roster/voter linkage is still loading — treat UI as cautious/verification-first.
- Campaign context (if present) is public campaign info (slogan, bio, issue pillars, CTAs, contact/social) — use it to ground recommendations and language, but do not invent policy details.
- Optional fields currentTaskTitle, currentTaskStatus, currentTrainingTitle, currentTrainingStatus are short labels only (no secrets); if absent, do not invent assignments.
- Stay practical, supportive, and brief (mobile screens). No legal/medical advice. Do not ask for passwords, SSNs, or full document uploads.
- If profileHints are missing, do not invent values.

dashboardContext:
${JSON.stringify(context)}

Output a single JSON object with:
- "response" (string, required): your answer to the user.
- "suggestedPrompts" (optional): max 4 of { "id": string (slug, letters/digits/hyphen/underscore), "label": string (short) } for follow-up taps.
- "actions" (optional): max 3 of { "type": "scroll", "targetId": string } where targetId is one of: ${[...SCROLL_IDS].join(', ')}.

No other top-level keys. No markdown fences — raw JSON only.`
}

function unwrapJsonBlock(text: string): string {
  const t = text.trim()
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/u, '')
      .trim()
  }
  return t
}

function parseModelObject(text: string): Record<string, unknown> | null {
  try {
    const o = JSON.parse(unwrapJsonBlock(text)) as unknown
    return isRecord(o) ? o : null
  } catch {
    return null
  }
}

function sanitizeSuggested(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const out: { id: string; label: string }[] = []
  for (const item of raw.slice(0, 4)) {
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    const label = typeof item.label === 'string' ? item.label.trim() : ''
    if (!id || !label || id.length > 64 || label.length > 120) continue
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) continue
    out.push({ id, label })
  }
  return out.length ? out : undefined
}

function sanitizeActions(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const out: { type: 'scroll'; targetId: string }[] = []
  for (const item of raw.slice(0, 3)) {
    if (!isRecord(item)) continue
    if (item.type !== 'scroll') continue
    const targetId =
      typeof item.targetId === 'string' ? item.targetId.trim() : ''
    if (!targetId || !SCROLL_IDS.has(targetId)) continue
    out.push({ type: 'scroll' as const, targetId })
  }
  return out.length ? out : undefined
}

export default async function handler(
  event: NetlifyEvent,
): Promise<NetlifyResponse> {
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

  let parsed: RequestBody
  try {
    parsed = JSON.parse(event.body ?? '{}') as RequestBody
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const context = validateContext(parsed.context)
  if (!context) {
    return json(400, {
      error:
        'Invalid context: require progressSlice (unmatched|matched_no_branch|exception_pending|matched_ready), voterLoading boolean, optional profileHints with only allowed string fields',
    })
  }

  const userMessage =
    typeof parsed.userMessage === 'string' ? parsed.userMessage.trim() : ''
  if (!userMessage || userMessage.length > MAX_USER_MESSAGE) {
    return json(400, {
      error: `userMessage required, max ${MAX_USER_MESSAGE} characters`,
    })
  }

  const model =
    (typeof parsed.model === 'string' && parsed.model.trim()) ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini'

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(context) },
    { role: 'user' as const, content: userMessage },
  ]

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  })

  const raw = await openaiRes.text()
  if (!openaiRes.ok) {
    return json(502, {
      error: 'OpenAI request failed',
      detail: raw.slice(0, 500),
    })
  }

  let data: unknown
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    return json(502, { error: 'Invalid OpenAI transport response' })
  }

  const choices = isRecord(data) ? data.choices : undefined
  const first = Array.isArray(choices) ? choices[0] : undefined
  const message = isRecord(first) ? first.message : undefined
  const content =
    isRecord(message) && typeof message.content === 'string'
      ? message.content.trim()
      : ''

  if (!content) {
    return json(502, { error: 'Empty model response' })
  }

  const obj = parseModelObject(content)
  let responseText: string
  let suggestedPrompts: ReturnType<typeof sanitizeSuggested>
  let actions: ReturnType<typeof sanitizeActions>

  if (obj && typeof obj.response === 'string' && obj.response.trim()) {
    responseText = obj.response.trim()
    suggestedPrompts = sanitizeSuggested(obj.suggestedPrompts)
    actions = sanitizeActions(obj.actions)
  } else {
    responseText = content
    suggestedPrompts = undefined
    actions = undefined
  }

  return json(200, {
    response: responseText,
    ...(suggestedPrompts ? { suggestedPrompts } : {}),
    ...(actions ? { actions } : {}),
  })
}
