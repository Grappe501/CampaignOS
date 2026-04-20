/**
 * Client for the Netlify `agent-jones` function (server-side OpenAI only).
 *
 * - **Production / Netlify host:** same-origin `/.netlify/functions/agent-jones`.
 * - **Local Vite:** set `VITE_NETLIFY_FUNCTIONS_ORIGIN` (e.g. `http://localhost:8888`) with `netlify dev`.
 */

import type { AgentJonesContextV2 } from '../agentJonesContextV2'
import { isAgentJonesScrollTargetId } from '../agentJonesContext'

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
}

export type AgentJonesErrorBody = {
  error: string
  detail?: string
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
      err?.error ?? `Agent Jones request failed (${res.status})`,
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
