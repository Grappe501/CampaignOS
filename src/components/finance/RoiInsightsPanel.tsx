import type { FinanceRoiMetrics } from '../../lib/financeDomain'
import type { FinanceLeadershipSummaryRow } from '../../lib/financeDb'
import { financeHealthHeadline, largestExpenseCategories } from '../../lib/financeAnalytics'
import type { AllocationRecommendation } from '../../lib/resourceAllocationEngine'

export default function RoiInsightsPanel({
  summary,
  roi,
  recommendations,
}: {
  summary: FinanceLeadershipSummaryRow | null
  roi: FinanceRoiMetrics
  recommendations: readonly AllocationRecommendation[]
}) {
  const top = summary ? largestExpenseCategories(summary.expense_by_category, 5) : []
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">ROI &amp; efficiency</h3>
      <p className="subtitle">{financeHealthHeadline(summary, roi)}</p>
      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.1rem' }}>
        <li className="subtitle">
          Cost / contact attempt:{' '}
          {roi.cost_per_contact != null ? roi.cost_per_contact.toLocaleString() : 'n/a'}
        </li>
        <li className="subtitle">
          Cost / tracked voter:{' '}
          {roi.cost_per_tracked_voter != null ? roi.cost_per_tracked_voter.toLocaleString() : 'n/a'}
        </li>
        <li className="subtitle">
          Cost / volunteer (est.):{' '}
          {roi.cost_per_volunteer != null ? roi.cost_per_volunteer.toLocaleString() : 'n/a'}
        </li>
      </ul>
      {top.length ? (
        <>
          <p className="subtitle">
            <strong>Top spend categories</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {top.map((t) => (
              <li key={t.category} className="subtitle">
                {t.label}: {t.amount.toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="subtitle" style={{ marginTop: '0.75rem' }}>
        <strong>Allocation engine (deterministic)</strong>
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {recommendations.map((r) => (
          <li key={r.id} className="subtitle">
            <strong>{r.severity}</strong> — {r.action_line}
          </li>
        ))}
      </ul>
    </div>
  )
}
