/**
 * Mobilize field-mapping contract: CampaignOS event rows → eligibility, payloads, sync summary (blueprint 12).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import {
  MOBILIZE_WORKFLOW_STATUSES,
  type MobilizeWorkflowStatus,
} from './mobilizeIntegration'
import {
  evaluateMobilizePublishEligibility,
  mobilizeEligibilityInputFromRecord,
} from './mobilizePublishEligibility'
import { resolveMobilizeTagsForEventType } from './mobilizeTagMapping'

/** Doc name alignment — same values as `MobilizeWorkflowStatus` in mobilizeIntegration. */
export type MobilizeSyncState = MobilizeWorkflowStatus

export type EventMobilizeMeta = {
  mobilizeSyncState: MobilizeSyncState
  mobilizeEventId?: string | null
  mobilizePublicUrl?: string | null
  mobilizeLastSyncedAt?: string | null
  mobilizeLastError?: string | null
  mobilizeSyncHash?: string | null
  /** When the row marks tags as synced, echo the config-resolved tag set; otherwise omit. */
  mobilizeTagsSynced?: string[]
  mobilizePublishedByUserId?: string | null
}

export type MobilizeEligibility = {
  isEligible: boolean
  reasonsEligible: string[]
  blockingReasons: string[]
  publishMode: 'public_recruitment' | 'public_visibility' | 'not_applicable'
}

export type MobilizePublishPayload = {
  title: string
  description: string
  startAt: string
  endAt?: string | null
  timezone?: string | null
  locationName?: string | null
  address?: string | null
  tags?: string[]
  publicInstructions?: string | null
}

export type MobilizeUpdatePayload = MobilizePublishPayload & {
  previousSyncHash: string | null
  syncHash: string
}

export type MobilizeStatusSummary = {
  state: MobilizeSyncState
  eligible: boolean
  publicUrl?: string | null
  lastSyncedAt?: string | null
  lastError?: string | null
  updateRequired: boolean
}

const WORKFLOW_SET = new Set<string>(MOBILIZE_WORKFLOW_STATUSES)

/** Map stored row values (including legacy calendar statuses) onto the workflow enum. */
export function normalizeMobilizeSyncState(
  raw: string | null | undefined,
): MobilizeSyncState {
  if (raw == null || String(raw).trim() === '') return 'not_applicable'
  const r = String(raw).trim()
  if (r === 'queued') return 'queued_for_publish'
  if (r === 'archived') return 'archived_remote'
  if (WORKFLOW_SET.has(r)) return r as MobilizeSyncState
  return 'not_applicable'
}

function derivePublishMode(
  row: CampaignCalendarEventRecord,
  isEligible: boolean,
): MobilizeEligibility['publishMode'] {
  if (!isEligible) return 'not_applicable'
  const v = String(row.visibility_scope)
  if (v === 'county_specific' || v === 'precinct_specific') return 'public_visibility'
  return 'public_recruitment'
}

/**
 * Rich eligibility (blueprint 12) — extends the six-rule engine with finance + public copy gates.
 */
export function buildMobilizeEligibility(
  row: CampaignCalendarEventRecord,
): MobilizeEligibility {
  const base = evaluateMobilizePublishEligibility(mobilizeEligibilityInputFromRecord(row))
  const reasonsEligible = base.checks.filter((c) => c.pass).map((c) => c.ruleLabel)
  const blockingReasons = [...base.blockers]
  let isEligible = base.eligible

  if (row.finance_flag && isEligible) {
    isEligible = false
    blockingReasons.push(
      'Finance-flagged events are not published to Mobilize under default policy.',
    )
  }

  const hasPublicCopy = (row.public_description ?? '').trim().length > 0
  if (isEligible && !hasPublicCopy) {
    isEligible = false
    blockingReasons.push(
      'Public-facing description is required before Mobilize publish (use public description fields).',
    )
  }

  const addrVirt = (row.address_or_virtual ?? '').trim()
  const virtUrl = (row.virtual_url ?? '').trim()
  const virtualOnly = virtUrl.length > 0 && addrVirt.length === 0
  if (isEligible && !virtualOnly) {
    const pc = (row.postal_code ?? '').trim()
    if (!pc) {
      isEligible = false
      blockingReasons.push(
        'Mobilize requires postal_code on the location object for in-person events — set postal_code (or use virtual_url only for virtual events).',
      )
    }
  }

  return {
    isEligible,
    reasonsEligible,
    blockingReasons,
    publishMode: derivePublishMode(row, isEligible),
  }
}

export function isMobilizeEligible(row: CampaignCalendarEventRecord): boolean {
  return buildMobilizeEligibility(row).isEligible
}

export function eventMobilizeMetaFromRecord(
  row: CampaignCalendarEventRecord,
): EventMobilizeMeta {
  const configTags = resolveMobilizeTagsForEventType(row.event_type)
  return {
    mobilizeSyncState: normalizeMobilizeSyncState(row.mobilize_publish_state),
    mobilizeEventId: row.mobilize_event_id,
    mobilizePublicUrl: row.mobilize_public_url,
    mobilizeLastSyncedAt: row.mobilize_last_synced_at,
    mobilizeLastError: row.mobilize_last_error,
    mobilizeSyncHash: row.mobilize_sync_hash,
    mobilizeTagsSynced: row.mobilize_tags_synced ? configTags : undefined,
    mobilizePublishedByUserId: row.mobilize_published_by_user_id ?? null,
  }
}

function hash32(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function resolveMobilizeTagsForEvent(row: CampaignCalendarEventRecord): string[] {
  return resolveMobilizeTagsForEventType(row.event_type)
}

export function buildMobilizePublishPayload(
  row: CampaignCalendarEventRecord,
): MobilizePublishPayload {
  const title = (row.public_title ?? row.title).trim()
  const description = (row.public_description ?? '').trim()
  const tags = [...resolveMobilizeTagsForEvent(row)].sort()
  return {
    title,
    description,
    startAt: row.start_at,
    endAt: row.end_at || null,
    timezone: row.timezone || null,
    locationName: row.venue_name,
    address: (row.address_or_virtual ?? '').trim() || null,
    tags,
    publicInstructions: (row.public_instructions ?? '').trim() || null,
  }
}

export function computeMobilizeSyncHash(row: CampaignCalendarEventRecord): string {
  const p = buildMobilizePublishPayload(row)
  const stable = JSON.stringify({
    title: p.title,
    description: p.description,
    startAt: p.startAt,
    endAt: p.endAt ?? null,
    timezone: p.timezone ?? null,
    locationName: p.locationName ?? null,
    address: p.address ?? null,
    tags: [...(p.tags ?? [])].sort(),
    publicInstructions: p.publicInstructions ?? null,
  })
  return hash32(stable)
}

export function buildMobilizeUpdatePayload(
  row: CampaignCalendarEventRecord,
  previousSyncHash: string | null | undefined,
): MobilizeUpdatePayload {
  return {
    ...buildMobilizePublishPayload(row),
    previousSyncHash: previousSyncHash ?? null,
    syncHash: computeMobilizeSyncHash(row),
  }
}

export function buildMobilizeStatusSummary(
  row: CampaignCalendarEventRecord,
): MobilizeStatusSummary {
  const extended = buildMobilizeEligibility(row)
  return {
    state: normalizeMobilizeSyncState(row.mobilize_publish_state),
    eligible: extended.isEligible,
    publicUrl: row.mobilize_public_url,
    lastSyncedAt: row.mobilize_last_synced_at,
    lastError: row.mobilize_last_error,
    updateRequired: Boolean(row.mobilize_update_needed),
  }
}
