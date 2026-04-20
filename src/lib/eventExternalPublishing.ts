/**
 * External publishing (e.g. Mobilize) — operational vs public surface separation.
 */

import type { CalendarMobilizeStatus } from './campaignCalendarArchitecture'

export const EXTERNAL_PUBLISH_STATES = [
  'internal_only',
  'review_for_publish',
  'approved_for_publish',
  'published',
  'publish_error',
  'synced',
] as const

export type ExternalPublishState = (typeof EXTERNAL_PUBLISH_STATES)[number]

export type ExternalEventPayload = {
  title: string
  description: string
  startAt: string
  endAt: string | null
  timezone: string | null
  visibility: string
  capacity: number | null
  ctaLabel: string | null
  complianceFlags: string[]
}

export function mapMobilizeToExternalPublishState(m: CalendarMobilizeStatus | string | null): ExternalPublishState {
  const s = String(m ?? 'not_applicable')
  if (s === 'published' || s === 'archived_remote') return 'published'
  if (s === 'sync_error') return 'publish_error'
  if (s === 'queued' || s === 'queued_for_publish') return 'approved_for_publish'
  if (s === 'draft_ready' || s === 'eligible') return 'review_for_publish'
  if (s === 'update_required') return 'review_for_publish'
  return 'internal_only'
}

export function createExternalEventPayload(input: {
  publicTitle: string
  publicDescription: string
  startAt: string
  endAt: string | null
  timezone: string | null
  visibilityScope: string
  capacity: number | null
}): ExternalEventPayload {
  return {
    title: input.publicTitle,
    description: input.publicDescription,
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: input.timezone,
    visibility: input.visibilityScope,
    capacity: input.capacity,
    ctaLabel: 'RSVP',
    complianceFlags: [],
  }
}

export function validateExternalPublishingReadiness(input: {
  hasPublicCopy: boolean
  hasVenueOrVirtual: boolean
  hasApprovedLikeStatus: boolean
  visibilityAllowsPublic: boolean
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!input.hasPublicCopy) reasons.push('Public title/description incomplete')
  if (!input.hasVenueOrVirtual) reasons.push('Venue or virtual link missing')
  if (!input.hasApprovedLikeStatus) reasons.push('Event not approved for external promotion')
  if (!input.visibilityAllowsPublic) reasons.push('Visibility does not allow public listing')
  return { ok: reasons.length === 0, reasons }
}

export function markExternalSyncStatus(_eventId: string, state: ExternalPublishState): ExternalPublishState {
  return state
}

export function captureExternalRegistrationCounts(_remoteRsvp: number | null): { rsvp: number | null } {
  return { rsvp: _remoteRsvp }
}
