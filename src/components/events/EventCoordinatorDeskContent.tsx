import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMobilizePromotionSummary } from '../../hooks/useEventSummaries'
import type { CampaignProfile } from '../../hooks/useProfile'
import { useCampaignEventsContext } from '../../context/CampaignEventsContext'
import { useCampaignStaffingBulk } from '../../hooks/useCampaignStaffingBulk'
import { collectOperationsGapsForDesk } from '../../lib/campaignEventCoordinatorOperations'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  CAMPAIGN_EVENT_PIPELINE_STATUSES,
  campaignEventRecordPath,
} from '../../lib/campaignEventSystem'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../lib/campaignEventTypeMatrix'
import { mapProfileRoleToCalendarWidgetPersona } from '../../lib/eventSummaryEngine'
import CampaignCalendarArchitecturePanel from './CampaignCalendarArchitecturePanel'
import CampaignSegmentedCalendarPanel from './CampaignSegmentedCalendarPanel'
import EventPermissionsMatrixPanel from './EventPermissionsMatrixPanel'
import EventTypeMatrixSection from './EventTypeMatrixSection'
import MobilizeIntegrationPanel from './MobilizeIntegrationPanel'
import MobilizePromotionQueueSection from './MobilizePromotionQueueSection'
import PostEventAttentionQueueSection from './PostEventAttentionQueueSection'
import CalendarSnapshotCard from './widgets/CalendarSnapshotCard'
import CandidateScheduleFocusCard from './widgets/CandidateScheduleFocusCard'
import EventPressureSummaryCard from './widgets/EventPressureSummaryCard'
import MobilizeQueueSummaryCard from './widgets/MobilizeQueueSummaryCard'
import UpcomingCampaignStrip from './widgets/UpcomingCampaignStrip'
import EventApprovalQueue from './command/EventApprovalQueue'
import TodayCommandPanel from './command/TodayCommandPanel'
import { canAccessLeadershipBriefing } from '../../lib/leadershipBriefingAccess'
import { buildTodayCommandSnapshot } from '../../lib/todayCommandService'
import { buildRapidActionContextFromEvent } from '../../lib/rapidActionContextSelectors'
import RapidActionsBar from './command/RapidActionsBar'
import StaffingCoverageHeatmap from './command/StaffingCoverageHeatmap'
import VolunteerLoadBalancerPanel from './command/VolunteerLoadBalancerPanel'

