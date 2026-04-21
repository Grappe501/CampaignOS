/**
 * Assembles Event AI Intelligence Packet V3 from domain rows + optional enrichments.
 */

import type { CampaignEvent } from '../campaignEventDomain'
import type { EventReadinessModel } from '../campaignEventDomain'
import { buildEventIntelligencePacket } from '../campaignEventDomainServices'
import { EVENT_AI_INTELLIGENCE_PACKET_VERSION } from './eventAiPacketVersions'
import type { EventAiIntelligencePacketV3 } from './eventAiIntelligencePacket'
import { scoreEventAiPacketCompleteness } from './eventAiPacketCompleteness'

export type EventAiPacketAssemblyInput = {
  campaign_id: string
  event: CampaignEvent
  readiness: Pick<EventReadinessModel, 'readinessScore' | 'blockers'>
  /** Optional enrichments — null fields remain honest */
  extras?: Partial<
    Pick<
      EventAiIntelligencePacketV3,
      | 'approval_state'
      | 'staffing'
      | 'volunteer_load'
      | 'communications'
      | 'media_library'
      | 'run_of_show'
      | 'issue_log'
      | 'day_of_live'
      | 'after_action'
      | 'similar_events'
      | 'leadership_attention'
      | 'candidate_schedule'
      | 'finance_signal'
      | 'signup_sheet_ingestion'
      | 'follow_up_downstream'
      | 'workbench_tasks'
    >
  >
  blockers?: string[]
  deterministic_next_actions?: string[]
}

export function assembleEventAiIntelligencePacketV3(input: EventAiPacketAssemblyInput): EventAiIntelligencePacketV3 {
  const core = buildEventIntelligencePacket(input.event, input.readiness)
  const limitation_lines: string[] = []
  if (core.readiness.blockers.length === 0 && core.readiness.readinessScore < 40) {
    limitation_lines.push('Readiness score low — verify staffing and approvals in-app.')
  }
  const p: EventAiIntelligencePacketV3 = {
    packet_version: EVENT_AI_INTELLIGENCE_PACKET_VERSION,
    generated_at_ms: Date.now(),
    campaign_id: input.campaign_id,
    core,
    confidence: {
      band: limitation_lines.length ? 'medium' : 'high',
      limitation_lines,
    },
    approval_state: input.extras?.approval_state ?? null,
    staffing: input.extras?.staffing ?? null,
    volunteer_load: input.extras?.volunteer_load ?? null,
    communications: input.extras?.communications ?? null,
    media_library: input.extras?.media_library ?? null,
    run_of_show: input.extras?.run_of_show ?? null,
    issue_log: input.extras?.issue_log ?? null,
    day_of_live: input.extras?.day_of_live ?? null,
    after_action: input.extras?.after_action ?? null,
    similar_events: input.extras?.similar_events ?? null,
    leadership_attention: input.extras?.leadership_attention ?? null,
    candidate_schedule: input.extras?.candidate_schedule ?? null,
    finance_signal: input.extras?.finance_signal ?? null,
    signup_sheet_ingestion: input.extras?.signup_sheet_ingestion ?? { state: 'unknown', note: null },
    follow_up_downstream: input.extras?.follow_up_downstream ?? null,
    workbench_tasks: input.extras?.workbench_tasks ?? { open_task_titles: [] },
    blockers: input.blockers ?? [],
    deterministic_next_actions: input.deterministic_next_actions ?? [],
  }
  const pct = scoreEventAiPacketCompleteness(p)
  if (pct < 45) {
    p.confidence = {
      band: 'sparse',
      limitation_lines: [
        ...limitation_lines,
        'Packet incomplete — many subsystems not bound; avoid granular claims.',
      ],
    }
  } else if (pct < 70) {
    p.confidence = {
      band: 'medium',
      limitation_lines: [...limitation_lines, 'Partial domain coverage only.'],
    }
  }
  return p
}
