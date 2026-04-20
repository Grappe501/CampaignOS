import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import type { CampaignProfile } from '../../hooks/useProfile'
import { useEventById } from '../../hooks/useCampaignEvents'
import { useEventOperationalTasks } from '../../hooks/useEventOperationalTasks'
import { useEventStaffingAssignments } from '../../hooks/useEventStaffingAssignments'
import type { CampaignCalendarEventRecord } from '../../lib/campaignCalendarArchitecture'
import { collectOperationsGapsForEvent } from '../../lib/campaignEventCoordinatorOperations'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  EVENT_RECORD_DETAIL_SECTION_DOM_IDS,
  campaignEventRecordPath,
  campaignEventRecordSectionPath,
  hasInvalidEventRecordDetailSectionSuffix,
  isAllowedEventRecordRouteParam,
  isUuidParam,
  parseEventRecordDetailSectionFromPathname,
} from '../../lib/campaignEventSystem'
import {
  CAMPAIGN_EVENT_TYPE_MATRIX,
  campaignEventTypeByKey,
  type CampaignEventTypeKey,
} from '../../lib/campaignEventTypeMatrix'
import {
  buildEventTaskInstances,
  getEventTypeConfig,
  getRequiredStageSlugsForEventType,
  groupConfigTasksByStage,
} from '../../lib/eventTaskTemplateConfig'
import {
  buildMobilizeEligibility,
  buildMobilizePublishPayload,
  buildMobilizeStatusSummary,
  eventMobilizeMetaFromRecord,
} from '../../lib/mobilizeFieldMapping'
import {
  evaluateMobilizePublishEligibility,
  mobilizeEligibilityInputFromRecord,
  type MobilizeEligibilityInput,
} from '../../lib/mobilizePublishEligibility'
import EventCalendarVisibilityCard from './event-detail/EventCalendarVisibilityCard'
import EventDetailHeaderCard from './event-detail/EventDetailHeaderCard'
import EventReadinessTimelineStrip from './command/EventReadinessTimelineStrip'
import EventDetailSectionNav from './event-detail/EventDetailSectionNav'
import EventFollowupCard from './event-detail/EventFollowupCard'
import EventHealthFlags from './event-detail/EventHealthFlags'
import EventJonesIntelligenceCard from './event-detail/EventJonesIntelligenceCard'
import EventLogisticsCard from './event-detail/EventLogisticsCard'
import EventPublishPipelineCard from './event-detail/EventPublishPipelineCard'
import EventReadinessCommandCard from './event-detail/EventReadinessCommandCard'
import EventRunOfShowCard from './event-detail/EventRunOfShowCard'
import EventTargetingAudienceCard from './event-detail/EventTargetingAudienceCard'
import EventMobilizeCard from './event-detail/EventMobilizeCard'
import EventOutcomesCard from './event-detail/EventOutcomesCard'
import EventOverviewCard from './event-detail/EventOverviewCard'
import EventStaffingCard from './event-detail/EventStaffingCard'
import EventStageTrackerCard from './event-detail/EventStageTrackerCard'
import EventTaskChecklistCard from './event-detail/EventTaskChecklistCard'

const TYPE_KEYS = CAMPAIGN_EVENT_TYPE_MATRIX.map((t) => t.key)

function parseTypeQuery(raw: string | null): CampaignEventTypeKey | null {
  if (!raw) return null
  return (TYPE_KEYS as readonly string[]).includes(raw) ? (raw as CampaignEventTypeKey) : null
}

function scaffoldEligibilityInput(type: CampaignEventTypeKey): MobilizeEligibilityInput {
  return {
    event_type: type,
    stage_status: 'draft',
    visibility_scope: 'internal_staff',
    title: null,
    start_at: null,
    venue_name: null,
    address_or_virtual: null,
    staffing_state: 'unstaffed',
  }
}

type RecordPatch = { eventId: string; patch: Partial<CampaignCalendarEventRecord> }

