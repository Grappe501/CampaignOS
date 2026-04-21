/**
 * Evaluate deterministic triggers and persist new queue rows (trusted Supabase path).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { buildVolunteerLoadMap } from './volunteerLoadBalancerService'
import { evaluateAutomationTriggers } from './automationRulesEngine'
import { interventionsFromTriggers } from './automationInterventionEngine'
import {
  appendAutomationAudit,
  fetchOpenAutomationDedupeKeys,
  insertAutomationAction,
  insertAutomationTriggerEvent,
} from './campaignAutomationDb'

export async function syncAutomationLayer(input: {
  campaignId: string
  nowMs: number
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap: Map<string, StaffingAssignmentLike[]>
  windowDays?: number
}): Promise<{ created: number; skipped: number; errors: string[] }> {
  const windowDays = input.windowDays ?? 7
  const errors: string[] = []
  const loadMap = buildVolunteerLoadMap(input.events, input.assignmentMap, input.nowMs, windowDays)
  const firings = evaluateAutomationTriggers({
    nowMs: input.nowMs,
    campaignId: input.campaignId,
    events: input.events,
    assignmentMap: input.assignmentMap,
    loadMap,
  })
  const recs = interventionsFromTriggers(firings)
  const existing = await fetchOpenAutomationDedupeKeys(input.campaignId)
  let created = 0
  let skipped = 0

  for (const rec of recs) {
    if (existing.has(rec.dedupe_key)) {
      skipped++
      continue
    }
    const trig = await insertAutomationTriggerEvent({ campaignId: input.campaignId, firing: rec })
    if (!trig.ok) errors.push(`trigger_log: ${trig.error}`)

    const ins = await insertAutomationAction({ campaignId: input.campaignId, rec })
    if (!ins.ok) {
      if (ins.duplicate) {
        skipped++
        existing.add(rec.dedupe_key)
      } else {
        errors.push(`action_insert: ${ins.error}`)
      }
      continue
    }
    created++
    existing.add(rec.dedupe_key)
    const aud = await appendAutomationAudit({
      campaignId: input.campaignId,
      actionId: ins.id,
      eventKind: 'action_created',
      message: `Automation action queued: ${rec.title}`,
      payload: { dedupe_key: rec.dedupe_key, trigger_type: rec.trigger_type },
    })
    if (!aud.ok) errors.push(`audit: ${aud.error}`)
  }

  const syn = await appendAutomationAudit({
    campaignId: input.campaignId,
    actionId: null,
    eventKind: 'sync_eval',
    message: `Automation sync: ${firings.length} trigger evaluation(s), ${created} new queue row(s), ${skipped} skipped.`,
    payload: { firings: firings.length, created, skipped },
  })
  if (!syn.ok) errors.push(`sync_audit: ${syn.error}`)

  return { created, skipped, errors }
}
