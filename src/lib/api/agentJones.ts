/**
 * Client for the Netlify `agent-jones` function (server-side OpenAI only).
 *
 * - **Production / Netlify host:** same-origin `/.netlify/functions/agent-jones`.
 * - **Local Vite:** set `VITE_NETLIFY_FUNCTIONS_ORIGIN` (e.g. `http://localhost:8888`) with `netlify dev`.
 */

import type { AgentJonesContextV2 } from '../agentJonesContextV2'
import {
  isAgentJonesNavigatePath,
  isAgentJonesScrollTargetId,
} from '../agentJonesContext'
import { ONBOARDING_DIRECTION_SLUGS } from '../onboardingEngine'

export type AgentJonesRequest = {
  context: AgentJonesContextV2
  userMessage: string
  model?: string
}

export type AgentJonesResponse = {
  response: string
  suggestedPrompts?: string[]
  recommendedActions?: {
    type: 'scroll' | 'navigate' | 'task'
    targetId?: string
    taskType?: string
  }[]
  insight?: {
    type: 'campaign_context' | 'user_context' | 'strategy'
    message: string
  }
  /** Optional onboarding engine hints (additive contract). */
  onboardingPrompt?: string
  selectedDirection?: string
  suggestedMicroCommitment?: { id: string; title: string }
  reinforcementMessage?: string
}

export type AgentJonesErrorBody = {
  error: string
  detail?: string
  /** Present when OpenAI returned a non-2xx HTTP status (server forwards for debugging). */
  httpStatus?: number
}

/** User-visible message for failed HTTP responses from the agent-jones function. */
export function formatAgentJonesFailureMessage(
  status: number,
  body: AgentJonesErrorBody | null,
): string {
  if (!body?.error) return `Agent Jones request failed (${status})`
  if (status === 503) {
    const extra = body.detail ? ` ${body.detail}` : ''
    return `${body.error}.${extra}`.trim()
  }
  if (status === 502) {
    const d = typeof body.detail === 'string' ? body.detail.trim() : ''
    if (d) {
      return `${body.error}: ${d.slice(0, 450)}`
    }
    return `${body.error}. Check OpenAI API key, billing/quota, and that OPENAI_MODEL is available to your org.`
  }
  const d = typeof body.detail === 'string' ? body.detail.trim() : ''
  return d ? `${body.error} — ${d.slice(0, 320)}` : body.error
}

/** Extra setup line for operators when the model API is down or unconfigured. */
export function getAgentJonesSetupHint(status: number): string | null {
  if (status === 503) {
    return 'After setting OPENAI_API_KEY on Netlify, redeploy. Local: .env + netlify dev, and VITE_NETLIFY_FUNCTIONS_ORIGIN=http://localhost:8888'
  }
  if (status === 502) {
    return 'Verify the key at platform.openai.com, ensure billing is active, and try the default model (gpt-4o-mini) if your org limits models.'
  }
  return null
}

export class AgentJonesApiError extends Error {
  readonly status: number
  readonly body: AgentJonesErrorBody | null

  constructor(message: string, status: number, body: AgentJonesErrorBody | null) {
    super(message)
    this.name = 'AgentJonesApiError'
    this.status = status
    this.body = body
  }
}

/** Base URL for Netlify functions (no trailing slash). Empty = same origin. */
export function getNetlifyFunctionsOrigin(): string {
  return String(import.meta.env.VITE_NETLIFY_FUNCTIONS_ORIGIN ?? '').replace(
    /\/$/,
    '',
  )
}

export function getAgentJonesEndpointUrl(): string {
  const origin = getNetlifyFunctionsOrigin()
  const path = '/.netlify/functions/agent-jones'
  return origin ? `${origin}${path}` : path
}

