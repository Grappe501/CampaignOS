import { sortAgentJonesAreaRanking } from './agentJonesAreaScoring'
import type {
  AgentJonesCalendarSummary,
  AgentJonesCoverageSummary,
  AgentJonesDemographicSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
  AgentJonesAreaScore,
  AgentJonesSegmentationSummary,
} from './agentJonesContextV2'

/**
 * Operational posture hints from public messaging + visible pressure — not deterministic voter segmentation.
 */
export function buildAgentJonesSegmentationSummary(input: {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  demographic: AgentJonesDemographicSummary | null
  /** Pass 2 — tie rationale to comparative ranking when present. */
  area_ranking?: AgentJonesAreaScore[] | null
  calendarSummary?: AgentJonesCalendarSummary | null
}): AgentJonesSegmentationSummary | null {
  const rationale: string[] = []
  let primary: AgentJonesSegmentationSummary['primary_mode'] = null
  let secondary: AgentJonesSegmentationSummary['secondary_mode'] = null

  const demo = input.demographic
  const turnoutNotes = demo?.turnout_relevant_notes?.length ?? 0
  const orgNotes = demo?.organizing_considerations?.length ?? 0

  if (turnoutNotes > orgNotes && turnoutNotes > 0) {
    primary = 'turnout'
    rationale.push('Public framing notes lean toward turnout mechanics in this session.')
  } else if (orgNotes > 0) {
    primary = 'persuasion'
    rationale.push('Issue / organizing considerations visible — emphasize persuasion and narrative fit.')
  }

  const staff = input.coverage?.event_staffing_pressure_count ?? 0
  if (staff > 0) {
    if (!primary) primary = 'event_mobilization'
    else if (primary !== 'event_mobilization') secondary = 'event_mobilization'
    rationale.push('Visible assignment staffing pressure — events may need bodies before broad turf asks.')
  }

  const coordPressure = input.field?.coordinator_pressure_count ?? 0
  if (coordPressure > 0) {
    if (!primary) primary = 'leadership'
    else if (!secondary) secondary = 'leadership'
    rationale.push('Supervised board pressure — leadership sequencing and captain coverage matter.')
  }

  if (
    (input.field?.volunteer_capacity_warning_count ?? 0) > 0 ||
    (input.field?.undercovered_area_count ?? 0) > 0
  ) {
    if (!secondary) secondary = 'recruitment'
    rationale.push('Capacity / undercoverage signals — recruitment or reassignment may be the unlock.')
  }

  const cal = input.calendarSummary
  if (cal?.governance_warning_count != null && cal.governance_warning_count > 0) {
    if (!secondary) secondary = 'leadership'
    rationale.push(
      'Timing layer shows governance/escalation signals — leadership cadence may outweigh pure field asks.',
    )
  }

  if (!primary && input.geo?.primary_area_label) {
    primary = 'persuasion'
    rationale.push('Default to persuasion-forward posture when only roster-safe geography is present.')
  }

  const ranked = input.area_ranking?.length
    ? sortAgentJonesAreaRanking(input.area_ranking)
    : []
  const top = ranked[0]
  if (top && (top.priority_band === 'critical' || top.priority_band === 'high')) {
    rationale.push(
      `Comparative ranking highlights pressure in “${top.area_label.slice(0, 80)}” — weight execution before broad persuasion-only asks.`,
    )
    if (primary === 'persuasion') {
      if (!secondary) secondary = 'turnout'
      rationale.push(
        'High area pressure with persuasion-primary heuristic — add turnout/ops support so narrative matches capacity.',
      )
    }
  }

  if (!rationale.length) return null

  let turnout_persuasion_balance: string | null = null
  if (primary === 'turnout' && secondary === 'persuasion') {
    turnout_persuasion_balance =
      'Session hints both turnout mechanics and persuasion — sequence: clear capacity and deadlines, then message fit (operational guidance only).'
  } else if (primary === 'persuasion' && secondary === 'turnout') {
    turnout_persuasion_balance =
      'Persuasion-forward with turnout as secondary — keep asks credible against visible assignment pressure (heuristic).'
  } else if (turnoutNotes > 0 && orgNotes > 0) {
    turnout_persuasion_balance =
      'Both turnout- and persuasion-relevant public notes appear — blend messaging without claiming voter-level certainty.'
  }

  const confidence_note =
    'Heuristic from visible session summaries and comparative ranking proxies — not a voter-file turnout or persuasion model.'

  return {
    area_label: demo?.area_label ?? input.geo?.primary_area_label ?? null,
    primary_mode: primary,
    secondary_mode: secondary,
    rationale_points: rationale.slice(0, 6),
    confidence_note,
    turnout_persuasion_balance,
  }
}
