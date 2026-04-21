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
