import { useCoordinatorEngagementInsights } from '../../hooks/useCoordinatorEngagementInsights'
import type { VolunteerProfile } from '../../lib/volunteerCommandDomain'

type Props = {
  volunteers: VolunteerProfile[]
}

export default function CoordinatorRecommendationInsightsPanel({ volunteers }: Props) {
  const insight = useCoordinatorEngagementInsights(volunteers)

  if (insight.loading) {
    return (
      <section className="event-coordinator-desk__section" aria-labelledby="vc-recintel">
        <h2 id="vc-recintel" className="event-coordinator-desk__h2">
          Recommendation & engagement intelligence
        </h2>
        <p className="event-coordinator-desk__meta">Loading engagement signals…</p>
      </section>
    )
  }

  if (insight.error) {
    return (
      <section className="event-coordinator-desk__section" aria-labelledby="vc-recintel">
        <h2 id="vc-recintel" className="event-coordinator-desk__h2">
          Recommendation & engagement intelligence
        </h2>
        <p className="event-coordinator-desk__placeholder" role="alert">
          {insight.error.message}
        </p>
      </section>
    )
  }

  return (
    <section className="event-coordinator-desk__section" aria-labelledby="vc-recintel">
      <h2 id="vc-recintel" className="event-coordinator-desk__h2">
        Recommendation & engagement intelligence
      </h2>
      <p className="event-coordinator-desk__placeholder">
        Engagement is inferred from marketplace views, saves, claims, and completions — supportive categories,
        not punitive scores.
      </p>
      <div className="volunteer-command__stat-grid">
        <div>
          <strong>{insight.highlyActive.length}</strong>
          <p className="event-coordinator-desk__meta">Highly active</p>
        </div>
        <div>
          <strong>{insight.drifting.length}</strong>
          <p className="event-coordinator-desk__meta">Warming / drifting</p>
        </div>
        <div>
          <strong>{insight.readyForMore.length}</strong>
          <p className="event-coordinator-desk__meta">Ready for a stronger ask</p>
        </div>
      </div>
      <h3 className="event-coordinator-desk__h2">Quick actions</h3>
      <ul className="volunteer-command__list">
        <li>Invite drifting volunteers to a lighter shift or training-first path.</li>
        <li>Offer high-engagement volunteers a leadership or backup role.</li>
        <li>Review marketplace blockers if claims stall on training or onboarding.</li>
      </ul>
      <h3 className="event-coordinator-desk__h2">Top engagement (snapshot)</h3>
      <ul className="volunteer-command__list">
        {insight.summaries
          .slice()
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 8)
          .map((s) => {
            const v = volunteers.find((x) => x.id === s.volunteerId)
            return (
              <li key={s.volunteerId}>
                {v?.displayName ?? v?.email ?? s.volunteerId.slice(0, 8)} —{' '}
                <strong>{s.engagementCategory.replace(/_/g, ' ')}</strong> · score {Math.round(s.engagementScore)}{' '}
                · {s.trendDirection}
              </li>
            )
          })}
      </ul>
    </section>
  )
}
