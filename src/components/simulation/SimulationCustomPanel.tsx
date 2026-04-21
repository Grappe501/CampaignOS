import type { ScenarioInputVariables } from '../../lib/simulationDomain'

export default function SimulationCustomPanel({
  vars,
  onChange,
  outputs,
  confidence,
}: {
  vars: ScenarioInputVariables
  onChange: (next: ScenarioInputVariables) => void
  outputs: {
    turnout_readiness_index: number
    turnout_readiness_index_delta: number
    volunteer_capacity_index: number
    projected_supporter_rate_delta_pp: number
    geographic_emphasis_line: string
    accounting_lines: readonly string[]
  }
  confidence: string
}) {
  const num = (label: string, value: number, step: number, key: keyof ScenarioInputVariables) => (
    <label className="subtitle" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label}
      <input
        type="number"
        step={step}
        className="btn-touch"
        style={{ maxWidth: '8rem', padding: '8px' }}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          onChange({ ...vars, [key]: Number.isFinite(v) ? v : 0 })
        }}
      />
    </label>
  )

  return (
    <div className="card card--inner stack-section">
      <h3 className="power5-subheading">Custom scenario</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {num('Volunteer Δ (e.g. 0.2 = +20%)', vars.volunteer_capacity_delta, 0.05, 'volunteer_capacity_delta')}
        {num('Program events Δ', vars.program_event_pace_delta, 0.1, 'program_event_pace_delta')}
        {num('Field vs media shift (−1…1)', vars.field_vs_media_budget_shift, 0.1, 'field_vs_media_budget_shift')}
        {num('GOTV coverage lift (pts)', vars.gotv_coverage_lift_pct_points, 1, 'gotv_coverage_lift_pct_points')}
      </div>
      <label className="subtitle" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
        County focus (label only)
        <input
          type="text"
          className="btn-touch"
          style={{ maxWidth: '20rem', padding: '8px' }}
          value={vars.county_focus_id ?? ''}
          onChange={(e) =>
            onChange({
              ...vars,
              county_focus_id: e.target.value.trim() ? e.target.value.trim().slice(0, 120) : null,
            })
          }
        />
      </label>
      <p className="subtitle" style={{ marginTop: '0.75rem' }}>
        <strong>Projected</strong> readiness <strong>{outputs.turnout_readiness_index}</strong> (Δ{' '}
        {outputs.turnout_readiness_index_delta >= 0 ? '+' : ''}
        {outputs.turnout_readiness_index_delta}) · vol cap {outputs.volunteer_capacity_index} · conf.{' '}
        <strong>{confidence}</strong>
      </p>
      <p className="subtitle">{outputs.geographic_emphasis_line}</p>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {outputs.accounting_lines.map((line, i) => (
          <li key={i} className="subtitle">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}
