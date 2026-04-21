/**
 * Client for `event-comms-draft` Netlify function — server-side OpenAI only (never embed API keys).
 */

import type { CampaignCalendarEventRecord } from '../campaignCalendarArchitecture'
import type { EventCommsDraftMode } from '../eventCommsModels'

export type { EventCommsDraftMode }

export type EventCommsDraftRequest = {
  mode: EventCommsDraftMode
  event: Pick<
    CampaignCalendarEventRecord,
    | 'event_id'
    | 'title'
    | 'event_type'
    | 'start_at'
    | 'end_at'
    | 'timezone'
    | 'venue_name'
    | 'address_or_virtual'
    | 'postal_code'
    | 'county_id'
    | 'visibility_scope'
    | 'stage_status'
    | 'public_title'
    | 'public_description'
    | 'notes'
    | 'event_objective'
    | 'operational_status'
  >
  press_context?: string
}

export type EventCommsDraftResponse = {
  title: string
  body: string
  mode: EventCommsDraftMode
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

function parseDraftResponse(raw: unknown): EventCommsDraftResponse | null {
  if (!isRecord(raw)) return null
  if (typeof raw.error === 'string') return null
  if (typeof raw.title !== 'string' || typeof raw.body !== 'string' || typeof raw.mode !== 'string') return null
  return { title: raw.title, body: raw.body, mode: raw.mode as EventCommsDraftMode }
}

export function getEventCommsDraftUrl(): string {
  const origin = String(import.meta.env.VITE_NETLIFY_FUNCTIONS_ORIGIN ?? '').replace(/\/$/, '')
  const path = '/.netlify/functions/event-comms-draft'
  return origin ? `${origin}${path}` : path
}

export async function requestEventCommsDraft(
  req: EventCommsDraftRequest,
): Promise<EventCommsDraftResponse> {
  const url = getEventCommsDraftUrl()
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
    throw new Error(`Draft request failed (${res.status})`)
  }
  const ok = parseDraftResponse(raw)
  if (!ok || !ok.body.trim()) {
    throw new Error('Invalid draft response')
  }
  return ok
}
