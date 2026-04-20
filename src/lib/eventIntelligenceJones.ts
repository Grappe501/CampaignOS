/**
 * Agent Jones — pre/post event intelligence adapters (no LLM; structured + heuristics).
 */

import type { CampaignCalendarEventRecord } from './campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from './campaignEventTypeMatrix'
import type { EventIntelligencePacket, EventOperationalStatus } from './campaignEventDomain'
import { getEventTypeTemplate } from './event-types.config'
import { campaignEventFromRow } from './campaignEventDomain'
import { buildEventIntelligencePacket } from './campaignEventDomainServices'
import type { EventReadinessModel } from './campaignEventDomain'
import type { EventTargetingProfile } from './eventTargetingService'

export type PreEventBrief = {
  title: string
  geographyLine: string
  recommendedAsks: string[]
  talkingPoints: string[]
  riskThemes: string[]
  audienceLine: string
}

export type PostEventDebrief = {
  headline: string
  whatHappened: string
  whatWeLearned: string
  priorityFollowUp: string
  shapeFutureEvents: string
}

export type EventIntelligenceEnrichment = {
  attendanceCount: number
  followups: readonly { followupType: string; status: string; dueAt: string | null }[]
  issueFlagsRaised: number
  volunteerInterestFlags: number
  recentAreaEvents?: readonly string[]
}

function rowAsDomainRecord(row: CampaignCalendarEventRecord): Record<string, unknown> {
  const op =
    (row.operational_status as EventOperationalStatus | undefined) ?? ('scheduled' as const)
  return {
    id: row.event_id,
    campaign_id: row.campaign_id ?? 'default',
    title: row.title,
    event_type: row.event_type,
    event_subtype: row.event_subtype,
    status: row.stage_status,
    operational_status: op,
    event_objective: null,
    event_scope: row.county_id ? 'county' : null,
    host_type: null,
    county_id: row.county_id,
    precinct_id: row.precinct_id,
    neighborhood_id: null,
    district_id: row.district_id,
    parent_event_id: null,
    mobilize_publish_state: row.mobilize_publish_state,
    readiness_score: row.readiness_score ?? null,
    required_roles: [],
    expected_audience_size: null,
    actual_audience_size: null,
    volunteer_goal: null,
    volunteer_outcome: null,
    voter_contact_goal: null,
    voter_contact_outcome: null,
    fundraising_goal: null,
    fundraising_outcome: null,
    issues_captured: [],
    endorsements_or_influencers_identified: [],
    followup_completion_score: null,
    intelligence_summary: null,
    start_at: row.start_at,
    end_at: row.end_at,
    owner_user_id: row.owner_user_id,
    timezone: row.timezone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function buildPreEventBrief(
  row: CampaignCalendarEventRecord,
  typeKey: CampaignEventTypeKey,
  targeting?: EventTargetingProfile | null,
  extras?: { recentAreaEvents?: readonly string[] },
): PreEventBrief {
  const t = getEventTypeTemplate(typeKey)
  const county = row.county_id ? `County focus: ${row.county_id.replace(/-/g, ' ')}` : 'Geography not pinned to a county yet.'
  const historyPts =
    extras?.recentAreaEvents?.map((line) => `Recent in area: ${line}`).slice(0, 3) ?? []
  return {
    title: `Brief: ${row.title}`,
    geographyLine: county,
    recommendedAsks: t.scriptPrompts.slice(0, 4),
    talkingPoints: [
      ...historyPts,
      ...t.scriptPrompts,
      ...t.recommendedKpis.map((k) => `Reinforce KPI: ${k}`),
    ].slice(0, 10),
    riskThemes: [...t.riskWarnings],
    audienceLine: targeting
      ? `Audience focus: ${targeting.audienceFocus}; segments: ${targeting.segmentTags.join(', ') || 'none specified'}.`
      : 'Define targeting to sharpen asks and volunteer pathways.',
  }
}

export function buildPostEventDebrief(
  row: CampaignCalendarEventRecord,
  packet: EventIntelligencePacket,
  extras?: { goalsVsOutcomesLine?: string },
): PostEventDebrief {
  const goalsLine =
    extras?.goalsVsOutcomesLine ??
    `Goals vs field: expected audience ${packet.outcomes.expectedAudienceSize ?? '—'}, actual ${packet.outcomes.actualAudienceSize ?? '—'}; volunteer outcome ${packet.outcomes.volunteerOutcome ?? '—'} vs goal ${packet.outcomes.volunteerGoal ?? '—'}.`
  return {
    headline: `Debrief: ${row.title}`,
    whatHappened: `Operational status ${packet.operationalStatus}; check-in count ${packet.fieldOperationalSignals?.attendanceCount ?? '—'}; pending follow-ups ${packet.fieldOperationalSignals?.followupsPending ?? '—'}.`,
    whatWeLearned: packet.intelligenceSummary ?? goalsLine,
    priorityFollowUp: packet.readiness.blockers[0] ?? 'Confirm follow-up owner and thank-you sequence.',
    shapeFutureEvents:
      packet.recentAreaEvents?.length && packet.recentAreaEvents[0]
        ? `Use nearby history (${packet.recentAreaEvents[0]}) to tune density and staffing.`
        : 'Compare outcomes to recommended KPIs and adjust density in this geography.',
  }
}

function mergeIntelligenceSummary(
  base: string | null,
  enrichment: EventIntelligenceEnrichment,
): string | null {
  const parts: string[] = []
  if (base?.trim()) parts.push(base.trim())
  parts.push(`Check-ins recorded: ${enrichment.attendanceCount}`)
  if (enrichment.followups.length) {
    const pend = enrichment.followups.filter((f) => f.status === 'pending' || f.status === 'open')
    parts.push(`Follow-up queue: ${pend.length} open / ${enrichment.followups.length} total`)
  }
  if (enrichment.issueFlagsRaised > 0) {
    parts.push(`Issue flags from check-in: ${enrichment.issueFlagsRaised}`)
  }
  if (enrichment.volunteerInterestFlags > 0) {
    parts.push(`Volunteer interest signals: ${enrichment.volunteerInterestFlags}`)
  }
  return parts.join(' · ') || null
}

export function buildEventIntelligencePacketFromCalendarRow(
  row: CampaignCalendarEventRecord,
  readiness: Pick<EventReadinessModel, 'readinessScore' | 'blockers'>,
  enrichment?: EventIntelligenceEnrichment | null,
): EventIntelligencePacket {
  const ev = campaignEventFromRow(rowAsDomainRecord(row))
  const base = buildEventIntelligencePacket(ev, readiness)
  if (!enrichment) return base

  const pendingFu = enrichment.followups.filter(
    (f) => f.status === 'pending' || f.status === 'open' || f.status === 'in_progress',
  )
  return {
    ...base,
    intelligenceSummary: mergeIntelligenceSummary(base.intelligenceSummary, enrichment),
    fieldOperationalSignals: {
      attendanceCount: enrichment.attendanceCount,
      followupsPending: pendingFu.length,
      followups: enrichment.followups.map((f) => ({
        followupType: f.followupType,
        status: f.status,
        dueAt: f.dueAt,
      })),
      issueFlagsRaised: enrichment.issueFlagsRaised,
      volunteerInterestFlags: enrichment.volunteerInterestFlags,
    },
    recentAreaEvents: enrichment.recentAreaEvents,
  }
}