export default function EventRecordDeskContent({
  profile: _profile,
}: {
  profile: CampaignProfile | null
}) {
  void _profile
  const { eventId = '' } = useParams<{ eventId: string }>()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryType = parseTypeQuery(searchParams.get('type'))

  const paramOk = isAllowedEventRecordRouteParam(eventId)
  const isNew = eventId === CAMPAIGN_EVENT_NEW_RECORD_SLUG
  const isUuid = isUuidParam(eventId)

  const { event: fetchedEvent, loading: eventLoading, error: eventFetchError } = useEventById(
    paramOk && isUuid ? eventId : null,
  )
  const staffingAssignments = useEventStaffingAssignments(paramOk && isUuid ? eventId : null)

  const [pickedType, setPickedType] = useState<CampaignEventTypeKey | null>(null)
  const selectedType = queryType ?? pickedType ?? 'public_fair_festival'
  const [recordPatch, setRecordPatch] = useState<RecordPatch | null>(null)
  const [adhocTasks, setAdhocTasks] = useState<{ id: string; title: string }[]>([])

  const loadedRow = paramOk && isUuid ? fetchedEvent : null

  const activeDetailSection = useMemo(
    () => parseEventRecordDetailSectionFromPathname(location.pathname, eventId),
    [location.pathname, eventId],
  )

  const displayRecord = useMemo((): CampaignCalendarEventRecord | null => {
    if (!loadedRow) return loadedRow
    if (!recordPatch || recordPatch.eventId !== loadedRow.event_id) return loadedRow
    return { ...loadedRow, ...recordPatch.patch }
  }, [loadedRow, recordPatch])

  const effectiveType: CampaignEventTypeKey = useMemo(() => {
    if (displayRecord && (TYPE_KEYS as readonly string[]).includes(displayRecord.event_type)) {
      return displayRecord.event_type as CampaignEventTypeKey
    }
    return selectedType
  }, [displayRecord, selectedType])

  const {
    taskRows,
    completedTemplateSlugs,
    loading: tasksLoading,
    error: tasksError,
    toggleTemplateComplete,
  } = useEventOperationalTasks(
    paramOk && isUuid ? eventId : null,
    effectiveType,
    displayRecord?.start_at ?? null,
    Boolean(paramOk && isUuid && displayRecord && displayRecord.start_at),
  )

  const dbCriticalRatio = useMemo(() => {
    if (!taskRows.length) return null
    const critical = taskRows.filter((t) => t.is_critical && t.required)
    if (!critical.length) return 1
    const done = critical.filter((t) => t.status === 'completed' || t.status === 'skipped').length
    return done / critical.length
  }, [taskRows])

  useEffect(() => {
    if (!activeDetailSection) return
    const domId = EVENT_RECORD_DETAIL_SECTION_DOM_IDS[activeDetailSection]
    requestAnimationFrame(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [activeDetailSection, location.pathname])

  const typeConfig = useMemo(() => getEventTypeConfig(effectiveType), [effectiveType])
  const tasksByStage = useMemo(
    () => groupConfigTasksByStage(typeConfig.tasks),
    [typeConfig.tasks],
  )
  const requiredStageSlugs = useMemo(
    () => getRequiredStageSlugsForEventType(effectiveType),
    [effectiveType],
  )
  const typeDef = campaignEventTypeByKey(effectiveType)

  const taskInstances = useMemo(
    () =>
      displayRecord
        ? buildEventTaskInstances({
            event_id: displayRecord.event_id,
            start_at: displayRecord.start_at,
            event_type: effectiveType,
          })
        : null,
    [displayRecord, effectiveType],
  )

  const eligibilityInput = useMemo((): MobilizeEligibilityInput => {
    if (displayRecord) return mobilizeEligibilityInputFromRecord(displayRecord)
    return scaffoldEligibilityInput(selectedType)
  }, [displayRecord, selectedType])

  const eligibility = useMemo(
    () => evaluateMobilizePublishEligibility(eligibilityInput),
    [eligibilityInput],
  )

  const mobilizeContract = useMemo(() => {
    if (!displayRecord) return null
    return {
      extended: buildMobilizeEligibility(displayRecord),
      summary: buildMobilizeStatusSummary(displayRecord),
      meta: eventMobilizeMetaFromRecord(displayRecord),
      publishPayload: buildMobilizePublishPayload(displayRecord),
    }
  }, [displayRecord])

  const operationsGaps = useMemo(
    () =>
      displayRecord
        ? collectOperationsGapsForEvent(displayRecord, { staffingAssignments })
        : [],
    [displayRecord, staffingAssignments],
  )
  const staffingOnlyGaps = useMemo(
    () => operationsGaps.filter((g) => g.category === 'staffing'),
    [operationsGaps],
  )
  const logisticsAndHostGaps = useMemo(
    () => operationsGaps.filter((g) => ['logistics', 'host'].includes(g.category)),
    [operationsGaps],
  )
  const followGaps = useMemo(
    () => operationsGaps.filter((g) => ['followup', 'attendance'].includes(g.category)),
    [operationsGaps],
  )

  if (!paramOk) {
    return (
      <div className="event-coordinator-desk" id="event-record-detail">
        <p className="event-coordinator-desk__placeholder">
          This URL needs a valid event id (UUID) or <code>{CAMPAIGN_EVENT_NEW_RECORD_SLUG}</code> for
          the create scaffold.
        </p>
        <Link to="/events" className="event-coordinator-desk__back">
          ← Back to Event Coordinator Desk
        </Link>
      </div>
    )
  }

  if (hasInvalidEventRecordDetailSectionSuffix(location.pathname, eventId)) {
    return <Navigate to={campaignEventRecordPath(eventId)} replace />
  }

  if (isUuid && location.pathname === `/events/${eventId}`) {
    return <Navigate to={campaignEventRecordSectionPath(eventId, 'command')} replace />
  }

  const missingFixturePanel =
    isUuid && eventLoading ? (
      <div className="event-detail-not-found" role="status" aria-live="polite" id="event-detail-loading">
        <p className="event-detail-not-found__body">Loading event from Supabase…</p>
      </div>
    ) : isUuid && eventFetchError ? (
      <div className="event-detail-not-found" role="alert" id="event-detail-error">
        <h2 className="event-detail-not-found__title">Could not load this event</h2>
        <p className="event-detail-not-found__body">{eventFetchError.message}</p>
        <Link to="/events" className="event-detail-not-found__link">
          ← Back to Event Coordinator Desk
        </Link>
      </div>
    ) : isUuid && !eventLoading && !loadedRow ? (
      <div
        className="event-detail-not-found"
        role="alert"
        aria-live="polite"
        id="event-detail-not-found"
      >
        <h2 className="event-detail-not-found__title">No event in this campaign</h2>
        <p className="event-detail-not-found__body">
          This id is not in your campaign&apos;s events. Create an event from the coordinator desk or
          neighborhood hub, or verify you are signed into the right workspace.
        </p>
        <Link to="/events" className="event-detail-not-found__link">
          ← Back to Event Coordinator Desk
        </Link>
      </div>
    ) : null

  const headerTitle = isNew
    ? 'New event (scaffold)'
    : eventLoading && isUuid
      ? 'Loading…'
      : displayRecord?.title ?? 'Event details'
  const typeLabel = typeDef?.label ?? null

  const showOperationalBody = !isUuid || (!eventLoading && !!loadedRow && !eventFetchError)

  return (
    <div className="event-coordinator-desk" id="event-record-detail">
      <p className="event-detail-page__intro">
        Operational home for one event — sections use stable <code>id</code>s for Agent Jones and
        admin tooling. Section URLs (e.g. <code>/tasks</code>) deep-link for scheduling handoffs.
        Workflow tasks and readiness persist to Supabase; Mobilize publish and some edits remain staged
        where noted.
      </p>
      {missingFixturePanel}

      <EventDetailHeaderCard
        eventId={eventId}
        isNew={isNew}
        isUuid={isUuid}
        title={headerTitle}
        record={displayRecord}
        typeLabel={typeLabel}
      />

      <EventReadinessTimelineStrip record={displayRecord} />

      <EventDetailSectionNav eventId={eventId} />

      {isUuid ? (
        <p className="event-detail-page__intro" style={{ marginTop: '-0.5rem' }}>
          <Link to={`/ops/signup-sheets?eventId=${encodeURIComponent(eventId)}`}>
            Signup sheet ingestion for this event →
          </Link>
        </p>
      ) : null}

      {showOperationalBody ? (
        <>
          <EventHealthFlags
            eligibility={eligibility}
            mobilizePublishReadyOverride={
              mobilizeContract != null ? mobilizeContract.extended.isEligible : null
            }
            staffingGaps={operationsGaps.filter((g) =>
              ['staffing', 'logistics', 'host'].includes(g.category),
            )}
            followGaps={followGaps}
            stageStatus={displayRecord?.stage_status ?? null}
          />

          <EventReadinessCommandCard record={displayRecord} effectiveType={effectiveType} />

          <EventRunOfShowCard />

          <EventTargetingAudienceCard record={displayRecord} effectiveType={effectiveType} />

          <EventJonesIntelligenceCard
            record={displayRecord}
            effectiveType={effectiveType}
            staffingAssignments={staffingAssignments}
            dbCriticalTaskRatio={dbCriticalRatio}
          />

          <EventPublishPipelineCard record={displayRecord} />

          <EventOverviewCard
            record={displayRecord}
            typeDef={typeDef}
            loadedRow={displayRecord}
            selectedType={selectedType}
            onTypeChange={setPickedType}
          />

          <EventStageTrackerCard
            record={displayRecord}
            requiredStageSlugs={requiredStageSlugs}
            typeDef={typeDef}
            currentLifecycle={displayRecord?.stage_status ?? null}
          />

          <EventTaskChecklistCard
            effectiveType={effectiveType}
            tasksByStage={tasksByStage}
            instances={taskInstances}
            completedTemplateSlugs={completedTemplateSlugs}
            onToggleTemplateComplete={(slug) => {
              const done = completedTemplateSlugs.has(slug)
              void toggleTemplateComplete(slug, !done)
            }}
            adhocTasks={adhocTasks}
            onAddAdhocTask={(title) => {
              const id =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                  ? crypto.randomUUID()
                  : `adhoc-${Date.now()}`
              setAdhocTasks((prev) => [...prev, { id, title }])
            }}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
          />

          <EventStaffingCard
            record={displayRecord}
            effectiveType={effectiveType}
            staffingAssignments={staffingAssignments}
            staffingOnlyGaps={staffingOnlyGaps}
          />

          <EventLogisticsCard record={displayRecord} logisticsAndHostGaps={logisticsAndHostGaps} />

          <EventCalendarVisibilityCard record={displayRecord} eligibility={eligibility} />

          <EventMobilizeCard
            record={displayRecord}
            typeDef={typeDef}
            eligibility={eligibility}
            mobilizeContract={mobilizeContract}
            onApplyRecordPatch={(patch) => {
              if (!loadedRow) return
              setRecordPatch((prev) => {
                if (prev?.eventId !== loadedRow.event_id) {
                  return { eventId: loadedRow.event_id, patch }
                }
                return { eventId: loadedRow.event_id, patch: { ...prev.patch, ...patch } }
              })
            }}
          />

          <EventOutcomesCard record={displayRecord} />

          <EventFollowupCard record={displayRecord} followGaps={followGaps} />
        </>
      ) : null}

      <p className="event-coordinator-desk__foot">
        <Link to="/events">← Event Coordinator Desk</Link>
      </p>
    </div>
  )
}
