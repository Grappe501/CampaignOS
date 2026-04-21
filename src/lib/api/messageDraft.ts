/**
 * Client for `message-draft` Netlify function — field narrative drafts only (server-side OpenAI).
 */

import type { MessageTone } from '../messageFramework'

export const MESSAGE_DRAFT_MODES = [
  'field_canvass_intro',
  'field_phone_bank',
  'event_host_remarks',
  'talking_point_compress',
  'talking_point_expand',
  'objection_reply',
] as const
export type MessageDraftMode = (typeof MESSAGE_DRAFT_MODES)[number]

export type MessageDraftRequest = {
  mode: MessageDraftMode
  tone: MessageTone
  /** From messageTargeting.buildFrameworkExcerptForDraft — size-capped client-side. */
  framework_excerpt: Record<string, unknown>
  operator_note?: string
}

export type MessageDraftResponse = {
  title: string
  body: string
  mode: MessageDraftMode
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

function parseMessageDraftResponse(raw: unknown): MessageDraftResponse | null {
  if (!isRecord(raw)) return null
  if (typeof raw.error === 'string') return null
  if (typeof raw.title !== 'string' || typeof raw.body !== 'string' || typeof raw.mode !== 'string') {
    return null
  }
  return { title: raw.title, body: raw.body, mode: raw.mode as MessageDraftMode }
}

export function getMessageDraftUrl(): string {
  const origin = String(import.meta.env.VITE_NETLIFY_FUNCTIONS_ORIGIN ?? '').replace(/\/$/, '')
  const path = '/.netlify/functions/message-draft'
  return origin ? `${origin}${path}` : path
}

export async function requestMessageDraft(req: MessageDraftRequest): Promise<MessageDraftResponse> {
  const url = getMessageDraftUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    throw new Error('Draft response was not valid JSON.')
  }
  if (!res.ok) {
    if (isRecord(raw) && typeof raw.error === 'string') throw new Error(raw.error)
    throw new Error(`Message draft failed (${res.status})`)
  }
  const ok = parseMessageDraftResponse(raw)
  if (!ok || !ok.body.trim()) throw new Error('Invalid draft response')
  return ok
}
