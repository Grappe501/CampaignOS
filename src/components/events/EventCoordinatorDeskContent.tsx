import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { CampaignProfile } from '../../hooks/useProfile'
import { getCoordinatorEventQueueSource } from '../../lib/campaignCalendarQueueSource'
import { collectOperationsGapsForDesk } from '../../lib/campaignEventCoordinatorOperations'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  CAMPAIGN_EVENT_PIPELINE_STATUSES,
  campaignEventRecordPath,
} from '../../lib/campaignEventSystem'
import { CAMPAIGN_EVENT_TYPE_MATRIX } from '../../lib/campaignEventTypeMatrix'
import CampaignCalendarArchitecturePanel from './CampaignCalendarArchitecturePanel'
import CampaignSegmentedCalendarPanel from './CampaignSegmentedCalendarPanel'
import EventPermissionsMatrixPanel from './EventPermissionsMatrixPanel'
import EventTypeMatrixSection from './EventTypeMatrixSection'
import MobilizeIntegrationPanel from './MobilizeIntegrationPanel'
import MobilizePromotionQueueSection from './MobilizePromotionQueueSection'

export default function EventCoordinatorDeskContent({
  profile,
}: {
  profile: CampaignProfile | null
}) {
  const location = useLocation()
  const calendarView = location.pathname.endsWith('/calendar')
  const displayName =
    profile?.display_name?.trim() ||
    profile?.email?.split('@')[0]?.trim() ||
    'Coordinator'

  const queueEvents = useMemo(() => getCoordinatorEventQueueSource(), [])
  const coordinatorPressure = useMemo(
    () => collectOperationsGapsForDesk(queueEvents),
    [queueEvents],
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

  return (
    <div
      className="event-coordinator-desk"
      id="event-coordinator-desk"
      data-calendar-view={calendarView ? 'true' : 'false'}
    >
      <header className="event-coordinator-desk__command" id="event-coordinator-command">
        <div className="event-coordinator-desk__command-top">
          <div>
            <p className="event-coordinator-desk__eyebrow">Event operations</p>
            <h1 className="event-coordinator-desk__title">Event Coordinator Desk</h1>
            <p className="event-coordinator-desk__lede">
              Hello, {displayName}. This desk will centralize intake, approvals, calendar
              publishing, staffing, Mobilize sync, and follow-up — wired to live data in upcoming
              iterations.
            </p>
          </div>
          <div className="event-coordinator-desk__week-summary" role="status">
            <p className="event-coordinator-desk__week-k">This week · next 14 days</p>
            <p className="event-coordinator-desk__week-v">Summary will populate from campaign events.</p>
          </div>
        </div>
        <div className="event-coordinator-desk__quick-actions" aria-label="Quick actions">
          <button type="button" className="btn-touch" disabled title="Coming soon">
            Create event
          </button>
          <button type="button" className="btn-touch" disabled title="Coming soon">
            Review requests
          </button>
          <Link to="/events/calendar" className="btn-touch">
            Open calendar view
          </Link>
          <Link
            to={campaignEventRecordPath(CAMPAIGN_EVENT_NEW_RECORD_SLUG)}
            className="btn-touch"
          >
            New event record
          </Link>
          <button type="button" className="btn-touch" disabled title="Coming soon">
            Publish to Mobilize
          </button>
        </div>
      </header>

      {calendarView ? (
        <section className="event-coordinator-desk__section event-coordinator-desk__section--flush">
          <CampaignCalendarArchitecturePanel variant="full" />
          <MobilizeIntegrationPanel variant="compact" />
          <section
            className="event-coordinator-desk__calendar-views"
            aria-labelledby="cal-view-modes-heading"
          >
            <h2 id="cal-view-modes-heading" className="event-coordinator-desk__h2">
              Calendar views (one engine)
            </h2>
            <p className="event-coordinator-desk__placeholder">
              All modes read the same <code>CampaignCalendarEventRecord</code> rows; filters differ
              by visibility, function, geo, owner, and role presets — no forked calendars.
            </p>
            <ul className="event-coordinator-desk__view-modes">
              <li>
                <strong>Month / week grid.</strong> Coordinator layout with segment toggles and
                staffing/Mobilize overlays (roadmap).
              </li>
              <li>
                <strong>Agenda list.</strong> Chronological list with chips for audience, function,
                and county/precinct scope.
              </li>
              <li>
                <strong>Upcoming strip.</strong> 3–7 items for dashboards and mobile; permission and
                geo scoped.
              </li>
            </ul>
          </section>
          <section className="event-coordinator-desk__section event-coordinator-desk__section--flush">
            <h2 className="event-coordinator-desk__h2">Segmented campaign calendar</h2>
            <p className="event-coordinator-desk__placeholder">
              One event source — visibility, inferred function/geo, lifecycle, and owner filters.
              Development builds include sample rows; production stays empty until Supabase connects.
            </p>
            <CampaignSegmentedCalendarPanel />
          </section>
          <Link to="/events" className="event-coordinator-desk__back">
            ← Back to event desk overview
          </Link>
        </section>
      ) : null}

      <section className="event-coordinator-desk__section" aria-labelledby="ec-attn-heading">
        <h2 id="ec-attn-heading" className="event-coordinator-desk__h2">
          Needs attention now
        </h2>
        <ul className="event-coordinator-desk__needs">
          <li>Pending approvals</li>
          <li>Events missing venue or time</li>
          <li>Staffing gaps</li>
          <li>Mobilize publish failures / unsynced events</li>
          <li>Post-event follow-up overdue</li>
        </ul>
        <p className="event-coordinator-desk__placeholder">
          No live aggregates yet — this list is the coordinator attention model. Counts and queues
          will connect to Supabase when the events table ships.
        </p>
      </section>

      {!calendarView ? (
        <section className="event-coordinator-desk__section" aria-labelledby="ec-pipeline-heading">
          <h2 id="ec-pipeline-heading" className="event-coordinator-desk__h2">
            Event pipeline summary
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            No events loaded — pipeline buckets and drag-board columns will bind to the same status
            values your campaign uses end-to-end.
          </p>
          <p className="event-coordinator-desk__meta">
            Coordinator statuses (reference):{' '}
            {CAMPAIGN_EVENT_PIPELINE_STATUSES.join(' · ')}
          </p>
        </section>
      ) : null}

      {!calendarView ? (
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
      ) : null}

      {!calendarView ? (
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
      ) : null}

      {!calendarView ? (
        <section className="event-coordinator-desk__section" aria-labelledby="ec-followup-heading">
          <h2 id="ec-followup-heading" className="event-coordinator-desk__h2">
            Follow-up &amp; attendance reconciliation
          </h2>
          <p className="event-coordinator-desk__placeholder" role="status">
            Post-event attendance, donor/supporter/volunteer follow-up, and debrief ownership use{' '}
            <code>followup_state</code> plus end time on each row. Heuristics flag past events missing
            follow-up.
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
      ) : null}

      {!calendarView ? <MobilizePromotionQueueSection events={queueEvents} /> : null}

      <section className="event-coordinator-desk__section" aria-labelledby="ec-rail-heading">
        <h2 id="ec-rail-heading" className="event-coordinator-desk__h2">
          Upcoming event pressure (next 7 days)
        </h2>
        <p className="event-coordinator-desk__placeholder">
          Urgency segments and highlights for high-priority public and finance events will render
          here.
        </p>
      </section>

      {!calendarView ? (
        <section className="event-coordinator-desk__section" aria-labelledby="ec-snap-heading">
          <h2 id="ec-snap-heading" className="event-coordinator-desk__h2">
            Calendar snapshot
          </h2>
          <p className="event-coordinator-desk__placeholder">
            Campaign-wide and county/region filters — use{' '}
            <Link to="/events/calendar">calendar view</Link> for segmentation reference and roadmap
            widgets.
          </p>
          <details className="event-coordinator-desk__details">
            <summary>Campaign calendar architecture (single engine)</summary>
            <CampaignCalendarArchitecturePanel variant="compact" />
          </details>
        </section>
      ) : null}

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
            {calendarView ? (
              <>
                {' '}
                (or open the <Link to="/events">overview</Link> for the full panel).
              </>
            ) : null}
            .
          </p>
        </details>
      </section>

      {!calendarView ? (
        <>
          <EventPermissionsMatrixPanel variant="full" />
          <EventTypeMatrixSection />
          <MobilizeIntegrationPanel variant="full" />
        </>
      ) : null}

      <p className="event-coordinator-desk__foot">
        <Link to="/coordinator">Supervised missions &amp; assignments</Link>
        {' · '}
        <Link to="/admin">Command center</Link>
      </p>
    </div>
  )
}