function sanitizeReply(data: unknown): AgentJonesResponse | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (typeof o.response !== 'string' || !o.response.trim()) return null

  const reply: AgentJonesResponse = { response: o.response.trim() }

  if (Array.isArray(o.suggestedPrompts)) {
    const prompts: string[] = []
    for (const p of o.suggestedPrompts.slice(0, 6)) {
      if (typeof p !== 'string') continue
      const t = p.trim()
      if (!t || t.length > 120) continue
      if (/[<>\\]/.test(t)) continue
      prompts.push(t)
    }
    if (prompts.length) reply.suggestedPrompts = prompts.slice(0, 4)
  }

  if (Array.isArray(o.recommendedActions)) {
    const actions: NonNullable<AgentJonesResponse['recommendedActions']> = []
    for (const a of o.recommendedActions.slice(0, 6)) {
      if (!a || typeof a !== 'object') continue
      const r = a as Record<string, unknown>
      const type = typeof r.type === 'string' ? r.type.trim() : ''
      if (type !== 'scroll' && type !== 'navigate' && type !== 'task') continue

      const targetId = typeof r.targetId === 'string' ? r.targetId.trim() : ''
      const taskType = typeof r.taskType === 'string' ? r.taskType.trim() : ''

      if (type === 'scroll') {
        if (!targetId || !isAgentJonesScrollTargetId(targetId)) continue
        actions.push({ type: 'scroll', targetId })
        continue
      }

      if (type === 'navigate') {
        if (!targetId || targetId.length > 120) continue
        if (!targetId.startsWith('/')) continue
        if (!isAgentJonesNavigatePath(targetId)) continue
        actions.push({ type: 'navigate', targetId })
        continue
      }

      if (type === 'task') {
        if (!taskType || taskType.length > 80) continue
        actions.push({ type: 'task', taskType })
        continue
      }
    }
    if (actions.length) reply.recommendedActions = actions.slice(0, 3)
  }

  const dirSlugs = new Set<string>([...ONBOARDING_DIRECTION_SLUGS])
  const op =
    typeof o.onboardingPrompt === 'string' ? o.onboardingPrompt.trim() : ''
  if (op && op.length <= 64 && !/[<>\\]/.test(op)) {
    reply.onboardingPrompt = op
  }
  const sd =
    typeof o.selectedDirection === 'string' ? o.selectedDirection.trim() : ''
  if (sd && sd.length <= 64 && dirSlugs.has(sd) && !/[<>\\]/.test(sd)) {
    reply.selectedDirection = sd
  }
  const smRaw = o.suggestedMicroCommitment
  if (smRaw && typeof smRaw === 'object') {
    const sm = smRaw as Record<string, unknown>
    const mid = typeof sm.id === 'string' ? sm.id.trim() : ''
    const mt = typeof sm.title === 'string' ? sm.title.trim() : ''
    if (
      mid &&
      mid.length <= 80 &&
      mt &&
      mt.length <= 160 &&
      !/[<>\\]/.test(mid) &&
      !/[<>\\]/.test(mt)
    ) {
      reply.suggestedMicroCommitment = { id: mid, title: mt }
    }
  }
  const rm =
    typeof o.reinforcementMessage === 'string'
      ? o.reinforcementMessage.trim()
      : ''
  if (rm && rm.length <= 400 && !/[<>\\]/.test(rm)) {
    reply.reinforcementMessage = rm
  }

  if (o.insight && typeof o.insight === 'object') {
    const r = o.insight as Record<string, unknown>
    const type = typeof r.type === 'string' ? r.type.trim() : ''
    const message = typeof r.message === 'string' ? r.message.trim() : ''
    if (
      (type === 'campaign_context' ||
        type === 'user_context' ||
        type === 'strategy') &&
      message &&
      message.length <= 220 &&
      !/[<>\\]/.test(message)
    ) {
      reply.insight = { type, message } as AgentJonesResponse['insight']
    }
  }

  return reply
}

export async function callAgentJones(
  body: AgentJonesRequest,
): Promise<AgentJonesResponse> {
  const url = getAgentJonesEndpointUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
      data && typeof data === 'object' && data !== null && 'error' in data
        ? (data as AgentJonesErrorBody)
        : null
    throw new AgentJonesApiError(
      formatAgentJonesFailureMessage(res.status, err),
      res.status,
      err,
    )
  }

  const reply = sanitizeReply(data)
  if (!reply) {
    throw new AgentJonesApiError('Invalid Agent Jones response', res.status, null)
  }

  return reply
}
