/**
 * Unified event health score (0–100) for command visibility.
 * Blends weighted sub-scores with persisted `readiness_score` when present.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CoordinatorOperationsGap } from './campaignEventCoordinatorOperations'

export type EventHealthStatusBand = 'READY' | 'AT_RISK' | 'CRITICAL'

export type EventHealthReasonCode =
  | 'missing_key_roles'
  | 'overdue_tasks'
  | 'unconfirmed_assignments'
  | 'missing_assets'
  | 'compressed_timeline'
  | 'communication_not_sent'

export type EventHealthWeights = {
  staffing: number
  tasks: number
  communications: number
  assets: number
  timePrep: number
  acknowledgments: number
}

const DEFAULT_WEIGHTS: EventHealthWeights = {
  staffing: 0.2,
  tasks: 0.2,
  communications: 0.15,
  assets: 0.15,
  timePrep: 0.15,
  acknowledgments: 0.1,
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function staffingFilledRatio(record: CampaignCalendarEventRecord): number {
  const s = String(record.staffing_state ?? 'unstaffed').toLowerCase()
  if (s === 'staffed') return 1
  if (s === 'partially_staffed') return 0.72
  if (s === 'at_risk') return 0.45
  return 0.15
}

function mobilizeCommunicationRatio(m: string | null | undefined): number {
  const x = String(m ?? 'not_applicable').toLowerCase()
  if (x === 'published') return 1
  if (x === 'queued' || x === 'queued_for_publish' || x === 'draft_ready') return 0.62
  if (x === 'not_applicable') return 0.78
  if (x === 'sync_error' || x === 'update_required') return 0.25
  return 0.48
}

function assetsRatio(record: CampaignCalendarEventRecord): number {
  if (record.mobilize_update_needed === true) return 0.42
  return 0.86
}

function timePrepRatio(nowMs: number, startIso: string): { ratio: number; compressed: boolean } {
  const t0 = new Date(startIso).getTime()
  if (Number.isNaN(t0)) return { ratio: 0.55, compressed: false }
  const hours = (t0 - nowMs) / 3600000
  if (hours < 0) return { ratio: 0.92, compressed: false }
  if (hours < 6) return { ratio: clamp(0.28 + hours / 24, 0.15, 0.65), compressed: true }
  if (hours < 36) return { ratio: clamp(0.45 + hours / 96, 0.45, 0.88), compressed: true }
  if (hours < 168) return { ratio: clamp(0.55 + hours / 336, 0.55, 0.95), compressed: false }
  return { ratio: 0.92, compressed: false }
}

function ackRatio(record: CampaignCalendarEventRecord): number {
  if (record.approval_required && String(record.operational_status ?? '') === 'approval_needed') {
    return 0.38
  }
  if (record.stage_status === 'submitted') return 0.55
  return 0.92
}

function tasksRatioFromReadiness(readiness: number | null | undefined): number {
  if (readiness != null && !Number.isNaN(readiness)) {
    return clamp(readiness / 100, 0, 1)
  }
  return 0.5
}

function collectReasonCodes(
  record: CampaignCalendarEventRecord,
  gaps: readonly CoordinatorOperationsGap[] | undefined,
  timeCompressed: boolean,
): EventHealthReasonCode[] {
  const codes = new Set<EventHealthReasonCode>()
  const staff = String(record.staffing_state ?? '').toLowerCase()
  if (staff === 'unstaffed' || staff === 'at_risk') codes.add('missing_key_roles')
  if (gaps?.some((g) => g.category === 'staffing' && g.severity === 'critical')) {
    codes.add('missing_key_roles')
  }
  if (gaps?.some((g) => g.message.toLowerCase().includes('task'))) {
    codes.add('overdue_tasks')
  }
  if (gaps?.some((g) => g.category === 'staffing')) {
    codes.add('unconfirmed_assignments')
  }
  if (record.mobilize_update_needed === true || gaps?.some((g) => g.category === 'logistics')) {
    codes.add('missing_assets')
  }
  if (timeCompressed) codes.add('compressed_timeline')
  const m = String(record.mobilize_publish_state ?? '').toLowerCase()
  if (
    m !== 'published' &&
    m !== 'not_applicable' &&
    (record.stage_status === 'scheduled' || record.stage_status === 'approved')
  ) {
    codes.add('communication_not_sent')
  }
  return [...codes]
}

export type EventHealthScoreInput = {
  record: CampaignCalendarEventRecord
  /** Coordinator gap heuristics from collectOperationsGapsForEvent — optional. */
  gaps?: readonly CoordinatorOperationsGap[]
  /** Epoch ms for deterministic tests. */
  nowMs?: number
  weights?: Partial<EventHealthWeights>
  /** When true, rely only on computed components (no blend with stored readiness). */
  ignorePersistedReadiness?: boolean
}

export type EventHealthScoreResult = {
  score: number
  status: EventHealthStatusBand
  reasonCodes: EventHealthReasonCode[]
  components: {
    staffing: number
    tasks: number
    communications: number
    assets: number
    timePrep: number
    acknowledgments: number
  }
  riskPenalty: number
  persistedReadiness: number | null
}

export function healthStatusFromScore(score: number): EventHealthStatusBand {
  if (score >= 80) return 'READY'
  if (score >= 50) return 'AT_RISK'
  return 'CRITICAL'
}

/**
 * Compute unified 0–100 health score and status for dashboard / calendar / event header.
 */
export function computeEventHealthScore(input: EventHealthScoreInput): EventHealthScoreResult {
  const nowMs = input.nowMs ?? Date.now()
  const w = { ...DEFAULT_WEIGHTS, ...input.weights }
  const { record, gaps } = input

  const staff = staffingFilledRatio(record)
  const comm = mobilizeCommunicationRatio(record.mobilize_publish_state)
  const asset = assetsRatio(record)
  const { ratio: timeR, compressed } = timePrepRatio(nowMs, record.start_at)
  const ack = ackRatio(record)
  const tasks = tasksRatioFromReadiness(record.readiness_score)

  const weighted =
    w.staffing * staff +
    w.tasks * tasks +
    w.communications * comm +
    w.assets * asset +
    w.timePrep * timeR +
    w.acknowledgments * ack

  let riskPenalty = 0
  if (gaps?.length) {
    riskPenalty = Math.min(32, gaps.length * 6 + gaps.filter((g) => g.severity === 'critical').length * 4)
  }

  let score01 = clamp(weighted - riskPenalty / 100, 0, 1)

  const persisted =
    record.readiness_score != null && !Number.isNaN(Number(record.readiness_score))
      ? clamp(Number(record.readiness_score) / 100, 0, 1)
      : null

  if (!input.ignorePersistedReadiness && persisted != null) {
    score01 = 0.55 * score01 + 0.45 * persisted
  }

  const score = Math.round(clamp(score01 * 100, 0, 100))
  const reasonCodes = collectReasonCodes(record, gaps, compressed)

  return {
    score,
    status: healthStatusFromScore(score),
    reasonCodes,
    components: {
      staffing: staff,
      tasks,
      communications: comm,
      assets: asset,
      timePrep: timeR,
      acknowledgments: ack,
    },
    riskPenalty,
    persistedReadiness:
      record.readiness_score != null && !Number.isNaN(Number(record.readiness_score))
        ? Number(record.readiness_score)
        : null,
  }
}

/** CSS modifier without coupling to stylesheet file names. */
export function healthStatusToUiModifier(status: EventHealthStatusBand): 'ready' | 'risk' | 'critical' {
  if (status === 'READY') return 'ready'
  if (status === 'AT_RISK') return 'risk'
  return 'critical'
}
