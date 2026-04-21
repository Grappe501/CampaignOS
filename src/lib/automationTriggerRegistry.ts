/**
 * Trigger registry metadata (documentation + defaults). Predicate logic lives in automationRulesEngine.
 */

import type { AutomationTriggerType } from './automationDomain'

export type AutomationTriggerRegistryEntry = {
  id: AutomationTriggerType
  label: string
  description: string
  default_owner_role: string
  cooldown_hours: number
}

export const AUTOMATION_TRIGGER_REGISTRY: readonly AutomationTriggerRegistryEntry[] = [
  {
    id: 'event_staffing_pressure',
    label: 'Event staffing pressure',
    description: 'Command panel shows staffing gaps or critical health inside near-term window.',
    default_owner_role: 'event_coordinator',
    cooldown_hours: 4,
  },
  {
    id: 'approval_queue_backlog',
    label: 'Approval backlog',
    description: 'Multiple events awaiting coordinator approval.',
    default_owner_role: 'event_coordinator',
    cooldown_hours: 2,
  },
  {
    id: 'post_event_followup_debt',
    label: 'Post-event follow-up debt',
    description: 'Past events still need follow-up phase closure.',
    default_owner_role: 'event_coordinator',
    cooldown_hours: 6,
  },
  {
    id: 'geographic_command_pressure',
    label: 'Geographic pressure',
    description: 'County rollup crosses critical pressure band.',
    default_owner_role: 'field_director',
    cooldown_hours: 6,
  },
  {
    id: 'command_critical_mass',
    label: 'Command critical mass',
    description: 'Many simultaneous critical issues in deterministic command scan.',
    default_owner_role: 'campaign_manager',
    cooldown_hours: 3,
  },
  {
    id: 'volunteer_load_hotspot',
    label: 'Volunteer load hotspot',
    description: 'Load balancer detects overloaded volunteers.',
    default_owner_role: 'volunteer_coordinator',
    cooldown_hours: 4,
  },
  {
    id: 'gotv_site_critical_coverage',
    label: 'GOTV site critical',
    description: 'Polling or early vote site in red readiness band.',
    default_owner_role: 'field_director',
    cooldown_hours: 2,
  },
  {
    id: 'gotv_county_cluster_weak',
    label: 'GOTV county cluster',
    description: 'Multiple at-risk turnout sites in one county.',
    default_owner_role: 'county_lead',
    cooldown_hours: 4,
  },
]

export function registryEntry(id: AutomationTriggerType): AutomationTriggerRegistryEntry | undefined {
  return AUTOMATION_TRIGGER_REGISTRY.find((e) => e.id === id)
}
