import type { EventAiIntelligencePacketV3 } from './eventAiIntelligencePacket'

/** Max ~88 points from sections + small core — capped to avoid implying full domain coverage. */
export function scoreEventAiPacketCompleteness(p: EventAiIntelligencePacketV3): number {
  let pts = 0
  const core = p.core
  if (core.outcomes.volunteerGoal != null || core.outcomes.expectedAudienceSize != null) pts += 8
  if (p.approval_state) pts += 7
  if (p.staffing?.requirements_summary || p.staffing?.gap_summary) pts += 9
  if (p.volunteer_load?.warnings?.length) pts += 7
  if (p.communications?.plan_state || p.communications?.press_media_state) pts += 8
  if (p.media_library?.readiness) pts += 4
  if (p.run_of_show?.state) pts += 4
  if (p.issue_log?.open_count != null) pts += 5
  if (p.day_of_live?.active || (p.day_of_live?.lines?.length ?? 0) > 0) pts += 6
  if (p.after_action?.score_line) pts += 8
  if ((p.similar_events?.top_match_ids?.length ?? 0) > 0) pts += 7
  if (p.leadership_attention?.summary) pts += 4
  if (p.candidate_schedule?.conflict_hint) pts += 4
  if (p.finance_signal?.constraint_line) pts += 4
  if (p.signup_sheet_ingestion && p.signup_sheet_ingestion.state !== 'unknown') pts += 4
  if (p.follow_up_downstream?.open_followups != null) pts += 5
  if ((p.workbench_tasks?.open_task_titles?.length ?? 0) > 0) pts += 5
  if (p.blockers.length) pts += 5
  if (p.deterministic_next_actions.length) pts += 6

  return Math.min(100, Math.round(pts))
}
