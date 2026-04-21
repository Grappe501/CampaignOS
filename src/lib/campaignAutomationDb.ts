/**
 * Supabase persistence for automation queue (trusted path — RLS enforced).
 */

import { supabase } from './supabaseClient'
import type { AutomationActionRecommendation, AutomationActionRow } from './automationDomain'
import { normalizeApprovalOnApprove, normalizeApprovalOnReject, queueStatusForNewAction } from './automationApprovals'
import { mapRowFromDb, uuidOrNull } from './automationSelectors'
import { statusAfterDismiss, statusAfterOperatorComplete } from './automationFeedback'

export async function fetchOpenAutomationActions(campaignId: string): Promise<
  | { ok: true; rows: AutomationActionRow[] }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from('campaign_automation_actions')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['open', 'snoozed', 'awaiting_approval'])
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { ok: false, error: error.message }
  const rows = (data ?? []).map((r) => mapRowFromDb(r as Record<string, unknown>))
  return { ok: true, rows }
}

export async function fetchOpenAutomationDedupeKeys(campaignId: string): Promise<Set<string>> {
  const r = await fetchOpenAutomationActions(campaignId)
  if (!r.ok) return new Set()
  return new Set(r.rows.map((x) => x.dedupe_key))
}

export async function insertAutomationTriggerEvent(params: {
  campaignId: string
  firing: Pick<
    AutomationActionRecommendation,
    | 'trigger_type'
    | 'dedupe_key'
    | 'severity'
    | 'confidence'
    | 'title'
    | 'explanation'
    | 'target_type'
    | 'target_id'
    | 'metadata'
  >
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tid = uuidOrNull(params.firing.target_id)
  const { error } = await supabase.from('campaign_automation_trigger_events').insert({
    campaign_id: params.campaignId,
    trigger_type: params.firing.trigger_type,
    dedupe_key: params.firing.dedupe_key,
    severity: params.firing.severity,
    confidence: params.firing.confidence,
    title: params.firing.title,
    explanation: params.firing.explanation,
    target_type: params.firing.target_type ?? null,
    target_id: tid,
    payload: params.firing.metadata ?? {},
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function insertAutomationAction(params: {
  campaignId: string
  rec: AutomationActionRecommendation
}): Promise<{ ok: true; id: string } | { ok: false; error: string; duplicate?: boolean }> {
  const { rec, campaignId } = params
  const status = queueStatusForNewAction(rec.execution_mode)
  const approval_state = status === 'awaiting_approval' ? 'pending' : 'not_required'
  const tid = uuidOrNull(rec.target_id)

  const { data, error } = await supabase
    .from('campaign_automation_actions')
    .insert({
      campaign_id: campaignId,
      dedupe_key: rec.dedupe_key,
      trigger_type: rec.trigger_type,
      severity: rec.severity,
      confidence: rec.confidence,
      title: rec.title,
      explanation: rec.explanation,
      owner_role_hint: rec.owner_role_hint,
      intervention_kind: rec.intervention_kind,
      execution_mode: rec.execution_mode,
      route_path: rec.route_path,
      target_type: rec.target_type ?? null,
      target_id: tid,
      status,
      approval_state,
      metadata: { ...(rec.metadata ?? {}), automation_pack: 'self_driving_v1' },
    })
    .select('id')
    .maybeSingle()

  if (error) {
    const duplicate = /duplicate key|unique constraint/i.test(error.message)
    return { ok: false, error: error.message, duplicate }
  }
  const id = data && typeof data === 'object' && 'id' in data ? String((data as { id: string }).id) : ''
  if (!id) return { ok: false, error: 'No id returned' }
  return { ok: true, id }
}

export async function appendAutomationAudit(params: {
  campaignId: string
  actionId: string | null
  eventKind:
    | 'trigger_logged'
    | 'action_created'
    | 'status_change'
    | 'approval'
    | 'snooze'
    | 'dismiss'
    | 'complete'
    | 'sync_eval'
  message: string
  payload?: Record<string, unknown>
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('campaign_automation_audit_log').insert({
    campaign_id: params.campaignId,
    action_id: params.actionId,
    event_kind: params.eventKind,
    message: params.message,
    payload: params.payload ?? {},
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateAutomationAction(
  actionId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('campaign_automation_actions').update(patch).eq('id', actionId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function approveAutomationAction(params: {
  campaignId: string
  actionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const next = normalizeApprovalOnApprove()
  const u = await updateAutomationAction(params.actionId, {
    approval_state: next.approval_state,
    status: next.status,
  })
  if (!u.ok) return u
  const a = await appendAutomationAudit({
    campaignId: params.campaignId,
    actionId: params.actionId,
    eventKind: 'approval',
    message: 'Automation recommendation approved — routed to open queue.',
    payload: { decision: 'approved' },
  })
  if (!a.ok) return a
  return { ok: true }
}

export async function rejectAutomationAction(params: {
  campaignId: string
  actionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const next = normalizeApprovalOnReject()
  const u = await updateAutomationAction(params.actionId, {
    approval_state: next.approval_state,
    status: next.status,
    closed_at: new Date().toISOString(),
    closed_reason: 'rejected',
  })
  if (!u.ok) return u
  const a = await appendAutomationAudit({
    campaignId: params.campaignId,
    actionId: params.actionId,
    eventKind: 'approval',
    message: 'Automation recommendation rejected.',
    payload: { decision: 'rejected' },
  })
  if (!a.ok) return a
  return { ok: true }
}

export async function completeAutomationAction(params: {
  campaignId: string
  actionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const next = statusAfterOperatorComplete()
  const u = await updateAutomationAction(params.actionId, {
    status: next.status,
    closed_reason: next.closed_reason,
    closed_at: new Date().toISOString(),
  })
  if (!u.ok) return u
  const a = await appendAutomationAudit({
    campaignId: params.campaignId,
    actionId: params.actionId,
    eventKind: 'complete',
    message: 'Automation queue item marked complete.',
    payload: {},
  })
  if (!a.ok) return a
  return { ok: true }
}

export async function dismissAutomationAction(params: {
  campaignId: string
  actionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const next = statusAfterDismiss()
  const u = await updateAutomationAction(params.actionId, {
    status: next.status,
    closed_reason: next.closed_reason,
    closed_at: new Date().toISOString(),
  })
  if (!u.ok) return u
  const a = await appendAutomationAudit({
    campaignId: params.campaignId,
    actionId: params.actionId,
    eventKind: 'dismiss',
    message: 'Automation queue item dismissed.',
    payload: {},
  })
  if (!a.ok) return a
  return { ok: true }
}

export async function snoozeAutomationAction(params: {
  campaignId: string
  actionId: string
  untilIso: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const u = await updateAutomationAction(params.actionId, {
    status: 'snoozed',
    snoozed_until: params.untilIso,
  })
  if (!u.ok) return u
  const a = await appendAutomationAudit({
    campaignId: params.campaignId,
    actionId: params.actionId,
    eventKind: 'snooze',
    message: 'Automation queue item snoozed.',
    payload: { until: params.untilIso },
  })
  if (!a.ok) return a
  return { ok: true }
}
