/**
 * Agent Jones — server-side OpenAI only. No DB, no Twilio/SendGrid.
 * Env: OPENAI_API_KEY (required), OPENAI_MODEL (optional, default gpt-4o-mini).
 *
 * Context shape mirrors `src/lib/agentJonesContext.ts` but is validated here
 * independently so this bundle stays self-contained.
 */

type AgentJonesOnboardingBrief = {
  flowSteps?: string[]
  welcomePurpose?: string
  howWeWork?: string
  howWeGrow?: string
  pickLane?: string
  firstActions?: string
  messaging?: string
  escalation?: string
  valueTitles?: string[]
  laneOptions?: {
    key: string
    title: string
    summary?: string
    firstAction?: string
  }[]
  talkTrackTitles?: string[]
}

type AgentJonesSafeContextV2 = {
  user: {
    role?: string | null
    onboarding_status?: string | null
    onboarding_branch?: string | null
    onboarding_momentum_state?: string | null
    onboarding_direction_key?: string | null
    onboarding_micro_commitment_key?: string | null
    voterMatched: boolean
    precinct?: string | null
    county?: string | null
    congressional_district?: string | null
    state_senate_district?: string | null
    state_representative_district?: string | null
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    onboardingBrief?: AgentJonesOnboardingBrief
  }
  operational: {
    progressSlice:
      | 'unmatched'
      | 'matched_no_branch'
      | 'exception_pending'
      | 'matched_ready'
    voterLoading: boolean
    needsOnboardingPath: boolean
  }
}

type AgentJonesSafeContextLegacy = {
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
    onboardingBrief?: AgentJonesOnboardingBrief
    contact?: { addressLabel?: string; addressUrl?: string }
    social?: { platform: string; label: string; url: string }[]
  }
  currentTaskTitle?: string
  currentTaskStatus?: string
  currentTrainingTitle?: string
  currentTrainingStatus?: string
}

type RequestBody = {
  context: AgentJonesSafeContextV2 | AgentJonesSafeContextLegacy
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
): AgentJonesSafeContextLegacy['profileHints'] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: NonNullable<AgentJonesSafeContextLegacy['profileHints']> = {}
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

function validateOnboardingBrief(raw: unknown): AgentJonesOnboardingBrief | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesOnboardingBrief = {}

  const fsRaw = raw.flowSteps
  if (Array.isArray(fsRaw)) {
    const flowSteps: string[] = []
    for (const item of fsRaw.slice(0, 8)) {
      const line = validateSummaryLine(item, 80)
      if (line) flowSteps.push(line)
    }
    if (flowSteps.length) out.flowSteps = flowSteps
  }

  const strKeys = [
    'welcomePurpose',
    'howWeWork',
    'howWeGrow',
    'pickLane',
    'firstActions',
    'messaging',
    'escalation',
  ] as const
  for (const k of strKeys) {
    const v = validateSummaryLine(raw[k], 620)
    if (v) out[k] = v
  }

  const vtRaw = raw.valueTitles
  if (Array.isArray(vtRaw)) {
    const valueTitles: string[] = []
    for (const item of vtRaw.slice(0, 10)) {
      const line = validateSummaryLine(item, 72)
      if (line) valueTitles.push(line)
    }
    if (valueTitles.length) out.valueTitles = valueTitles
  }

  const ttRaw = raw.talkTrackTitles
  if (Array.isArray(ttRaw)) {
    const talkTrackTitles: string[] = []
    for (const item of ttRaw.slice(0, 8)) {
      const line = validateSummaryLine(item, 80)
      if (line) talkTrackTitles.push(line)
    }
    if (talkTrackTitles.length) out.talkTrackTitles = talkTrackTitles
  }

  const loRaw = raw.laneOptions
  if (Array.isArray(loRaw)) {
    const laneOptions: NonNullable<AgentJonesOnboardingBrief['laneOptions']> = []
    for (const item of loRaw.slice(0, 5)) {
      if (!isRecord(item)) continue
      const key = validateSummaryLine(item.key, 48)
      const title = validateSummaryLine(item.title, 88)
      if (!key || !title) continue
      const summary = validateSummaryLine(item.summary, 240)
      const firstAction = validateSummaryLine(item.firstAction, 320)
      laneOptions.push({
        key,
        title,
        ...(summary ? { summary } : {}),
        ...(firstAction ? { firstAction } : {}),
      })
    }
    if (laneOptions.length) out.laneOptions = laneOptions
  }

  return Object.keys(out).length ? out : undefined
}

