/**
 * Map trigger firings to actionable recommendations (deterministic).
 */

import type { AutomationActionRecommendation, AutomationTriggerFiring } from './automationDomain'
import { executionModeFor } from './automationGuards'
import { AUTOMATION_ROUTES, routeForEventRecord } from './automationRouting'

function kindForTrigger(trigger_type: AutomationTriggerFiring['trigger_type']): AutomationActionRecommendation['intervention_kind'] {
  switch (trigger_type) {
    case 'approval_queue_backlog':
      return 'approval_request'
    case 'geographic_command_pressure':
      return 'route'
    case 'command_critical_mass':
      return 'escalation'
    case 'volunteer_load_hotspot':
      return 'task_suggestion'
    case 'gotv_site_critical_coverage':
      return 'escalation'
    case 'gotv_county_cluster_weak':
      return 'route'
    default:
      return 'route'
  }
}

export function interventionsFromTriggers(
  firings: readonly AutomationTriggerFiring[],
): AutomationActionRecommendation[] {
  return firings.map((f) => {
    const intervention_kind = kindForTrigger(f.trigger_type)
    const execution_mode = executionModeFor(f.severity, intervention_kind)
    let route_path: string | null = AUTOMATION_ROUTES.coordinator_desk

    if (f.target_type === 'event' && f.target_id) {
      route_path = routeForEventRecord(f.target_id)
    } else if (f.trigger_type === 'geographic_command_pressure') {
      const cid =
        typeof f.metadata?.county_id === 'string' && f.metadata.county_id.trim()
          ? String(f.metadata.county_id)
          : null
      route_path = cid
        ? `${AUTOMATION_ROUTES.county_ops}?county=${encodeURIComponent(cid)}#geographic-command`
        : `${AUTOMATION_ROUTES.county_ops}#geographic-command`
    } else if (f.target_type === 'volunteer' && f.target_id) {
      route_path = AUTOMATION_ROUTES.volunteer_command
    } else if (f.trigger_type === 'approval_queue_backlog') {
      route_path = `${AUTOMATION_ROUTES.coordinator_desk}#event-approval-queue`
    } else if (f.trigger_type === 'command_critical_mass') {
      route_path = AUTOMATION_ROUTES.war_room
    } else if (f.trigger_type === 'gotv_site_critical_coverage') {
      const sid = typeof f.metadata?.gotv_site_id === 'string' ? f.metadata.gotv_site_id : null
      const cid = typeof f.metadata?.county_id === 'string' ? f.metadata.county_id : null
      route_path = cid
        ? `${AUTOMATION_ROUTES.county_ops}?county=${encodeURIComponent(cid)}#gotv-command`
        : `${AUTOMATION_ROUTES.county_ops}#gotv-command`
      if (sid) {
        route_path += `&site=${encodeURIComponent(sid)}`
      }
    } else if (f.trigger_type === 'gotv_county_cluster_weak') {
      const cid = typeof f.metadata?.county_id === 'string' ? f.metadata.county_id : null
      route_path = cid
        ? `${AUTOMATION_ROUTES.county_ops}?county=${encodeURIComponent(cid)}#gotv-command`
        : `${AUTOMATION_ROUTES.county_ops}#gotv-command`
    } else if (f.trigger_type === 'post_event_followup_debt') {
      route_path = AUTOMATION_ROUTES.coordinator_desk
    }

    return {
      ...f,
      intervention_kind,
      execution_mode,
      route_path,
    }
  })
}
