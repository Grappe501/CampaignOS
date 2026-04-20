import type { VolunteerRecommendationBlocker, VolunteerRecommendationReason } from '../../lib/volunteerRecommendationSchemas'

type Props = {
  reasons: VolunteerRecommendationReason[]
  blockers: VolunteerRecommendationBlocker[]
  suggestedNextStep?: string | null
  explanationSummary?: string | null
}

export default function OpportunityMatchReasonsCard({
  reasons,
  blockers,
  suggestedNextStep,
  explanationSummary,
}: Props) {
  return (
    <div className="volunteer-rec-reasons">
      {explanationSummary ? (
        <p className="volunteer-rec-reasons__summary">{explanationSummary}</p>
      ) : null}
      {reasons.length > 0 ? (
        <ul className="volunteer-rec-reasons__list">
          {reasons.slice(0, 6).map((r) => (
            <li key={`${r.code}-${r.detail.slice(0, 24)}`}>{r.detail}</li>
          ))}
        </ul>
      ) : null}
      {blockers.length > 0 ? (
        <div className="volunteer-rec-reasons__blockers">
          <strong>Blockers</strong>
          <ul>
            {blockers.slice(0, 6).map((b) => (
              <li key={`${b.code}-${b.detail.slice(0, 24)}`}>{b.detail}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {suggestedNextStep ? (
        <p className="volunteer-rec-reasons__next">
          <strong>Next step:</strong> {suggestedNextStep}
        </p>
      ) : null}
    </div>
  )
}
