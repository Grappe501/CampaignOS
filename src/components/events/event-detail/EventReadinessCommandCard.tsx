import { useMemo } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import { calculateEventReadiness } from '../../../lib/campaignEventDomainServices'
import { createWorkflowForCalendarRecord, getWorkflowProgress, getBlockingIssues } from '../../../lib/eventWorkflowEngine'
import { evaluateStaffingMatrix } from '../../../lib/eventStaffingMatrix'
import { getDevStaffingAssignmentsForEvent } from '../../../lib/campaignEventStaffingDevFixtures'

export default function EventReadinessCommandCard({
  record,
  effectiveType,
}: {
  record: CampaignCalendarEventRecord | null
  effectiveType: CampaignEventTypeKey
}) {
  const summary = useMemo(() => {
    if (!record) return null
    const run = createWorkflowForCalendarRecord(record, effectiveType)
    const wf = getWorkflowProgress(run)
    const wfBlockers = getBlockingIssues(run)
    const assigns = getDevStaffingAssignmentsForEvent(record.event_id)
    const matrix = evaluateStaffingMatrix(effectiveType, assigns)
    const required = matrix.filter((m) => m.template.required)
    const staffed = required.filter((m) => m.satisfied).length
    const staffingRatio = required.length ? staffed / required.length : 1

    const readiness = calculateEventReadiness({
      operationalStatus: 'scheduled',
      completedCriticalTaskRatio: wf.percent / 100,
      staffingCoverageRatio: staffingRatio,
      rsvpProgressRatio: null,
      venueConfirmed: Boolean(record.venue_name || record.address_or_virtual),
      materialsConfirmed: record.stage_status !== 'draft',
      dataCaptureReady: record.staffing_state !== 'unstaffed',
      followupOwnerAssigned: Boolean(record.followup_state && record.followup_state !== 'none'),
    })

    const missingRoles = required.filter((m) => !m.satisfied).map((m) => m.label)

    return {
      readiness,
      wfPercent: wf.percent,
      wfBlockers,
      missingRoles,
    }
  }, [record, effectiveType])

  if (!record || !summary) {
    return (
      <section className="event-panel" id="event-record-command" aria-labelledby="readiness-cmd-heading">
        <h2 id="readiness-cmd-heading" className="event-panel__title">
          Readiness command
        </h2>
        <p className="event-panel__placeholder">Load an event record to score readiness.</p>
      </section>
    )
  }

  return (
    <section className="event-panel" id="event-record-command" aria-labelledby="readiness-cmd-heading">
      <h2 id="readiness-cmd-heading" className="event-panel__title">
        Readiness command
      </h2>
      <p className="event-panel__kpi">
        <strong>{summary.readiness.readinessScore}%</strong> ready · workflow {summary.wfPercent}% ·{' '}
        {summary.readiness.blockers.length} blocker(s)
      </p>
      <ul className="event-panel__list">
        {summary.readiness.blockers.map((b) => (
          <li key={b}>{b}</li>
        ))}
        {summary.wfBlockers.map((b) => (
          <li key={`wf-${b}`}>{b}</li>
        ))}
      </ul>
      {summary.missingRoles.length > 0 ? (
        <p className="event-panel__warn">
          Missing roles: {summary.missingRoles.join(', ')}
        </p>
      ) : null}
    </section>
  )
}
