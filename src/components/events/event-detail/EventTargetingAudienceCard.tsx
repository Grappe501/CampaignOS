import { useEffect, useState } from 'react'
import type { CampaignCalendarEventRecord } from '../../../lib/campaignCalendarArchitecture'
import type { CampaignEventTypeKey } from '../../../lib/campaignEventTypeMatrix'
import { getEventTypeTemplate } from '../../../lib/event-types.config'
import {
  estimateAttendanceBand,
  getEventTargetUniverse,
  type EventTargetingProfile,
  type EventTargetUniverseEntry,
} from '../../../lib/eventTargetingService'

export default function EventTargetingAudienceCard({
  record,
  effectiveType,
}: {
  record: CampaignCalendarEventRecord | null
  effectiveType: CampaignEventTypeKey
}) {
  const [universe, setUniverse] = useState<EventTargetUniverseEntry[]>([])
  const [universeError, setUniverseError] = useState<string | null>(null)

  useEffect(() => {
    if (!record?.event_id) {
      setUniverse([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const rows = await getEventTargetUniverse(record.event_id)
        if (!cancelled) {
          setUniverse(rows)
          setUniverseError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setUniverse([])
          setUniverseError(e instanceof Error ? e.message : 'Failed to load target universe')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [record?.event_id])

  if (!record) {
    return (
      <section className="event-panel" id="event-targeting" aria-labelledby="tgt-heading">
        <h2 id="tgt-heading" className="event-panel__title">
          Audience & targeting
        </h2>
        <p className="event-panel__placeholder">Select a saved event to show targeting context.</p>
      </section>
    )
  }

  const tpl = getEventTypeTemplate(effectiveType)
  const profile: EventTargetingProfile = {
    eventType: effectiveType,
    objective: tpl.defaultObjective,
    audienceFocus: 'recruitment',
    geographyRadiusMiles: 15,
    voterUniverseKey: null,
    volunteerUniverseKey: null,
    segmentTags: ['neighbor_network', 'prior_volunteers'],
    notes: 'Adapter-ready: plug voter file + volunteer CRM here.',
  }
  const band = estimateAttendanceBand(profile, 40)

  return (
    <section className="event-panel" id="event-targeting" aria-labelledby="tgt-heading">
      <h2 id="tgt-heading" className="event-panel__title">
        Audience & targeting
      </h2>
      <p className="event-panel__body">
        Default objective: <strong>{tpl.defaultObjective}</strong>. Estimated turnout band:{' '}
        <strong>
          {band.low}–{band.high}
        </strong>{' '}
        ({band.basis})
      </p>
      {universeError ? (
        <p className="event-panel__body" role="alert">
          Target universe: {universeError}
        </p>
      ) : universe.length ? (
        <ul className="event-panel__list">
          {universe.map((u) => (
            <li key={u.id}>
              <strong>{u.kind}</strong> — {u.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="event-panel__body">Resolving target universe…</p>
      )}
    </section>
  )
}