function validateCampaign(
  raw: unknown,
): AgentJonesSafeContextLegacy['campaign'] | undefined {
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

  const out: NonNullable<AgentJonesSafeContextLegacy['campaign']> = {}
  if (slogan) out.slogan = slogan
  if (shortBio) out.shortBio = shortBio
  if (issuePillars.length) out.issuePillars = issuePillars
  if (ctas.length) out.ctas = ctas
  if (contact && (contact.addressLabel || contact.addressUrl)) out.contact = contact
  if (social.length) out.social = social

  const onboardingBrief = validateOnboardingBrief(raw.onboardingBrief)
  if (onboardingBrief) out.onboardingBrief = onboardingBrief

  return Object.keys(out).length ? out : undefined
}

function validateUser(raw: unknown): AgentJonesSafeContextV2['user'] | null {
  if (!isRecord(raw)) return null
  if (typeof raw.voterMatched !== 'boolean') return null
  const out: AgentJonesSafeContextV2['user'] = { voterMatched: raw.voterMatched }
  const keys = [
    'role',
    'onboarding_status',
    'onboarding_branch',
    'onboarding_momentum_state',
    'onboarding_direction_key',
    'onboarding_micro_commitment_key',
    'precinct',
    'county',
    'congressional_district',
    'state_senate_district',
    'state_representative_district',
  ] as const
  for (const k of keys) {
    const v = raw[k]
    if (v === null || v === undefined) continue
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t || t.length > 140) continue
    if (/[<>\\]/.test(t)) continue
    ;(out as Record<string, unknown>)[k] = t
  }
  return out
}

function validateOperational(
  raw: unknown,
): AgentJonesSafeContextV2['operational'] | null {
  if (!isRecord(raw)) return null
  const slice = raw.progressSlice
  const voterLoading = raw.voterLoading
  const needs = raw.needsOnboardingPath
  if (typeof slice !== 'string' || !SLICES.has(slice)) return null
  if (typeof voterLoading !== 'boolean') return null
  if (typeof needs !== 'boolean') return null
  return {
    progressSlice: slice as AgentJonesSafeContextV2['operational']['progressSlice'],
    voterLoading,
    needsOnboardingPath: needs,
  }
}

function legacyToV2(raw: AgentJonesSafeContextLegacy): AgentJonesSafeContextV2 {
  return {
    user: {
      role: undefined,
      onboarding_status: raw.profileHints?.onboarding_status,
      onboarding_branch: raw.profileHints?.onboarding_branch,
      voterMatched: raw.progressSlice !== 'unmatched' && raw.progressSlice !== 'exception_pending',
    },
    ...(raw.campaign
      ? {
          campaign: {
            ...(raw.campaign.slogan ? { slogan: raw.campaign.slogan } : {}),
            ...(raw.campaign.shortBio ? { shortBio: raw.campaign.shortBio } : {}),
            ...(raw.campaign.issuePillars ? { issuePillars: raw.campaign.issuePillars } : {}),
            ...(raw.campaign.ctas ? { ctas: raw.campaign.ctas } : {}),
            ...(raw.campaign.onboardingBrief
              ? { onboardingBrief: raw.campaign.onboardingBrief }
              : {}),
          },
        }
      : {}),
    operational: {
      progressSlice: raw.progressSlice,
      voterLoading: raw.voterLoading,
      needsOnboardingPath: false,
    },
  }
}

function validateContext(raw: unknown): AgentJonesSafeContextV2 | null {
  if (!isRecord(raw)) return null

  // V2 path
  if ('user' in raw && 'operational' in raw) {
    const user = validateUser(raw.user)
    const operational = validateOperational(raw.operational)
    if (!user || !operational) return null
    const campaign = validateCampaign(raw.campaign)
    return {
      user,
      operational,
      ...(campaign
        ? {
            campaign: {
              ...(campaign.slogan ? { slogan: campaign.slogan } : {}),
              ...(campaign.shortBio ? { shortBio: campaign.shortBio } : {}),
              ...(campaign.issuePillars ? { issuePillars: campaign.issuePillars } : {}),
              ...(campaign.ctas ? { ctas: campaign.ctas } : {}),
              ...(campaign.onboardingBrief
                ? { onboardingBrief: campaign.onboardingBrief }
                : {}),
            },
          }
        : {}),
    }
  }

  // Legacy path (accept then adapt)
  const legacy = raw as unknown as AgentJonesSafeContextLegacy
  const slice = legacy.progressSlice
  const voterLoading = legacy.voterLoading
  if (typeof slice !== 'string' || !SLICES.has(slice)) return null
  if (typeof voterLoading !== 'boolean') return null
  const hints = validateProfileHints(legacy.profileHints)
  const campaign = validateCampaign(legacy.campaign)
  return legacyToV2({ ...legacy, ...(hints ? { profileHints: hints } : {}), ...(campaign ? { campaign } : {}) })
}

