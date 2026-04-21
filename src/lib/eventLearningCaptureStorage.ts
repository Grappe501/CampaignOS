import type { LearningCaptureDraft } from './eventIntelligenceContracts'

const PREFIX = 'campaignos:event-learning:v1:'

function key(eventId: string): string {
  return `${PREFIX}${eventId}`
}

const empty = (eventId: string): LearningCaptureDraft => ({
  event_id: eventId,
  updated_at: new Date().toISOString(),
  what_worked: '',
  what_failed: '',
  nearly_failed: '',
  repeat_next_time: '',
  change_next_time: '',
  was_missing: '',
  who_should_be_added: '',
  comms_notes: '',
  assets_notes: '',
  followup_notes: '',
  area_notes: '',
  freeform: '',
})

export function loadLearningCapture(eventId: string): LearningCaptureDraft {
  try {
    const raw = localStorage.getItem(key(eventId))
    if (!raw) return empty(eventId)
    const o = JSON.parse(raw) as Partial<LearningCaptureDraft>
    return { ...empty(eventId), ...o, event_id: eventId }
  } catch {
    return empty(eventId)
  }
}

export function saveLearningCapture(draft: LearningCaptureDraft): void {
  const next = { ...draft, updated_at: new Date().toISOString() }
  try {
    localStorage.setItem(key(draft.event_id), JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
}

const DRAFT_KEYS: (keyof LearningCaptureDraft)[] = [
  'what_worked',
  'what_failed',
  'nearly_failed',
  'repeat_next_time',
  'change_next_time',
  'was_missing',
  'who_should_be_added',
  'comms_notes',
  'assets_notes',
  'followup_notes',
  'area_notes',
  'freeform',
]

export function isLearningCaptureDraftFilled(draft: LearningCaptureDraft): boolean {
  return DRAFT_KEYS.some((k) => String(draft[k] ?? '').trim().length > 0)
}

/** Serialize draft fields for `campaign_event_learning_capture.payload` (JSON). */
export function learningDraftToPayload(draft: LearningCaptureDraft): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const k of DRAFT_KEYS) {
    o[k] = draft[k]
  }
  return o
}

/** Hydrate a draft from DB payload; returns null when empty / invalid. */
export function learningDraftFromDbPayload(
  eventId: string,
  payload: Record<string, unknown> | null | undefined,
): LearningCaptureDraft | null {
  if (!payload || typeof payload !== 'object') return null
  const base = empty(eventId)
  const next: LearningCaptureDraft = { ...base }
  for (const k of DRAFT_KEYS) {
    const v = payload[k as string]
    if (typeof v === 'string') next[k] = v
  }
  next.updated_at =
    typeof payload.updated_at === 'string' ? payload.updated_at : base.updated_at
  return isLearningCaptureDraftFilled(next) ? next : null
}
