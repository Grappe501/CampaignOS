/**
 * Rules-first trigger evaluation (deterministic). AI must not replace this layer.
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import { buildPostEventAttentionQueue } from './eventPostEventWorkflow'
import { buildCountyCommandRollups } from './geographicCommandSelectors'
import {
  rankGeographicInterventionCandidates,
  type GeographicInterventionCandidate,
} from './geographicCommandMetrics'
import { findOverloadedVolunteers, type VolunteerLoadProfile } from './volunteerLoadBalancerService'
import type { StaffingAssignmentLike } from './eventStaffingMatrix'
import { buildTodayCommandSnapshot, type TodayCommandSnapshot } from './todayCommandService'
import type { AutomationConfidence, AutomationSeverity, AutomationTriggerFiring } from './automationDomain'
import { AUTOMATION_REASON } from './automationReasonCodes'
import type { GotvSiteRollup } from './gotvMetrics'
import { phaseExpectsHigherCoverage, resolveGotvTurnoutPhase } from './gotvCountdownEngine'

export type AutomationRulesInput = {
  nowMs: number
  campaignId?: string
  events: readonly CampaignCalendarEventRecord[]
  assignmentMap?: Map<string, StaffingAssignmentLike[]>
  loadMap?: Map<string, VolunteerLoadProfile>
  /** Optional GOTV site rollups from DB-backed command layer. */
  gotvRollups?: readonly GotvSiteRollup[]
}

function firing(
  trigger_type: AutomationTriggerFiring['trigger_type'],
  dedupe_key: string,
  severity: AutomationSeverity,
  confidence: AutomationConfidence,
  title: string,
  explanation: string,
  owner_role_hint: string,
  target_type: AutomationTriggerFiring['target_type'],
  target_id: string | null,
  metadata?: Record<string, unknown>,
): AutomationTriggerFiring {
  return {
    trigger_type,
    dedupe_key,
    severity,
    confidence,
    title,
    explanation,
    owner_role_hint,
    target_type,
    target_id,
    metadata,
  }
}