function buildSystemPrompt(context: AgentJonesSafeContextV2): string {
  return `You are Agent Jones V2, a context-aware campaign operator inside CampaignOS.

Rules:
- You ONLY reason about the volunteer using the JSON "dashboardContext" below. Do not claim you queried a database, opened Supabase, or accessed tools beyond this context.
- Progress is exactly one of: unmatched, matched_no_branch, exception_pending, matched_ready (dashboardContext.operational.progressSlice).
- voterLoading means roster/voter linkage is still loading — be cautious/verification-first.
- Campaign context (if present) is public campaign info (slogan, bio, issue pillars, CTAs) — ground wording and next-steps in it, but do not invent policy details.
- If dashboardContext.campaign.onboardingBrief exists, it is the structured Volunteer Welcome Kit + Organization Outline (culture, lane options, first actions, messaging, escalation). Use it for how we work, lane fit, first tasks, and when to escalate — still do not invent policy beyond what is written there.
- Stay practical, supportive, and brief (mobile screens). No legal/medical advice. Do not ask for passwords, SSNs, or full document uploads.
- Never reveal sensitive voter history. You may reference precinct/county/district if present.
- If dashboardContext.user includes onboarding_momentum_state / onboarding_direction_key / onboarding_micro_commitment_key, the volunteer is in optional guided momentum (not a wizard). Honor their direction and micro-commitment when suggesting next steps; never imply they are blocked from the dashboard.

dashboardContext:
${JSON.stringify(context)}

Output a single JSON object with:
- "response" (string, required): your answer to the user.
- "suggestedPrompts" (optional): max 4 strings (short, tap-friendly).
- "recommendedActions" (optional): max 3 of:
  - { "type": "scroll", "targetId": one of: ${[...SCROLL_IDS].join(', ')} }
  - { "type": "navigate", "targetId": "/dashboard" | "/" }
  - { "type": "task", "taskType": string (short label) }
- "insight" (optional): { "type": "campaign_context" | "user_context" | "strategy", "message": string }

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
  const out: string[] = []
  for (const item of raw.slice(0, 6)) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (!t || t.length > 120) continue
    if (/[<>\\]/.test(t)) continue
    out.push(t)
  }
  return out.length ? out : undefined
}

function sanitizeActions(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const out: { type: 'scroll' | 'navigate' | 'task'; targetId?: string; taskType?: string }[] = []
  for (const item of raw.slice(0, 3)) {
    if (!isRecord(item)) continue
    const type = typeof item.type === 'string' ? item.type.trim() : ''
    if (type === 'scroll') {
      const targetId =
        typeof item.targetId === 'string' ? item.targetId.trim() : ''
      if (!targetId || !SCROLL_IDS.has(targetId)) continue
      out.push({ type: 'scroll' as const, targetId })
      continue
    }
    if (type === 'navigate') {
      const targetId =
        typeof item.targetId === 'string' ? item.targetId.trim() : ''
      if (!targetId || (targetId !== '/' && targetId !== '/dashboard')) continue
      out.push({ type: 'navigate' as const, targetId })
      continue
    }
    if (type === 'task') {
      const taskType =
        typeof item.taskType === 'string' ? item.taskType.trim() : ''
      if (!taskType || taskType.length > 80 || /[<>\\]/.test(taskType)) continue
      out.push({ type: 'task' as const, taskType })
      continue
    }
  }
  return out.length ? out : undefined
}

function sanitizeInsight(raw: unknown) {
  if (!isRecord(raw)) return undefined
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  if (
    (type === 'campaign_context' ||
      type === 'user_context' ||
      type === 'strategy') &&
    message &&
    message.length <= 220 &&
    !/[<>\\]/.test(message)
  ) {
    return { type, message }
  }
  return undefined
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
        'Invalid context: require { user: { voterMatched }, operational: { progressSlice, voterLoading, needsOnboardingPath }, optional campaign }',
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
  let recommendedActions: ReturnType<typeof sanitizeActions>
  let insight: ReturnType<typeof sanitizeInsight>

  if (obj && typeof obj.response === 'string' && obj.response.trim()) {
    responseText = obj.response.trim()
    suggestedPrompts = sanitizeSuggested(obj.suggestedPrompts)
    recommendedActions = sanitizeActions(obj.recommendedActions)
    insight = sanitizeInsight(obj.insight)
  } else {
    responseText = content
    suggestedPrompts = undefined
    recommendedActions = undefined
    insight = undefined
  }

  return json(200, {
    response: responseText,
    ...(suggestedPrompts ? { suggestedPrompts } : {}),
    ...(recommendedActions ? { recommendedActions } : {}),
    ...(insight ? { insight } : {}),
  })
}
