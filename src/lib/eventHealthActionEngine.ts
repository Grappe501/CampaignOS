/**
 * Maps weak health areas to operational action prompts (deterministic; links surfaces).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { EventHealthReasonCode } from './eventHealthScoreService'

export type HealthActionUrgency = 'critical' | 'high' | 'medium' | 'low'

export type EventHealthRecommendedAction = {
  action_type: string
  urgency: HealthActionUrgency
  owner_role: string
  target_surface: string
  linked_event_id: string
  linked_task_id: string | null
  detail: string
}

export type ScoreLike = {
  component_name: string
  component_score: number
}

const SLUG = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/**
 * Deterministic recommendations from lowest-scoring components + reason codes.
 */
export function deriveHealthActionsFromV2(args: {
  record: CampaignCalendarEventRecord
  components: readonly ScoreLike[]
  nowMs: number
  baseReasonCodes: readonly EventHealthReasonCode[]
}): EventHealthRecommendedAction[] {
  const { record, components, baseReasonCodes } = args
  const id = record.event_id
  const sorted = [...components].sort((a, b) => a.component_score - b.component_score)
  const picks = sorted.slice(0, 5)

  const actions: EventHealthRecommendedAction[] = []

  const push = (a: EventHealthRecommendedAction) => {
    if (!actions.some((x) => x.action_type === a.action_type)) actions.push(a)
  }

  for (const c of picks) {
    const key = SLUG(c.component_name)
    if (c.component_score >= 78) continue

    if (key.includes('staffing') || baseReasonCodes.includes('missing_key_roles')) {
      push({
        action_type: 'assign_volunteer_lead',
        urgency: c.component_score < 40 ? 'critical' : 'high',
        owner_role: 'events_coordinator',
        target_surface: 'event_staffing',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Fill critical staffing matrix roles and confirm backups.',
      })
    }
    if (key.includes('acknowledgment')) {
      push({
        action_type: 'complete_acknowledgments',
        urgency: 'medium',
        owner_role: 'events_coordinator',
        target_surface: 'event_command',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Confirm acknowledgments for assignments and readiness checkpoints.',
      })
    }
    if (key.includes('workflow') || baseReasonCodes.includes('overdue_tasks')) {
      push({
        action_type: 'close_workflow_tasks',
        urgency: 'high',
        owner_role: 'field_coordinator',
        target_surface: 'event_tasks',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Close overdue / critical-path tasks before start window.',
      })
    }
    if (key.includes('communication')) {
      push({
        action_type: 'send_or_schedule_comms',
        urgency: 'high',
        owner_role: 'comms_liaison',
        target_surface: 'mobilize',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Send participant reminders or clear Mobilize publish path.',
      })
    }
    if (key.includes('asset')) {
      push({
        action_type: 'pack_materials',
        urgency: 'medium',
        owner_role: 'logistics_lead',
        target_surface: 'event_logistics',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Resolve Mobilize update flags and confirm materials packed.',
      })
    }
    if (key.includes('run') || key.includes('show')) {
      push({
        action_type: 'finalize_run_of_show',
        urgency: 'medium',
        owner_role: 'events_coordinator',
        target_surface: 'event_record',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Finalize run-of-show and owner handoffs.',
      })
    }
    if (key.includes('ownership')) {
      push({
        action_type: 'assign_event_owner',
        urgency: record.owner_user_id ? 'low' : 'high',
        owner_role: 'campaign_manager',
        target_surface: 'event_record',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Assign accountable Event owner on the row.',
      })
    }
    if (key.includes('approval')) {
      push({
        action_type: 'approval_review',
        urgency: 'critical',
        owner_role: 'events_coordinator',
        target_surface: 'approval_queue',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Complete intake approval or residual conditions before promoting live.',
      })
    }
    if (key.includes('conflict')) {
      push({
        action_type: 'resolve_conflict',
        urgency: 'high',
        owner_role: 'events_coordinator',
        target_surface: 'event_command',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Resolve staffing/host/logistics conflicts with one accountable owner.',
      })
    }
    if (key.includes('compressed') || baseReasonCodes.includes('compressed_timeline')) {
      push({
        action_type: 'escalate_timeline',
        urgency: 'critical',
        owner_role: 'leadership',
        target_surface: 'event_command',
        linked_event_id: id,
        linked_task_id: null,
        detail: 'Escalate compressed lead time — pre-position decisions and materials.',
      })
    }
  }

  if (record.event_type.toLowerCase().includes('house_party')) {
    push({
      action_type: 'confirm_host',
      urgency: 'high',
      owner_role: 'events_coordinator',
      target_surface: 'event_record',
      linked_event_id: id,
      linked_task_id: null,
      detail: 'Confirm host assignment for house-party style canvasses.',
    })
  }

  if (baseReasonCodes.includes('missing_assets')) {
    push({
      action_type: 'venue_confirm',
      urgency: 'high',
      owner_role: 'logistics_lead',
      target_surface: 'event_record',
      linked_event_id: id,
      linked_task_id: null,
      detail: 'Confirm venue + materials readiness.',
    })
  }

  return actions.slice(0, 12)
}
