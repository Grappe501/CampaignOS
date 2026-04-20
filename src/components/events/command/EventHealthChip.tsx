import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import { collectOperationsGapsForEvent } from '../../../lib/campaignEventCoordinatorOperations'
import { computeEventHealthScore, healthStatusToUiModifier } from '../../../lib/eventHealthScoreService'
import { eventIsPendingVolunteerRequest } from '../../../lib/eventSubmissionApproval'

type EventHealthChipProps = {
  record: CampaignCalendarEventRecord
  variant?: 'chip' | 'pill'
}

export default function EventHealthChip({ record, variant = 'chip' }: EventHealthChipProps) {
  const gaps = collectOperationsGapsForEvent(record)
  const h = computeEventHealthScore({ record, gaps })
  const mod = healthStatusToUiModifier(h.status)
  const cls =
    variant === 'chip'
      ? `seg-cal__chip seg-cal__chip--health seg-cal__chip--health-${mod}`
      : `event-health-pill event-health-pill--${mod === 'ready' ? 'ready' : mod === 'risk' ? 'risk' : 'critical'}`

  const req = eventIsPendingVolunteerRequest(record)

  return (
    <span className={cls} title={h.reasonCodes.length ? h.reasonCodes.join(' · ') : `Health ${h.score}`}>
      {req ? (
        <abbr title="Request-only — pending coordinator approval" style={{ marginRight: 4 }}>
          REQ
        </abbr>
      ) : null}
      {h.score}
    </span>
  )
}
