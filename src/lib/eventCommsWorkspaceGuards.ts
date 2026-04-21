/**
 * Defensive parsing for locally persisted communications workspaces (localStorage v1).
 */

import type {
  EventCommunicationsWorkspace,
  EventCommunicationStep,
  CommsStepStatus,
  CommsChannel,
} from './eventCommsModels'

const STEPS_STATUS: ReadonlySet<CommsStepStatus> = new Set([
  'pending',
  'draft',
  'scheduled',
  'sent',
  'failed',
  'acknowledged',
  'skipped',
  'blocked_permissions',
])

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

function isChannel(x: unknown): x is CommsChannel {
  return (
    typeof x === 'string' &&
    [
      'email',
      'sms',
      'social_facebook',
      'social_instagram',
      'social_x',
      'press_wire',
      'internal_slack',
      'other',
    ].includes(x)
  )
}

function sanitizeStep(x: unknown, fallbackId: string): EventCommunicationStep | null {
  if (!isRecord(x)) return null
  const id = typeof x.id === 'string' && x.id.trim() ? x.id : fallbackId
  const kind = typeof x.kind === 'string' ? x.kind : 'announcement_email'
  const label = typeof x.label === 'string' ? x.label : 'Communication step'
  const channel = isChannel(x.channel) ? x.channel : 'email'
  const timing_hint = typeof x.timing_hint === 'string' ? x.timing_hint : '0'
  const owner_role = typeof x.owner_role === 'string' ? x.owner_role : 'communications_lead'
  const status =
    typeof x.status === 'string' && STEPS_STATUS.has(x.status as CommsStepStatus)
      ? (x.status as CommsStepStatus)
      : 'pending'
  const due_at = x.due_at === null || typeof x.due_at === 'string' ? x.due_at : null
  const notes = typeof x.notes === 'string' ? x.notes : ''
  const linked_task_key =
    x.linked_task_key === null || typeof x.linked_task_key === 'string' ? x.linked_task_key : null
  return { id, kind, label, channel, timing_hint, owner_role, status, due_at, notes, linked_task_key }
}

/**
 * Returns a safe workspace or null if the blob is unusable.
 */
export function parseCommunicationsWorkspaceJson(json: string, eventId: string): EventCommunicationsWorkspace | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  return normalizeLoadedWorkspace(raw, eventId)
}

export function normalizeLoadedWorkspace(raw: unknown, eventId: string): EventCommunicationsWorkspace | null {
  if (!isRecord(raw) || raw.v !== 1) return null
  if (typeof raw.event_id !== 'string' || raw.event_id !== eventId) return null
  if (typeof raw.updated_at !== 'string') return null
  if (!isRecord(raw.plan)) return null
  const planRecord = raw.plan
  if (!Array.isArray(planRecord.steps) || planRecord.steps.length === 0) return null

  const steps: EventCommunicationStep[] = planRecord.steps
    .map((s, i) => sanitizeStep(s, `recover-${i}`))
    .filter((s): s is EventCommunicationStep => s != null)
  if (steps.length === 0) return null

  const ws = raw as EventCommunicationsWorkspace
  const scheduling_meta =
    isRecord(raw.scheduling_meta) &&
    (typeof raw.scheduling_meta.last_reconciled_start_at === 'string' ||
      raw.scheduling_meta.last_reconciled_start_at === null)
      ? {
          last_reconciled_start_at: raw.scheduling_meta.last_reconciled_start_at as string | null,
        }
      : ws.scheduling_meta

  return {
    ...ws,
    v: 1,
    event_id: eventId,
    scheduling_meta,
    plan: { ...ws.plan, steps },
    drafts: Array.isArray(raw.drafts) ? ws.drafts : [],
    media_library: Array.isArray(raw.media_library) ? ws.media_library : [],
    audit: Array.isArray(raw.audit) ? ws.audit : [],
  }
}
