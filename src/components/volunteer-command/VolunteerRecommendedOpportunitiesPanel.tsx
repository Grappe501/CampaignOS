import { Link } from 'react-router-dom'
import type { VolunteerRecommendationResult } from '../../lib/volunteerRecommendationSchemas'
import OpportunityMatchReasonsCard from './OpportunityMatchReasonsCard'

type Props = {
  loading: boolean
  error: Error | null
  results: VolunteerRecommendationResult[]
  usedAi: boolean
  fallbackReason?: string
  onRefresh: () => void
  limit?: number
}

function sectionFor(r: VolunteerRecommendationResult): string {
  if (r.eligibilityState !== 'eligible') return 'Needs a prerequisite'
  if (r.recommendationStrength === 'strong' && (r.semanticSimilarityScore ?? 0) > 0.65) {
    return 'Strong matches near you'
  }
  if (r.opportunityId && r.recommendationStrength === 'strong') return 'Recommended for you'
  return 'Good fits'
}

export default function VolunteerRecommendedOpportunitiesPanel({
  loading,
  error,
  results,
  usedAi,
  fallbackReason,
  onRefresh,
  limit = 12,
}: Props) {
  if (error) {
    return (
      <p className="event-coordinator-desk__placeholder" role="alert">
        {error.message}
      </p>
    )
  }

  if (loading) {
    return <p className="event-coordinator-desk__meta">Building personalized recommendations…</p>
  }

  if (results.length === 0) {
    return (
      <div className="volunteer-rec-panel volunteer-rec-panel--empty">
        <p className="event-coordinator-desk__placeholder">
          No open opportunities match your profile yet.{' '}
          <Link to="/volunteers/opportunities">Browse the full marketplace</Link> for discovery.
        </p>
      </div>
    )
  }

  const top = results.slice(0, limit)

  return (
    <div className="volunteer-rec-panel">
      <div className="volunteer-rec-panel__toolbar">
        <p className="event-coordinator-desk__meta">
          {usedAi ? 'Ranked with AI assistance on top of eligibility rules.' : 'Deterministic ranking (AI paused or unavailable).'}
          {fallbackReason ? ` · ${fallbackReason}` : ''}
        </p>
        <button type="button" className="btn-touch btn-touch--ghost" onClick={() => onRefresh()}>
          Refresh
        </button>
      </div>
      <ul className="volunteer-marketplace__card-list">
        {top.map((r) => (
          <li key={r.opportunityId}>
            <article className="volunteer-marketplace-card">
              <p className="volunteer-marketplace-card__eyebrow">{sectionFor(r)}</p>
              <h3 className="volunteer-marketplace-card__title">
                {r.opportunityTitle ?? `Opportunity ${r.opportunityId.slice(0, 8)}…`}
              </h3>
              <p className="volunteer-marketplace-card__meta">
                {r.commitmentType ?? '—'} · {r.priority ?? '—'}
                {r.locationLabel ? ` · ${r.locationLabel}` : ''}
                {r.startsAt ? ` · ${new Date(r.startsAt).toLocaleString()}` : ''}
              </p>
              <p className="volunteer-marketplace-card__meta">
                Strength: {r.recommendationStrength} · Fit {Math.round(r.finalRankScore * 100)}%
                {r.semanticSimilarityScore != null
                  ? ` · Semantic ${Math.round(r.semanticSimilarityScore * 100)}%`
                  : ''}
              </p>
              <OpportunityMatchReasonsCard
                reasons={r.reasonsJson}
                blockers={r.blockersJson}
                suggestedNextStep={r.suggestedNextStep}
                explanationSummary={r.explanationSummary}
              />
              <div className="volunteer-marketplace-card__actions">
                <Link className="btn-touch btn-touch--ghost" to="/volunteers/opportunities">
                  Open marketplace
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