export default function EventCoordinatorDeskContent({
  profile,
}: {
  profile: CampaignProfile | null
}) {
  const displayName =
    profile?.display_name?.trim() ||
    profile?.email?.split('@')[0]?.trim() ||
    'Coordinator'

  const { events: queueEvents, refetch: refetchEvents } = useCampaignEventsContext()
  const eventIds = useMemo(() => queueEvents.map((e) => e.event_id), [queueEvents])
  const { assignmentMap: deskAssignmentMap } = useCampaignStaffingBulk(eventIds)

  const coordinatorPressure = useMemo(
    () =>
      collectOperationsGapsForDesk(queueEvents, (e) => deskAssignmentMap.get(e.event_id)),
    [queueEvents, deskAssignmentMap],
  )
  const staffingDeskGaps = useMemo(
    () =>
      coordinatorPressure.filter((g) =>
        ['staffing', 'logistics', 'host'].includes(g.category),
      ),
    [coordinatorPressure],
  )
  const followUpDeskGaps = useMemo(
    () =>
      coordinatorPressure.filter((g) => ['followup', 'attendance'].includes(g.category)),
    [coordinatorPressure],
  )

  const deskRapidContext = useMemo(() => {
    const first =
      staffingDeskGaps[0]?.event_id != null
        ? queueEvents.find((e) => e.event_id === staffingDeskGaps[0]!.event_id) ?? queueEvents[0] ?? null
        : queueEvents[0] ?? null
    return buildRapidActionContextFromEvent('events_dashboard', first, {
      issue_summary: staffingDeskGaps[0]?.message ?? null,
    })
  }, [queueEvents, staffingDeskGaps])

  const calendarPersona = mapProfileRoleToCalendarWidgetPersona(profile?.primary_role)
  const mobilizePromotion = useMobilizePromotionSummary(calendarPersona)

  const deskSnapshot = useMemo(() => buildTodayCommandSnapshot(queueEvents), [queueEvents])

  return (
    <div className="event-coordinator-desk" id="event-coordinator-desk">
      <header className="event-coordinator-desk__command" id="event-coordinator-command">
        <div className="event-coordinator-desk__command-top">
          <div>
            <p className="event-coordinator-desk__eyebrow">Event operations</p>
            <h1 className="event-coordinator-desk__title">Event Coordinator Desk</h1>
            <p className="event-coordinator-desk__lede">
              Hello, {displayName}. Below, your campaign event list powers the command snapshot,
              approval queue, and calendar widgets in one place.
            </p>
          </div>
          <div className="event-coordinator-desk__week-summary" role="status">
            <p className="event-coordinator-desk__week-k">Command overview</p>
            <p className="event-coordinator-desk__week-v">
              {deskSnapshot.empty ? (
                <>No events loaded yet.</>
              ) : (
                <>
                  Today: <strong>{deskSnapshot.digest.eventsTodayCount}</strong>
                  {' · '}
                  Next 72h (needs attention): <strong>{deskSnapshot.digest.eventsNext72hCount}</strong>
                  {' · '}
                  Critical: <strong>{deskSnapshot.digest.criticalIssuesCount}</strong>
                  {' · '}
                  Approvals: <strong>{deskSnapshot.digest.pendingApprovalsCount}</strong>
                  {' · '}
                  Comms (local): <strong>{deskSnapshot.digest.commsOpenSteps}</strong> open steps ·{' '}
                  <strong>{deskSnapshot.digest.commsEventsMissingWorkspace}</strong> without workspace ·{' '}
                  <strong>{deskSnapshot.digest.commsRecapIncomplete}</strong> recap gaps · Field:{' '}
                  <strong>{deskSnapshot.digest.dayOfOpenFieldIssues}</strong> open issues ·{' '}
                  <strong>{deskSnapshot.digest.dayOfClosureIncompleteEvents}</strong> closure incomplete
                </>
              )}
            </p>
          </div>
        </div>
        <div className="event-coordinator-desk__quick-actions" aria-label="Quick actions">
          <Link to="/events/war-room" className="btn-touch">
            War room (multi-event)
          </Link>
          {canAccessLeadershipBriefing(profile?.primary_role) ? (
            <Link to="/events/leadership" className="btn-touch">
              Executive briefing
            </Link>
          ) : null}
          <Link to="/events/county-ops" className="btn-touch">
            County command center
          </Link>
          <Link to="/events/neighborhood" className="btn-touch">
            Neighborhood activation
          </Link>
          <Link to="/events/analytics" className="btn-touch">
            Event analytics
          </Link>
          <Link
            to={campaignEventRecordPath(CAMPAIGN_EVENT_NEW_RECORD_SLUG)}
            className="btn-touch"
          >
            Create event
          </Link>
          <Link to="/events/review-requests" className="btn-touch">
            Review requests
          </Link>
          <Link to="/events/calendar" className="btn-touch">
            Calendar
          </Link>
          <Link to="/ops/signup-sheets" className="btn-touch">
            Signup sheets
          </Link>
          <Link to="/events/promotion" className="btn-touch">
            Publish to Mobilize
          </Link>
        </div>
      </header>

      <RapidActionsBar
        context={deskRapidContext}
        profile={profile}
        operationalEvent={
          deskRapidContext.event_id
            ? queueEvents.find((e) => e.event_id === deskRapidContext.event_id) ?? null
            : null
        }
        campaignEvents={queueEvents}
        assignmentMap={deskAssignmentMap}
        onAfterAction={() => void refetchEvents()}
      />
      <StaffingCoverageHeatmap events={queueEvents} assignmentMap={deskAssignmentMap} />
      <VolunteerLoadBalancerPanel events={queueEvents} assignmentMap={deskAssignmentMap} />

      <TodayCommandPanel events={queueEvents} assignmentMap={deskAssignmentMap} />

      <EventApprovalQueue events={queueEvents} profile={profile} onRefetch={() => void refetchEvents()} />

      <section className="event-coordinator-desk__section" aria-labelledby="ec-attn-heading">
        <h2 id="ec-attn-heading" className="event-coordinator-desk__h2">
          What to open first
        </h2>
        <p className="event-coordinator-desk__meta" role="navigation">
          <strong>
            <a href="#today-command-heading">Today&apos;s command panel</a>
          </strong>{' '}
          for timing, health, and prioritized issues.{' '}
          <strong>
            <a href="#event-approval-queue-heading">Approval queue</a>
          </strong>{' '}
          for volunteer or neighborhood requests. Mobilize:{' '}
          <a href="#mobilize-queue-summary-card">{mobilizePromotion.summary.attentionCount} need attention</a>
          {' — '}
          <a href="#mobilize-promotion-queue">promotion queue</a> for the full list.
        </p>
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-pipeline-heading">
          <h2 id="ec-pipeline-heading" className="event-coordinator-desk__h2">
            Event pipeline summary
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            Pipeline buckets and drag-board columns will bind to the same status values your campaign
            uses end-to-end. Development fixtures populate the queue; production waits on Supabase.
          </p>
          <p className="event-coordinator-desk__meta">
            Coordinator statuses (reference):{' '}
            {CAMPAIGN_EVENT_PIPELINE_STATUSES.join(' · ')}
          </p>
        </section>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-workload-heading">
          <h2 id="ec-workload-heading" className="event-coordinator-desk__h2">
            Event type workload
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            Volume and risk by type will appear here (counts, overdue tasks, Mobilize eligibility).
            Below is the configured type catalog — not live data.
          </p>
          <ul className="event-coordinator-desk__workload-types">
            {CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => (
              <li key={t.key}>
                <span className="event-coordinator-desk__workload-label">{t.label}</span>
                <span className="event-coordinator-desk__workload-count" aria-hidden>
                  —
                </span>
                <span className="sr-only">No count yet</span>
              </li>
            ))}
          </ul>
          <p className="event-coordinator-desk__meta">
            Full paths, tasks, and Mobilize hints: see the matrix section at the bottom of this desk.
          </p>
        </section>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-staffing-heading">
          <h2 id="ec-staffing-heading" className="event-coordinator-desk__h2">
            Staffing &amp; logistics pressure
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            Heuristic gaps from the shared event row (staffing state, venue placeholder, host ids for
            house parties). Production will merge task-level staffing when that table exists.
          </p>
          {staffingDeskGaps.length === 0 ? (
            <p className="event-coordinator-desk__meta">No gaps detected in the current source list.</p>
          ) : (
            <ul className="event-coordinator-desk__pressure-list">
              {staffingDeskGaps.map((g) => (
                <li key={`${g.event_id}-${g.message}`}>
                  <span
                    className={
                      g.severity === 'critical'
                        ? 'event-coordinator-desk__pressure-sev event-coordinator-desk__pressure-sev--crit'
                        : 'event-coordinator-desk__pressure-sev'
                    }
                  >
                    {g.severity}
                  </span>{' '}
                  <Link to={campaignEventRecordPath(g.event_id)}>{g.title}</Link>
                  {' — '}
                  {g.message}
                </li>
              ))}
            </ul>
          )}
        </section>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-followup-heading">
          <h2 id="ec-followup-heading" className="event-coordinator-desk__h2">
            Follow-up &amp; attendance reconciliation
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            Post-event attendance, donor/supporter/volunteer follow-up, and debrief ownership use{' '}
            <code>followup_state</code> plus end time on each row. The{' '}
            <a href="#event-coordinator-postevent-queue">post-event queue</a> lists ended events still
            short of <code>complete</code> (persona-scoped).
          </p>
          {followUpDeskGaps.length === 0 ? (
            <p className="event-coordinator-desk__meta">No follow-up gaps in the current source list.</p>
          ) : (
            <ul className="event-coordinator-desk__pressure-list">
              {followUpDeskGaps.map((g) => (
                <li key={`${g.event_id}-${g.message}`}>
                  <span className="event-coordinator-desk__pressure-sev">{g.category}</span>{' '}
                  <Link to={campaignEventRecordPath(g.event_id)}>{g.title}</Link>
                  {' — '}
                  {g.message}
                </li>
              ))}
            </ul>
          )}
        </section>

      <MobilizePromotionQueueSection events={queueEvents} />

      <PostEventAttentionQueueSection persona={calendarPersona} />

      <div className="ec-desk-widgets" id="event-desk-leadership-widgets">
        <UpcomingCampaignStrip
          persona={calendarPersona}
          limit={7}
          title="Upcoming (next 7)"
          subtitle="Shared queue — open the full calendar for filters and month view."
        />
        <EventPressureSummaryCard persona={calendarPersona} />
        <MobilizeQueueSummaryCard events={queueEvents} />
        <CalendarSnapshotCard persona={calendarPersona} windowDays={14} />
        <CandidateScheduleFocusCard persona={calendarPersona} />
      </div>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-snap-heading">
        <h2 id="ec-snap-heading" className="event-coordinator-desk__h2">
          Calendar architecture reference
        </h2>
        <p className="event-coordinator-desk__placeholder">
          Use <Link to="/events/calendar">Event calendar &amp; agenda</Link> for the full filtered
          shell. This panel stays as a compact architecture reminder.
        </p>
        <details className="event-coordinator-desk__details">
          <summary>Campaign calendar architecture (single engine)</summary>
          <CampaignCalendarArchitecturePanel variant="compact" />
        </details>
      </section>

      <section className="event-coordinator-desk__section event-coordinator-desk__section--flush">
        <h2 className="event-coordinator-desk__h2">Segmented calendar (demo)</h2>
        <p className="event-coordinator-desk__placeholder">
          Same engine as <Link to="/events/calendar">/events/calendar</Link> — segment toggles for
          desk walkthroughs.
        </p>
        <CampaignSegmentedCalendarPanel />
      </section>

      <section className="event-coordinator-desk__section" aria-labelledby="ec-core-heading">
        <h2 id="ec-core-heading" className="event-coordinator-desk__h2">
          Queues (next wiring)
        </h2>
        <details className="event-coordinator-desk__details">
          <summary>Intake &amp; approval</summary>
          <p className="event-coordinator-desk__placeholder">
            New requests, edits, drafts, volunteer-hosted submissions, and owners — production queues
            hook to the same pipeline statuses as the summary above.
          </p>
        </details>
        <details className="event-coordinator-desk__details">
          <summary>Mobilize promotion queue</summary>
          <p className="event-coordinator-desk__placeholder">
            See <a href="#mobilize-promotion-queue">Mobilize promotion queue</a> above. Posture and
            phases:{' '}
            <a href="#mobilize-plan-heading">Mobilize integration</a>
            .
          </p>
        </details>
      </section>

      <EventPermissionsMatrixPanel variant="full" />
      <EventTypeMatrixSection />
      <MobilizeIntegrationPanel variant="full" />

      <p className="event-coordinator-desk__foot">
        <Link to="/coordinator">Supervised missions &amp; assignments</Link>
        {' · '}
        <Link to="/admin">Command center</Link>
      </p>
    </div>
  )
}
