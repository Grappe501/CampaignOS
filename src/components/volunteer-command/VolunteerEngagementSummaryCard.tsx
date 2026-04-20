import type { VolunteerEngagementSummary } from '../../lib/volunteerRecommendationSchemas'

type Props = {
  summary: VolunteerEngagementSummary | null
  loading?: boolean
}

export default function VolunteerEngagementSummaryCard({ summary, loading }: Props) {
  if (loading) {
    return <p className="event-coordinator-desk__meta">Loading engagement…</p>
  }
  if (!summary) {
    return (
      <p className="event-coordinator-desk__placeholder">
        Engagement summary will appear after you interact with opportunities.
      </p>
    )
  }

  return (
    <div className="volunteer-engagement-summary">
      <p className="volunteer-engagement-summary__score">
        Engagement score: <strong>{Math.round(summary.engagementScore)}</strong> / 100 ·{' '}
        <span className="volunteer-engagement-summary__cat">{summary.engagementCategory.replace(/_/g, ' ')}</span>
        {' · '}
        Trend: {summary.trendDirection}
      </p>
      <p className="volunteer-engagement-summary__action">{summary.actionRecommendation}</p>
      {summary.topInterestThemes.length > 0 ? (
        <p className="event-coordinator-desk__meta">
          Themes: {summary.topInterestThemes.join(', ')}
        </p>
      ) : null}
      <p className="event-coordinator-desk__meta">
        Based on {summary.eventsInWindow} signals in the last {summary.windowDays} days.
      </p>
    </div>
  )
}
