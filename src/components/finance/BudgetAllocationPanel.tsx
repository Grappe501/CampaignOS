import type { CampaignBudgetAllocationRow } from '../../lib/financeDb'
import { BUDGET_CATEGORY_LABELS, type BudgetCategory } from '../../lib/financeDomain'

export default function BudgetAllocationPanel({
  budgets,
  headroom,
}: {
  budgets: readonly CampaignBudgetAllocationRow[]
  headroom: Partial<Record<BudgetCategory, number>>
}) {
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Budget envelopes</h3>
      <p className="subtitle">Planned lines (period) vs computed headroom from logged expenses.</p>
      {budgets.length === 0 ? (
        <p className="subtitle">No budget lines — add allocations for the command view.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {budgets.slice(0, 12).map((b) => (
            <li key={b.id} className="subtitle">
              {b.period_start}–{b.period_end}:{' '}
              <strong>{BUDGET_CATEGORY_LABELS[b.budget_category as BudgetCategory] ?? b.budget_category}</strong>{' '}
              {b.allocated_amount.toLocaleString()}
              {b.county_id ? ` · ${b.county_id}` : ''} · weight {b.priority_weight}
            </li>
          ))}
        </ul>
      )}
      <p className="subtitle" style={{ marginTop: '0.75rem' }}>
        <strong>Headroom</strong>
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {Object.entries(headroom).length === 0 ? (
          <li className="subtitle">No overlapping budget period or no spend yet.</li>
        ) : (
          Object.entries(headroom).map(([k, v]) => (
            <li key={k} className="subtitle">
              {BUDGET_CATEGORY_LABELS[k as BudgetCategory] ?? k}: {Number(v).toLocaleString()} remaining
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
