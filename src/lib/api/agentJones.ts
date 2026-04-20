/**
 * Client for the Netlify `agent-jones` function (server-side OpenAI only).
 *
 * - **Production / Netlify host:** same-origin `/.netlify/functions/agent-jones`.
 * - **Local Vite:** set `VITE_NETLIFY_FUNCTIONS_ORIGIN` (e.g. `http://localhost:8888`) with `netlify dev`.
 */

import type { AgentJonesSafeContext } from '../agentJonesContext'
import { isAgentJonesScrollTargetId } from '../agentJonesContext'

export type AgentJonesRequest = {
  context: AgentJonesSafeContext
  userMessage: string
  model?: string
}

export type AgentJonesFollowUpPrompt = {
  id: string
  label: string
}

export type AgentJonesScrollAction = {
  type: 'scroll'
  targetId: string
}

export type AgentJonesReply = {
  response: string
  suggestedPrompts?: AgentJonesFollowUpPrompt[]
  actions?: AgentJonesScrollAction[]
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

function sanitizeReply(data: unknown): AgentJonesReply | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (typeof o.response !== 'string' || !o.response.trim()) return null

  const reply: AgentJonesReply = { response: o.response.trim() }

  if (Array.isArray(o.suggestedPrompts)) {
    const prompts: AgentJonesFollowUpPrompt[] = []
    for (const p of o.suggestedPrompts.slice(0, 4)) {
      if (!p || typeof p !== 'object') continue
      const r = p as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id.trim() : ''
      const label = typeof r.label === 'string' ? r.label.trim() : ''
      if (id && label && id.length <= 64 && label.length <= 120) {
        prompts.push({ id, label })
      }
    }
    if (prompts.length) reply.suggestedPrompts = prompts
  }

  if (Array.isArray(o.actions)) {
    const actions: AgentJonesScrollAction[] = []
    for (const a of o.actions.slice(0, 3)) {
      if (!a || typeof a !== 'object') continue
      const r = a as Record<string, unknown>
      if (r.type !== 'scroll') continue
      const targetId = typeof r.targetId === 'string' ? r.targetId.trim() : ''
      if (targetId && isAgentJonesScrollTargetId(targetId)) {
        actions.push({ type: 'scroll', targetId })
      }
    }
    if (actions.length) reply.actions = actions
  }

  return reply
}

export async function callAgentJones(body: AgentJonesRequest): Promise<AgentJonesReply> {
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
