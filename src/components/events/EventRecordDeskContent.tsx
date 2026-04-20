import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { CampaignProfile } from '../../hooks/useProfile'
import { getDevCalendarEventById } from '../../lib/campaignCalendarDevFixtures'
import { collectOperationsGapsForEvent } from '../../lib/campaignEventCoordinatorOperations'
import {
  CAMPAIGN_EVENT_NEW_RECORD_SLUG,
  isAllowedEventRecordRouteParam,
  isUuidParam,
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
import EventFollowupCard from './event-detail/EventFollowupCard'
import EventHealthFlags from './event-detail/EventHealthFlags'
import EventLogisticsCard from './event-detail/EventLogisticsCard'
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

export default function EventRecordDeskContent({
  profile: _profile,
}: {
  profile: CampaignProfile | null
}) {
  void _profile
  const { eventId = '' } = useParams<{ eventId: string }>()
  const [searchParams] = useSearchParams()
  const queryType = parseTypeQuery(searchParams.get('type'))

  const [pickedType, setPickedType] = useState<CampaignEventTypeKey | null>(null)
  const selectedType = queryType ?? pickedType ?? 'public_fair_festival'

  const paramOk = isAllowedEventRecordRouteParam(eventId)
  const isNew = eventId === CAMPAIGN_EVENT_NEW_RECORD_SLUG
  const isUuid = isUuidParam(eventId)

  const loadedRow = useMemo(() => {
    if (!isUuid) return null
    return getDevCalendarEventById(eventId)
  }, [eventId, isUuid])

  const effectiveType: CampaignEventTypeKey = useMemo(() => {
    if (loadedRow && (TYPE_KEYS as readonly string[]).includes(loadedRow.event_type)) {
      return loadedRow.event_type as CampaignEventTypeKey
    }
    return selectedType
  }, [loadedRow, selectedType])

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
      loadedRow
        ? buildEventTaskInstances({
            event_id: loadedRow.event_id,
            start_at: loadedRow.start_at,
            event_type: effectiveType,
          })
        : null,
    [loadedRow, effectiveType],
  )

  const eligibilityInput = useMemo((): MobilizeEligibilityInput => {
    if (loadedRow) return mobilizeEligibilityInputFromRecord(loadedRow)
    return scaffoldEligibilityInput(selectedType)
  }, [loadedRow, selectedType])

  const eligibility = useMemo(
    () => evaluateMobilizePublishEligibility(eligibilityInput),
    [eligibilityInput],
  )

  const mobilizeContract = useMemo(() => {
    if (!loadedRow) return null
    return {
      extended: buildMobilizeEligibility(loadedRow),
      summary: buildMobilizeStatusSummary(loadedRow),
      meta: eventMobilizeMetaFromRecord(loadedRow),
      publishPayload: buildMobilizePublishPayload(loadedRow),
    }
  }, [loadedRow])

  const operationsGaps = useMemo(
    () => (loadedRow ? collectOperationsGapsForEvent(loadedRow) : []),
    [loadedRow],
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

  const rowBanner =
    isUuid && !loadedRow ? (
      <p className="event-record-desk__banner" role="status">
        No row in the development fixture set for this id — overview uses the type selector only.
        Supabase will supply the canonical record.
      </p>
    ) : null

  const headerTitle = isNew ? 'New event (scaffold)' : loadedRow?.title ?? 'Event details'
  const typeLabel = typeDef?.label ?? null

  return (
    <div className="event-coordinator-desk" id="event-record-detail">
      <p className="event-detail-page__intro">
        Operational home for one event — sections use stable <code>id</code>s for Agent Jones and
        admin tooling. <strong>Staged:</strong> edit/save, publish API, persisted tasks.
      </p>
      {rowBanner}

      <EventDetailHeaderCard
        eventId={eventId}
        isNew={isNew}
        isUuid={isUuid}
        title={headerTitle}
        record={loadedRow}
        typeLabel={typeLabel}
      />

      <EventHealthFlags
        eligibility={eligibility}
        mobilizePublishReadyOverride={
          mobilizeContract != null ? mobilizeContract.extended.isEligible : null
        }
        staffingGaps={operationsGaps.filter((g) =>
          ['staffing', 'logistics', 'host'].includes(g.category),
        )}
        followGaps={followGaps}
        stageStatus={loadedRow?.stage_status ?? null}
      />

      <EventOverviewCard
        record={loadedRow}
        typeDef={typeDef}
        loadedRow={loadedRow}
        selectedType={selectedType}
        onTypeChange={setPickedType}
      />

      <EventStageTrackerCard
        record={loadedRow}
        requiredStageSlugs={requiredStageSlugs}
        typeDef={typeDef}
        currentLifecycle={loadedRow?.stage_status ?? null}
      />

      <EventTaskChecklistCard
        effectiveType={effectiveType}
        tasksByStage={tasksByStage}
        instances={taskInstances}
      />

      <EventStaffingCard record={loadedRow} staffingOnlyGaps={staffingOnlyGaps} />

      <EventLogisticsCard record={loadedRow} logisticsAndHostGaps={logisticsAndHostGaps} />

      <EventCalendarVisibilityCard record={loadedRow} eligibility={eligibility} />

      <EventMobilizeCard
        record={loadedRow}
        typeDef={typeDef}
        eligibility={eligibility}
        mobilizeContract={mobilizeContract}
      />

      <EventOutcomesCard record={loadedRow} />

      <EventFollowupCard record={loadedRow} followGaps={followGaps} />

      <p className="event-coordinator-desk__foot">
        <Link to="/events">← Event Coordinator Desk</Link>
      </p>
    </div>
  )
}
