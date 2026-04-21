/**
 * Compact, server-safe payload for Agent Jones from deterministic briefing assembly.
 */

import type { OperatorBriefingPack } from './eventIntelligenceContracts'
import type { BriefingDelta } from './eventIntelligenceContracts'
import type { AfterActionScoreResult } from './eventIntelligenceContracts'

/** Browser-localStorage v1 field execution — advisory; never authoritative over Supabase. */
export type AgentJonesFieldExecutionSnapshot = {
  phase_label: string
  briefing_lines: string[]
  open_field_issues: number
  pending_closure_items: number
  signup_handoff_ack: boolean
  source: 'browser_workspace_v1'
}

export type AgentJonesEventIntelligenceLayer = {
  event_id: string
  event_title: string
  briefing_one_liner: string
  /** Short operator paragraph */
  briefing_quick: string
  /** Full structured digest (bounded) */
  briefing_full: string
  top_risks: string[]
  next_actions: string[]
  similar_lessons: string[]
  delta_lines?: string[]
  after_action_line?: string | null
  data_gap_warnings?: string[]
  /** Day-of / onsite ops workspace (deterministic lines + counts). */
  field_execution?: AgentJonesFieldExecutionSnapshot
}

export function buildAgentJonesEventIntelligenceLayer(input: {
  pack: OperatorBriefingPack
  delta?: BriefingDelta | null
  afterAction: AfterActionScoreResult | null
  recordTitle: string
  fieldExecution?: AgentJonesFieldExecutionSnapshot | null
}): AgentJonesEventIntelligenceLayer {
  const { pack, delta, afterAction, recordTitle, fieldExecution } = input
  const briefing_quick = [
    pack.purpose_line,
    pack.staffing_line,
    pack.comms_line,
    pack.logistics_line,
  ]
    .filter(Boolean)
    .join(' ')

  const briefing_full = [
    `Risks: ${pack.top_risks.join(' · ')}`,
    `Next: ${pack.next_actions.join(' · ')}`,
    `Lessons from analogs: ${pack.similar_lessons.join(' · ')}`,
    `People: ${pack.key_people.join(' · ')}`,
  ].join('\n')

  const delta_lines = delta
    ? [...delta.changes, ...delta.risks_improved.map((x) => `Improved: ${x}`), ...delta.risks_worsened.map((x) => `Watch: ${x}`)]
    : undefined

  const after_action_line =
    afterAction && afterAction.documentation_warnings.length
      ? `After-action ${afterAction.overall_score}/100 — ${afterAction.documentation_warnings[0]}`
      : afterAction
        ? `After-action ${afterAction.overall_score}/100 (${Math.round(afterAction.completeness * 100)}% data completeness).`
        : null

  const data_gap_warnings = afterAction?.documentation_warnings?.length ? afterAction.documentation_warnings : undefined

  return {
    event_id: pack.event_id,
    event_title: recordTitle,
    briefing_one_liner: pack.one_liner,
    briefing_quick: briefing_quick.slice(0, 1200),
    briefing_full: briefing_full.slice(0, 2500),
    top_risks: pack.top_risks.slice(0, 6),
    next_actions: pack.next_actions.slice(0, 6),
    similar_lessons: pack.similar_lessons.slice(0, 8),
    ...(delta_lines?.length ? { delta_lines: delta_lines.slice(0, 12) } : {}),
    after_action_line,
    data_gap_warnings,
    ...(fieldExecution ? { field_execution: fieldExecution } : {}),
  }
}
