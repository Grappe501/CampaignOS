import type { StrategyComparisonRow } from '../../lib/strategyComparison'

export default function SimulationComparisonTable({
  baselineReadiness,
  rows,
}: {
  baselineReadiness: number
  rows: readonly StrategyComparisonRow[]
}) {
  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Strategy comparison</h3>
      <p className="subtitle">Readiness index is a 0–100 composite from visible GOTV + conversion (not vote totals).</p>
      <p className="subtitle">
        Baseline: <strong>{baselineReadiness}</strong>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="subtitle" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border, #ccc)' }}>
              <th style={{ padding: '0.35rem 0.5rem' }}>Scenario</th>
              <th style={{ padding: '0.35rem 0.5rem' }}>Index</th>
              <th style={{ padding: '0.35rem 0.5rem' }}>Δ</th>
              <th style={{ padding: '0.35rem 0.5rem' }}>Vol cap</th>
              <th style={{ padding: '0.35rem 0.5rem' }}>Supp Δ pp*</th>
              <th style={{ padding: '0.35rem 0.5rem' }}>Conf.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.scenario_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <td style={{ padding: '0.35rem 0.5rem' }}>{r.label}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{r.readiness_index}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>
                  {r.readiness_delta >= 0 ? '+' : ''}
                  {r.readiness_delta}
                </td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{r.volunteer_capacity_index}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>
                  {r.supporter_rate_delta_pp >= 0 ? '+' : ''}
                  {r.supporter_rate_delta_pp}
                </td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{r.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
        *Supporter rate delta: model elasticity in percentage points vs baseline rate — directional only.
      </p>
    </div>
  )
}
