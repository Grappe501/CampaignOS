/**
 * Pure helpers for automation queue rows (sort, filter, normalize).
 */

import type {
  AutomationActionRow,
  AutomationApprovalState,
  AutomationQueueStatus,
  AutomationSeverity,
} from './automationDomain'
import { severityOrder } from './automationDomain'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function uuidOrNull(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const t = value.trim()
  return UUID_RE.test(t) ? t : null
}

export function sortActionsBySeverityThenAge(rows: readonly AutomationActionRow[]): AutomationActionRow[] {
  return [...rows].sort((a, b) => {
    const ds = severityOrder(b.severity) - severityOrder(a.severity)
    if (ds !== 0) return ds
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export function filterByStatus(
  rows: readonly AutomationActionRow[],
  statuses: readonly AutomationQueueStatus[],
): AutomationActionRow[] {
  const set = new Set(statuses)
  return rows.filter((r) => set.has(r.status))
}

export function filterAwaitingApproval(rows: readonly AutomationActionRow[]): AutomationActionRow[] {
  return rows.filter((r) => r.status === 'awaiting_approval' && r.approval_state === 'pending')
}

export function filterByOwnerRoleHint(
  rows: readonly AutomationActionRow[],
  roleHint: string,
): AutomationActionRow[] {
  const r = roleHint.toLowerCase()
  return rows.filter((x) => String(x.owner_role_hint ?? '').toLowerCase() === r)
}

export function filterByMinSeverity(
  rows: readonly AutomationActionRow[],
  min: AutomationSeverity,
): AutomationActionRow[] {
  const floor = severityOrder(min)
  return rows.filter((r) => severityOrder(r.severity) >= floor)
}

export function groupByTriggerType(
  rows: readonly AutomationActionRow[],
): Map<string, AutomationActionRow[]> {
  const m = new Map<string, AutomationActionRow[]>()
  for (const r of rows) {
    const k = r.trigger_type
    const cur = m.get(k) ?? []
    cur.push(r)
    m.set(k, cur)
  }
  return m
}

export function mapRowFromDb(raw: Record<string, unknown>): AutomationActionRow {
  return {
    id: String(raw.id ?? ''),
    campaign_id: String(raw.campaign_id ?? 'default'),
    dedupe_key: String(raw.dedupe_key ?? ''),
    trigger_type: String(raw.trigger_type ?? ''),
    severity: raw.severity as AutomationActionRow['severity'],
    confidence: raw.confidence as AutomationActionRow['confidence'],
    title: String(raw.title ?? ''),
    explanation: String(raw.explanation ?? ''),
    owner_role_hint: raw.owner_role_hint != null ? String(raw.owner_role_hint) : null,
    intervention_kind: raw.intervention_kind as AutomationActionRow['intervention_kind'],
    execution_mode: raw.execution_mode as AutomationActionRow['execution_mode'],
    route_path: raw.route_path != null ? String(raw.route_path) : null,
    target_type: (raw.target_type as AutomationActionRow['target_type']) ?? null,
    target_id: raw.target_id != null ? String(raw.target_id) : null,
    status: raw.status as AutomationQueueStatus,
    approval_state: raw.approval_state as AutomationApprovalState,
    snoozed_until: raw.snoozed_until != null ? String(raw.snoozed_until) : null,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    closed_reason: (raw.closed_reason as AutomationActionRow['closed_reason']) ?? null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    closed_at: raw.closed_at != null ? String(raw.closed_at) : null,
  }
}
