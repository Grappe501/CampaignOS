import { useEffect, useMemo, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import { calculateEventReadiness } from '../../../lib/campaignEventDomainServices'
import type { EventOperationalStatus } from '../../../lib/campaignEventDomain'
import {
  buildEventIntelligencePacketFromCalendarRow,
  buildPostEventDebrief,
  buildPreEventBrief,
  type EventIntelligenceEnrichment,
} from '../../../lib/eventIntelligenceJones'
import { createWorkflowForCalendarRecord, getWorkflowProgress } from '../../../lib/eventWorkflowEngine'
import { evaluateStaffingMatrix } from '../../../lib/eventStaffingMatrix'
import type { StaffingAssignmentLike } from '../../../lib/eventStaffingMatrix'
import {
  fetchEventAttendanceAggregates,
  fetchEventFollowups,
  fetchRecentEventHistoryForArea,
} from '../../../lib/campaignEventsFromSupabase'

export default function EventJonesIntelligenceCard({
  record,
  effectiveType,
  staffingAssignments,
  dbCriticalTaskRatio,
}: {
  record: CampaignCalendarEventRecord | null
  effectiveType: CampaignEventTypeKey
  staffingAssignments: readonly StaffingAssignmentLike[]
  /** When workflow tasks are loaded from Supabase, prefer this ratio over template-only workflow %. */
  dbCriticalTaskRatio: number | null
}) {
  const [enrichment, setEnrichment] = useState<EventIntelligenceEnrichment | null>(null)
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null)

  useEffect(() => {
    if (!record?.event_id) {
      setEnrichment(null)
      return
    }
    let cancelled = false
    setEnrichmentLoading(true)
    setEnrichmentError(null)
    void (async () => {
      try {
        const [agg, rawFollowups, recentAreaEvents] = await Promise.all([
          fetchEventAttendanceAggregates(record.event_id),
          fetchEventFollowups(record.event_id).catch(() => [] as Record<string, unknown>[]),
          fetchRecentEventHistoryForArea(
            record.county_id,
            record.precinct_id,
            record.event_id,
            5,
          ),
        ])
        if (cancelled) return
        const followups = (rawFollowups as { followup_type?: string; status?: string; due_at?: string | null }[]).map(
          (f) => ({
            followupType: String(f.followup_type ?? 'unknown'),
            status: String(f.status ?? 'pending'),
            dueAt: f.due_at != null ? String(f.due_at) : null,
          }),
        )
        setEnrichment({
          attendanceCount: agg.totalCount,
          followups,
          issueFlagsRaised: agg.issueFlagsRaised,
          volunteerInterestFlags: agg.volunteerInterestFlags,
          recentAreaEvents: [...recentAreaEvents],
        })
      } catch (e) {
        if (!cancelled) {
          setEnrichmentError(e instanceof Error ? e.message : 'Failed to load field signals')
          setEnrichment(null)
        }
      } finally {
        if (!cancelled) setEnrichmentLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [record?.event_id, record?.county_id, record?.precinct_id])

  const readinessAndPacket = useMemo(() => {
    if (!record) return null
    const run = createWorkflowForCalendarRecord(record, effectiveType)
    const wf = getWorkflowProgress(run)
    const assigns = staffingAssignments
    const matrix = evaluateStaffingMatrix(effectiveType, [...assigns])
    const required = matrix.filter((m) => m.template.required)
    const staffed = required.filter((m) => m.satisfied).length
    const staffingRatio = required.length ? staffed / required.length : 1

    const completedCriticalTaskRatio =
      dbCriticalTaskRatio != null ? dbCriticalTaskRatio : wf.percent / 100

    const op: EventOperationalStatus =
      (record.operational_status as EventOperationalStatus) ?? 'scheduled'

    const computed = calculateEventReadiness({
      operationalStatus: op,
      completedCriticalTaskRatio,
      staffingCoverageRatio: staffingRatio,
      rsvpProgressRatio: null,
      venueConfirmed: Boolean(record.venue_name || record.address_or_virtual),
      materialsConfirmed: record.stage_status !== 'draft',
      dataCaptureReady: record.staffing_state !== 'unstaffed',
      followupOwnerAssigned: Boolean(record.followup_state && record.followup_state !== 'none'),
    })

    const readiness = {
      readinessScore:
        record.readiness_score != null && !Number.isNaN(Number(record.readiness_score))
          ? Math.round(Number(record.readiness_score))
          : computed.readinessScore,
      blockers: computed.blockers,
    }

    const packet = buildEventIntelligencePacketFromCalendarRow(record, readiness, enrichment)
    const pre = buildPreEventBrief(record, effectiveType, null, {
      recentAreaEvents: enrichment?.recentAreaEvents,
    })
    const post = buildPostEventDebrief(record, packet)
    return { pre, post, packet }
  }, [
    record,
    effectiveType,
    staffingAssignments,
    dbCriticalTaskRatio,
    enrichment,
  ])

  if (!record) {
    return (
      <section className="event-panel" id="event-jones-intel" aria-labelledby="jones-heading">
        <h2 id="jones-heading" className="event-panel__title">
          Agent Jones intelligence
        </h2>
        <p className="event-panel__placeholder">Structured briefing/debrief appears when a row is loaded.</p>
      </section>
    )
  }

  if (!readinessAndPacket) return null

  const { pre, post, packet } = readinessAndPacket

  return (
    <section className="event-panel" id="event-jones-intel" aria-labelledby="jones-heading">
      <h2 id="jones-heading" className="event-panel__title">
        Agent Jones — pre / post
      </h2>
      {enrichmentLoading ? (
        <p className="event-coordinator-desk__meta" role="status" aria-live="polite">
          Loading attendance and follow-up context…
        </p>
      ) : null}
      {enrichmentError ? (
        <p className="event-coordinator-desk__placeholder" role="alert">
          Field signals unavailable: {enrichmentError}. Briefing still uses event row and workflow.
        </p>
      ) : null}
      <div className="event-panel__stack">
        <div>
          <h3 className="event-panel__h3">Pre-event brief</h3>
          <p className="event-panel__body">{pre.geographyLine}</p>
          <ul className="event-panel__list">
            {pre.talkingPoints.slice(0, 8).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="event-panel__h3">Post-event debrief (heuristic)</h3>
          <p className="event-panel__body">{post.whatWeLearned}</p>
          <p className="event-panel__body">
            <strong>Priority:</strong> {post.priorityFollowUp}
          </p>
          <p className="event-panel__body">{post.whatHappened}</p>
        </div>
        <details className="event-coordinator-desk__details">
          <summary>Intelligence packet (JSON)</summary>
          <pre className="neighborhood-json">{JSON.stringify(packet, null, 2)}</pre>
        </details>
      </div>
    </section>
  )
}
