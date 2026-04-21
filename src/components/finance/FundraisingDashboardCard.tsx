import type { CampaignDonationRow } from '../../lib/financeDb'
import { FUND_SOURCE_LABELS, type FundSourceSlug } from '../../lib/financeDomain'
import type { FinanceLeadershipSummaryRow } from '../../lib/financeDb'

export default function FundraisingDashboardCard({
  summary,
  recentDonations,
}: {
  summary: FinanceLeadershipSummaryRow | null
  recentDonations: readonly CampaignDonationRow[]
}) {
  if (!summary) {
    return (
      <div className="card card--inner stack-section">
        <h3 className="power5-subheading">Fundraising</h3>
        <p className="subtitle">No finance summary yet — apply migration and log donations.</p>
      </div>
    )
  }
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Fundraising</h3>
      <p className="subtitle">
        Total raised <strong>{summary.total_donations.toLocaleString()}</strong> ·{' '}
        <strong>{summary.donation_count}</strong> entries
      </p>
      <p className="subtitle">Recent entries (newest first)</p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {recentDonations.slice(0, 8).map((d) => (
          <li key={d.id} className="subtitle">
            {d.amount.toLocaleString()} · {FUND_SOURCE_LABELS[d.fund_source_slug as FundSourceSlug] ?? d.fund_source_slug} ·{' '}
            {d.channel}
            {d.county_id ? ` · ${d.county_id}` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
