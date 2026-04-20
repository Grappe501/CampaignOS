import { useEffect, useState } from 'react'
import { fetchMergedMarketplaceOpportunities } from '../../lib/volunteerOpportunityMerge'
import { getUrgentOpportunities } from '../../lib/volunteerOpportunityMatching'
import type { VolunteerOpportunity } from '../../lib/volunteerOpportunityDomain'
import { useCoordinatorEngagementInsights } from '../../hooks/useCoordinatorEngagementInsights'
import type { VolunteerProfile } from '../../lib/volunteerCommandDomain'

type Props = {
  myVolunteers: VolunteerProfile[]
}

export default function TeamLeadRecommendationQueue({ myVolunteers }: Props) {
  const insight = useCoordinatorEngagementInsights(myVolunteers)
  const [urgent, setUrgent] = useState<VolunteerOpportunity[]>([])

  useEffect(() => {
    void fetchMergedMarketplaceOpportunities('default')
      .then((rows) => setUrgent(getUrgentOpportunities(rows).slice(0, 12)))
      .catch(() => setUrgent([]))
  }, [])

  const rising = insight.summaries
    .filter((s) => s.trendDirection === 'up' && s.engagementScore >= 55)
    .slice(0, 8)

  return (
    <section className="event-coordinator-desk__section" aria-labelledby="tl-rec">
      <h2 id="tl-rec" className="event-coordinator-desk__h2">
        Team intelligence
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Urgent open roles and teammates with rising engagement on your roster.
      </p>

      <h3 className="event-coordinator-desk__h2">Urgent openings</h3>
      {urgent.length === 0 ? (
        <p className="event-coordinator-desk__placeholder">No urgent marketplace rows right now.</p>
      ) : (
        <ul className="volunteer-command__list">
          {urgent.map((o) => (
            <li key={o.id}>
              <strong>{o.title}</strong> · {o.roleSlug ?? '—'} · open {o.quantityOpen}
            </li>
          ))}
        </ul>
      )}

      <h3 className="event-coordinator-desk__h2">Rising engagement</h3>
      {insight.loading ? (
        <p className="event-coordinator-desk__meta">Loading…</p>
      ) : rising.length === 0 ? (
        <p className="event-coordinator-desk__placeholder">No trend signals in this window yet.</p>
      ) : (
        <ul className="volunteer-command__list">
          {rising.map((s) => {
            const v = myVolunteers.find((x) => x.id === s.volunteerId)
            return (
              <li key={s.volunteerId}>
                {v?.displayName ?? v?.email ?? s.volunteerId.slice(0, 8)} — score{' '}
                {Math.round(s.engagementScore)} · {s.trendDirection}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="event-coordinator-desk__h2">Suggested follow-ups</h3>
      <ul className="volunteer-command__list">
        <li>Pair urgent roles with volunteers who are warming up.</li>
        <li>If someone repeatedly ignores similar roles, offer a lighter or training-first step.</li>
        <li>Use coordinator tools to invite claim when self-claim is blocked.</li>
      </ul>
    </section>
  )
}
