import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'
import { fetchSupervisorInternOverview } from './internPipelineEngine'
import { fetchSupervisorActivationInsights } from './dailyMissionEngine'
import {
  fetchSupervisorTeamAssignments,
  type SupervisorAssignmentRow,
} from './supervisorTasks'

export type SupervisorTeamLink = {
  team_id: string
  supervisor_profile_id: string
}

export type ParsedInternOverview = {
  internProfileIds: string[]
  pipelinesActive: number
  pipelinesEscalated: number
  overdueFirstContact: number
}

export function parseInternOverview(
  raw: Record<string, unknown> | null,
): ParsedInternOverview | null {
  if (!raw) return null
  const internRaw = raw.intern_profiles
  const internProfileIds = Array.isArray(internRaw)
    ? internRaw.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : []
  const num = (k: string) => {
    const v = raw[k]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  return {
    internProfileIds,
    pipelinesActive: num('pipelines_active'),
    pipelinesEscalated: num('pipelines_escalated'),
    overdueFirstContact: num('overdue_first_contact'),
  }
}

/** Teams where the signed-in profile is registered as a volunteer supervisor. */
export async function fetchMySupervisorTeams(): Promise<SupervisorTeamLink[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('volunteer_supervisor_teams')
    .select('team_id, supervisor_profile_id')
  if (error) {
    console.warn('volunteer_supervisor_teams:', error.message)
    return []
  }
  return (data ?? []) as SupervisorTeamLink[]
}

export type CoordinatorDeskLoad = {
  assignments: SupervisorAssignmentRow[]
  internRaw: Record<string, unknown> | null
  activation: Record<string, unknown> | null
  supervisedTeams: SupervisorTeamLink[]
}

export async function loadCoordinatorDeskData(
  primaryTeamId: string | undefined,
): Promise<CoordinatorDeskLoad> {
  if (isDevAuthBypassEnabled()) {
    return {
      assignments: [],
      internRaw: null,
      activation: null,
      supervisedTeams: [],
    }
  }
  const [assignments, supervisedTeams] = await Promise.all([
    fetchSupervisorTeamAssignments(),
    fetchMySupervisorTeams(),
  ])

  const teamForRpc =
    primaryTeamId?.trim() ||
    supervisedTeams[0]?.team_id ||
    undefined

  const [internRaw, activation] = teamForRpc
    ? await Promise.all([
        fetchSupervisorInternOverview(teamForRpc),
        fetchSupervisorActivationInsights(teamForRpc),
      ])
    : [null, null]

  return {
    assignments,
    internRaw,
    activation,
    supervisedTeams,
  }
}

export function shortProfileId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

export function countJsonArray(val: unknown): number {
  return Array.isArray(val) ? val.length : 0
}