export function evaluateAutomationTriggers(input: AutomationRulesInput): AutomationTriggerFiring[] {
  const { nowMs, events } = input
  const assignmentMap = input.assignmentMap ?? new Map<string, StaffingAssignmentLike[]>()
  const loadMap = input.loadMap ?? new Map<string, VolunteerLoadProfile>()

  const snap: TodayCommandSnapshot = buildTodayCommandSnapshot(events, nowMs, { assignmentMap })
  const out: AutomationTriggerFiring[] = []

  const staffingIssues = snap.issues.filter(
    (i) => i.section === 'staffing_gap' || i.section === 'blocker',
  )
  for (const issue of staffingIssues.slice(0, 6)) {
    const sev: AutomationSeverity =
      issue.healthScore < 40 || issue.stale === 'escalate_now' ? 'critical' : 'high'
    out.push(
      firing(
        'event_staffing_pressure',
        `staffing:${issue.record.event_id}:${Math.floor(nowMs / 3_600_000)}`,
        sev,
        'high',
        `Staffing pressure: ${issue.record.title}`,
        `${issue.whyHere} (${AUTOMATION_REASON.STAFFING_GAP_NEAR_TERM})`,
        issue.responsibleRole,
        'event',
        issue.record.event_id,
        { reason: AUTOMATION_REASON.STAFFING_GAP_NEAR_TERM, issue_id: issue.id },
      ),
    )
  }

  if (snap.pendingApprovals.length >= 3) {
    out.push(
      firing(
        'approval_queue_backlog',
        `approvals:${snap.pendingApprovals.length}:${new Date(nowMs).toDateString()}`,
        snap.pendingApprovals.length >= 6 ? 'high' : 'watch',
        'high',
        'Approval queue backlog',
        `${snap.pendingApprovals.length} events await approval (${AUTOMATION_REASON.APPROVAL_BACKLOG}).`,
        'event_coordinator',
        'campaign',
        null,
        { reason: AUTOMATION_REASON.APPROVAL_BACKLOG, count: snap.pendingApprovals.length },
      ),
    )
  }

  const postEvent = buildPostEventAttentionQueue(events, nowMs, 8)
  if (postEvent.length > 0) {
    const top = postEvent[0]!
    const postSev: AutomationSeverity = top.severity === 'critical' ? 'critical' : 'high'
    out.push(
      firing(
        'post_event_followup_debt',
        `postevent:${top.eventId}:${new Date(nowMs).toDateString()}`,
        postSev,
        'medium',
        'Post-event follow-up needs owners',
        `${postEvent.length} event(s) need follow-up attention (${AUTOMATION_REASON.POST_EVENT_FOLLOWUP}).`,
        'event_coordinator',
        'event',
        top.eventId,
        { reason: AUTOMATION_REASON.POST_EVENT_FOLLOWUP, count: postEvent.length },
      ),
    )
  }

  const countyRoll = buildCountyCommandRollups(events, nowMs, 14)
  const geoRanked: GeographicInterventionCandidate[] = rankGeographicInterventionCandidates(countyRoll, 3)
  const criticalGeo = geoRanked.find((g) => g.pressure_band === 'critical')
  if (criticalGeo && criticalGeo.county_id) {
    out.push(
      firing(
        'geographic_command_pressure',
        `geo:${criticalGeo.county_id}:${new Date(nowMs).toDateString()}`,
        'critical',
        'medium',
        `Geographic pressure: ${criticalGeo.label}`,
        (criticalGeo.reasons[0] ?? 'County pressure band critical') +
          ` (${AUTOMATION_REASON.GEO_PRESSURE_CRITICAL})`,
        'field_director',
        'county',
        null,
        {
          reason: AUTOMATION_REASON.GEO_PRESSURE_CRITICAL,
          county_id: criticalGeo.county_id,
        },
      ),
    )
  }

  if (snap.digest.criticalIssuesCount >= 5) {
    out.push(
      firing(
        'command_critical_mass',
        `cmdmass:${new Date(nowMs).toDateString()}`,
        'high',
        'high',
        'Command scan: many critical items',
        `${snap.digest.criticalIssuesCount} critical issues in program (${AUTOMATION_REASON.COMMAND_CRITICAL_MASS}).`,
        'campaign_manager',
        'campaign',
        null,
        { reason: AUTOMATION_REASON.COMMAND_CRITICAL_MASS, count: snap.digest.criticalIssuesCount },
      ),
    )
  }

  for (const o of findOverloadedVolunteers(loadMap).slice(0, 2)) {
    out.push(
      firing(
        'volunteer_load_hotspot',
        `load:${o.user_id}:${new Date(nowMs).toDateString()}`,
        'watch',
        'medium',
        'Volunteer load hotspot',
        `${o.details} (${AUTOMATION_REASON.VOLUNTEER_OVERLOAD})`,
        'volunteer_coordinator',
        'volunteer',
        o.user_id,
        { reason: AUTOMATION_REASON.VOLUNTEER_OVERLOAD, load_score: o.load_score },
      ),
    )
  }

  const gotvRollups = input.gotvRollups
  if (gotvRollups?.length) {
    const phase = resolveGotvTurnoutPhase(nowMs).phase
    const hotPhase = phaseExpectsHigherCoverage(phase)
    for (const site of gotvRollups.filter((r) => r.readiness_band === 'red').slice(0, 5)) {
      out.push(
        firing(
          'gotv_site_critical_coverage',
          `gotv:${site.site_id}:${new Date(nowMs).toDateString()}`,
          hotPhase ? 'critical' : 'high',
          'high',
          `GOTV site critical: ${site.label}`,
          `${site.primary_reasons[0] ?? 'Readiness red'} (${AUTOMATION_REASON.GOTV_SITE_CRITICAL})`,
          'field_director',
          'none',
          null,
          {
            reason: AUTOMATION_REASON.GOTV_SITE_CRITICAL,
            gotv_site_id: site.site_id,
            county_id: site.county_id,
          },
        ),
      )
    }
    const byCounty = new Map<string | null, GotvSiteRollup[]>()
    for (const r of gotvRollups) {
      if (r.readiness_band !== 'red' && r.readiness_band !== 'orange') continue
      const k = r.county_id
      const cur = byCounty.get(k) ?? []
      cur.push(r)
      byCounty.set(k, cur)
    }
    for (const [countyId, list] of byCounty) {
      if (list.length < 2) continue
      const key = `gotvcl:${countyId ?? 'none'}:${new Date(nowMs).toDateString()}`
      out.push(
        firing(
          'gotv_county_cluster_weak',
          key,
          hotPhase ? 'high' : 'watch',
          'medium',
          `GOTV cluster risk in county`,
          `${list.length} at-risk turnout site(s) in same county (${AUTOMATION_REASON.GOTV_COUNTY_CLUSTER}).`,
          'county_lead',
          'none',
          null,
          {
            reason: AUTOMATION_REASON.GOTV_COUNTY_CLUSTER,
            county_id: countyId,
            site_ids: list.map((x) => x.site_id),
          },
        ),
      )
    }
  }

  const dedup = new Map<string, AutomationTriggerFiring>()
  for (const f of out) {
    dedup.set(f.dedupe_key, f)
  }
  return [...dedup.values()].sort((a, b) => {
    const order = { critical: 3, high: 2, watch: 1, info: 0 } as const
    return order[b.severity] - order[a.severity]
  })
}
