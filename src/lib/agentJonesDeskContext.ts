import { pickWeakestActiveKpi } from './candidateDeskNarrative'
import {
  averageKpiProgressPct,
  countKpisBelowThreshold,
} from './candidateLeadershipInsights'
import type {
  AgentJonesCoordinatorOpsContext,
  AgentJonesLeadershipSnapshotContext,
} from './agentJonesContextV2'
import type { CoordinatorAssignmentBuckets, ParsedInternOverview } from './coordinatorDeskData'
import type { CampaignKpiRow } from './kpiEngine'

export function buildAgentJonesCoordinatorOps(input: {
  hasSupervisorScope: boolean
  supervisedTeamCount: number
  buckets: CoordinatorAssignmentBuckets
  internParsed: ParsedInternOverview | null
  deskLoading: boolean
}): AgentJonesCoordinatorOpsContext {
  const teams = Math.max(0, Math.min(50, Math.floor(input.supervisedTeamCount)))
  return {
    has_supervisor_scope: input.hasSupervisorScope,
    supervised_team_count: teams,
    open_assignments_total:
      input.buckets.blocked.length +
      input.buckets.overdue.length +
      input.buckets.inProgress.length +
      input.buckets.assigned.length,
    blocked_count: input.buckets.blocked.length,
    overdue_count: input.buckets.overdue.length,
    in_progress_count: input.buckets.inProgress.length,
    assigned_not_started_count: input.buckets.assigned.length,
    intern_pipelines_active: input.internParsed?.pipelinesActive ?? null,
    intern_pipelines_escalated: input.internParsed?.pipelinesEscalated ?? null,
    intern_overdue_first_contact: input.internParsed?.overdueFirstContact ?? null,
    desk_loading: input.deskLoading,
  }
}

export function buildAgentJonesLeadershipSnapshot(
  kpis: CampaignKpiRow[],
  missionsVisibleCount: number,
): AgentJonesLeadershipSnapshotContext {
  const w = pickWeakestActiveKpi(kpis)
  return {
    active_kpi_count: kpis.length,
    kpi_mean_progress_pct: averageKpiProgressPct(kpis),
    kpis_below_half_target: countKpisBelowThreshold(kpis, 50),
    weakest_kpi_name: w ? w.row.name : null,
    weakest_kpi_pct_of_target: w ? w.pctOfTarget : null,
    missions_visible_count: Math.max(0, Math.min(500, Math.floor(missionsVisibleCount))),
  }
}
