import type { CoordinatorOperationsGap } from '../../../lib/campaignEventCoordinatorOperations'
import type { MobilizeEligibilityResult } from '../../../lib/mobilizePublishEligibility'

export type EventHealthFlag = {
  id: string
  label: string
  active: boolean
  tone: 'risk' | 'warn' | 'ok'
}

type EventHealthFlagsProps = {
  eligibility: MobilizeEligibilityResult
  /** When set (loaded row), reflects blueprint-12 gates (finance + public copy), not only the six-rule engine. */
  mobilizePublishReadyOverride?: boolean | null
  staffingGaps: CoordinatorOperationsGap[]
  followGaps: CoordinatorOperationsGap[]
  stageStatus: string | null
}

export default function EventHealthFlags({
  eligibility,
  mobilizePublishReadyOverride = null,
  staffingGaps,
  followGaps,
  stageStatus,
}: EventHealthFlagsProps) {
  const approvalOk = eligibility.checks[0]?.pass ?? false
  const venueOk = eligibility.checks[3]?.pass ?? false
  const publishReady =
    mobilizePublishReadyOverride != null ? mobilizePublishReadyOverride : eligibility.eligible

  const staffingGap = staffingGaps.some((g) => g.category === 'staffing')
  const logisticsGap = staffingGaps.some((g) => g.category === 'logistics')
  const hostGap = staffingGaps.some((g) => g.category === 'host')
  const followOwnerGap = followGaps.some((g) =>
    g.message.toLowerCase().includes('follow-up'),
  )

  const flags: EventHealthFlag[] = [
    {
      id: 'approval',
      label: 'Approval / lifecycle',
      active: !approvalOk,
      tone: !approvalOk ? 'risk' : 'ok',
    },
    {
      id: 'venue',
      label: 'Venue & time',
      active: !venueOk,
      tone: !venueOk ? 'risk' : 'ok',
    },
    {
      id: 'staffing',
      label: 'Staffing gap',
      active: staffingGap,
      tone: staffingGap ? 'risk' : 'ok',
    },
    {
      id: 'logistics',
      label: 'Logistics gap',
      active: logisticsGap,
      tone: logisticsGap ? 'warn' : 'ok',
    },
    {
      id: 'host',
      label: 'Host assignment',
      active: hostGap,
      tone: hostGap ? 'risk' : 'ok',
    },
    {
      id: 'followup-owner',
      label: 'Follow-up owner / state',
      active: followOwnerGap,
      tone: followOwnerGap ? 'warn' : 'ok',
    },
    {
      id: 'publish-ready',
      label: 'Publish-ready (Mobilize)',
      active: !publishReady,
      tone: !publishReady ? 'warn' : 'ok',
    },
  ]

  const activeCount = flags.filter((f) => f.active).length

  return (
    <section
      id="event-detail-health"
      className="event-detail-health"
      aria-label="Event health"
      role="region"
    >
      <h2 className="event-detail-health__title">Health strip</h2>
      <p className="event-detail-health__meta">
        {activeCount === 0
          ? 'No immediate risks flagged from the current model.'
          : `${activeCount} attention item(s) — see sections below.`}
        {stageStatus ? (
          <>
            {' '}
            Lifecycle: <strong>{stageStatus}</strong>
          </>
        ) : null}
      </p>
      <ul className="event-detail-health__flags">
        {flags.map((f) => (
          <li
            key={f.id}
            className={
              f.active
                ? `event-detail-health__flag event-detail-health__flag--${f.tone}`
                : 'event-detail-health__flag event-detail-health__flag--inactive'
            }
          >
            {f.label}
            {f.active ? ' · needs attention' : ' · OK'}
          </li>
        ))}
      </ul>
    </section>
  )
}
