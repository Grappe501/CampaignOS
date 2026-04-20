/**
 * Coordinator-facing Mobilize queue lanes (Pass 1 internal model).
 * Maps stored `mobilize_publish_state` values into operational buckets for desk UI.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  buildMobilizeEligibility,
  normalizeMobilizeSyncState,
} from './mobilizeFieldMapping'
import type { MobilizeEligibilityResult } from './mobilizePublishEligibility'
import { evaluateMobilizePublishEligibility, mobilizeEligibilityInputFromRecord } from './mobilizePublishEligibility'

/**
 * Lanes shown on the Event Coordinator desk (order matters for scanning).
 * `draft_ready` is surfaced separately when you want a staging step before `queued`.
 */
export const MOBILIZE_COORDINATOR_QUEUE_LANES = [
  'eligible',
  'queued',
  'published',
  'update_required',
  'sync_error',
  'draft_ready',
  'archived',
  'not_applicable',
] as const

export type MobilizeCoordinatorQueueLane = (typeof MOBILIZE_COORDINATOR_QUEUE_LANES)[number]

export const MOBILIZE_QUEUE_LANE_LABELS: Record<MobilizeCoordinatorQueueLane, string> = {
  eligible: 'Eligible — ready to queue',
  queued: 'Queued / in flight',
  published: 'Published (live on Mobilize)',
  update_required: 'Update required',
  sync_error: 'Sync error',
  draft_ready: 'Draft ready',
  archived: 'Archived / remote archived',
  not_applicable: 'Not applicable',
}

export const MOBILIZE_QUEUE_LANE_DESCRIPTIONS: Record<MobilizeCoordinatorQueueLane, string> = {
  eligible:
    'Row marked eligible for promotion. Server must still execute publish (no client secrets).',
  queued:
    'Queued for publish or mid-flight (`queued`, `queued_for_publish`).',
  published:
    'Mobilize event exists; public URL should appear on the row when synced.',
  update_required:
    'Approved fields changed after publish — republish via server integration.',
  sync_error:
    'Last server sync failed — see `mobilize_last_error` on the event row.',
  draft_ready:
    'Payload staged internally; not yet submitted to Mobilize.',
  archived:
    'Removed or archived on Mobilize / campaign policy.',
  not_applicable:
    'Visibility or type keeps this off Mobilize, or state not set.',
}

/** Primary operational lanes called out in blueprint Pass 1. */
export const MOBILIZE_PASS1_HIGHLIGHT_LANES: readonly MobilizeCoordinatorQueueLane[] = [
  'eligible',
  'queued',
  'published',
  'sync_error',
  'update_required',
]

export function coordinatorMobilizeLaneForRecord(
  row: CampaignCalendarEventRecord,
): MobilizeCoordinatorQueueLane {
  const raw = String(row.mobilize_publish_state ?? '').trim()
  if (!raw) return 'not_applicable'
  if (raw === 'eligible') return 'eligible'
  if (raw === 'published') return 'published'
  if (raw === 'update_required') return 'update_required'
  if (raw === 'sync_error') return 'sync_error'
  if (raw === 'draft_ready') return 'draft_ready'
  if (raw === 'queued' || raw === 'queued_for_publish') return 'queued'
  if (raw === 'archived' || raw === 'archived_remote') return 'archived'
  if (raw === 'not_applicable') return 'not_applicable'
  const normalized = normalizeMobilizeSyncState(raw)
  if (normalized === 'queued_for_publish') return 'queued'
  return 'not_applicable'
}

export function groupEventsByMobilizeQueueLane(
  events: readonly CampaignCalendarEventRecord[],
): Map<MobilizeCoordinatorQueueLane, CampaignCalendarEventRecord[]> {
  const map = new Map<MobilizeCoordinatorQueueLane, CampaignCalendarEventRecord[]>()
  for (const lane of MOBILIZE_COORDINATOR_QUEUE_LANES) {
    map.set(lane, [])
  }
  for (const e of events) {
    const lane = coordinatorMobilizeLaneForRecord(e)
    const list = map.get(lane) ?? []
    list.push(e)
    map.set(lane, list)
  }
  return map
}

/**
 * Contract-eligible events not yet live on Mobilize (published) or mid-flight (queued).
 * Uses blueprint-12 eligibility (finance + public copy gates).
 */
export function listMobilizeEligibleBacklog(
  events: readonly CampaignCalendarEventRecord[],
): CampaignCalendarEventRecord[] {
  return events.filter((e) => {
    if (!buildMobilizeEligibility(e).isEligible) return false
    const lane = coordinatorMobilizeLaneForRecord(e)
    if (lane === 'published' || lane === 'archived') return false
    if (lane === 'queued') return false
    return true
  })
}

/** Re-export-friendly wrapper for six-rule engine (base checks only). */
export function evaluateBaseMobilizePublishRules(
  row: CampaignCalendarEventRecord,
): MobilizeEligibilityResult {
  return evaluateMobilizePublishEligibility(mobilizeEligibilityInputFromRecord(row))
}
