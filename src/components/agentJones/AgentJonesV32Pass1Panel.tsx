import type {
  AgentJonesCampaignManagerCommand,
  AgentJonesCoverageSummary,
  AgentJonesDemographicSummary,
  AgentJonesEscalationSummary,
  AgentJonesFieldIntelligenceSummary,
  AgentJonesGeoIntelligence,
} from '../../lib/agentJonesContextV2'

export type AgentJonesV32PanelLayout = 'default' | 'leadership'

export default function AgentJonesV32Pass1Panel({
  geo,
  field,
  coverage,
  demographic,
  escalation,
  campaignManagerCommand,
  panelLayout = 'default',
}: {
  geo: AgentJonesGeoIntelligence | null
  field: AgentJonesFieldIntelligenceSummary | null
  coverage: AgentJonesCoverageSummary | null
  demographic?: AgentJonesDemographicSummary | null
  escalation?: AgentJonesEscalationSummary | null
  campaignManagerCommand?: AgentJonesCampaignManagerCommand | null
  /** Leadership desks: escalation and command up front; execution desks: geo/field first. */
  panelLayout?: AgentJonesV32PanelLayout
}) {
  if (
    !geo &&
    !field &&
    !coverage &&
    !demographic &&
    !escalation &&
    !campaignManagerCommand
  ) {
    return null
  }

  const sectionLabel =
    panelLayout === 'leadership'
      ? 'Leadership intelligence (v3.2)'
      : 'Operational context (v3.2)'

  const geoBlock = geo ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Geography</p>
      {geo.scope_type ? (
        <p className="agent-jones-v32-pass1-meta">Scope: {geo.scope_type}</p>
      ) : null}
      {geo.primary_area_label ? (
        <p className="agent-jones-v32-pass1-line">
          <span className="agent-jones-v31-calendar-k">Primary</span> {geo.primary_area_label}
        </p>
      ) : null}
      {geo.target_area_labels && geo.target_area_labels.length > 1 ? (
        <p className="agent-jones-v32-pass1-meta">
          Also in view: {geo.target_area_labels.slice(1, 5).join(' · ')}
        </p>
      ) : null}
      <p className="agent-jones-v32-pass1-note">
        From roster-safe fields only — not a full district targeting engine.
      </p>
    </div>
  ) : null

  const fieldBlock = field ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Field pressure</p>
      {field.high_pressure_area_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          High-pressure signals (visible session): {field.high_pressure_area_count}
        </p>
      ) : null}
      {field.weakest_area_label ? (
        <p className="agent-jones-v32-pass1-meta">Stress proxy: {field.weakest_area_label}</p>
      ) : null}
      {field.strongest_area_label ? (
        <p className="agent-jones-v32-pass1-meta">Clarity proxy: {field.strongest_area_label}</p>
      ) : null}
      {field.coordinator_pressure_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Supervised blocked + overdue rows: {field.coordinator_pressure_count}
        </p>
      ) : null}
      {field.volunteer_capacity_warning_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Not-yet-started supervised rows: {field.volunteer_capacity_warning_count}
        </p>
      ) : null}
      {field.top_field_risks?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {field.top_field_risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {field.area_readiness_summary ? (
        <p className="agent-jones-v32-pass1-note">{field.area_readiness_summary}</p>
      ) : null}
    </div>
  ) : null

  const coverageBlock = coverage ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Coverage hints</p>
      {coverage.readiness_headline ? (
        <p className="agent-jones-v32-pass1-line">{coverage.readiness_headline}</p>
      ) : null}
      {coverage.event_staffing_pressure_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Assignment staffing pressure (visible): {coverage.event_staffing_pressure_count}
        </p>
      ) : null}
      {coverage.county_coverage_watch_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          County watch flag (session): {coverage.county_coverage_watch_count}
        </p>
      ) : null}
      {coverage.precinct_coverage_watch_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Precinct watch flag (session): {coverage.precinct_coverage_watch_count}
        </p>
      ) : null}
      {coverage.missing_leadership_slots?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {coverage.missing_leadership_slots.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {coverage.volunteer_shortage_area_labels?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          {coverage.volunteer_shortage_area_labels.join(' — ')}
        </p>
      ) : null}
    </div>
  ) : null

  const demographicBlock = demographic ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Public messaging & scope (coaching)</p>
      {demographic.confidence_note ? (
        <p className="agent-jones-v32-pass1-note">{demographic.confidence_note}</p>
      ) : null}
      {demographic.area_label ? (
        <p className="agent-jones-v32-pass1-meta">Area anchor: {demographic.area_label}</p>
      ) : null}
      {demographic.population_band ? (
        <p className="agent-jones-v32-pass1-note">{demographic.population_band}</p>
      ) : null}
      {demographic.demographic_highlights?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {demographic.demographic_highlights.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {demographic.organizing_considerations?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {demographic.organizing_considerations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {demographic.turnout_relevant_notes?.length ? (
        <p className="agent-jones-v32-pass1-note">
          {demographic.turnout_relevant_notes.join(' ')}
        </p>
      ) : null}
    </div>
  ) : null

  const escalationBlock = escalation ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Cross-desk escalation (visible signals)</p>
      {escalation.top_escalation_headline ? (
        <p className="agent-jones-v32-pass1-line">{escalation.top_escalation_headline}</p>
      ) : null}
      {escalation.cross_desk_issue_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Active themes (bounded): {escalation.cross_desk_issue_count}
        </p>
      ) : null}
      {escalation.blocked_downstream_work_count != null ? (
        <p className="agent-jones-v32-pass1-meta">
          Downstream pressure count (visible): {escalation.blocked_downstream_work_count}
        </p>
      ) : null}
      {escalation.escalation_routes?.length ? (
        <ul className="agent-jones-v32-pass1-risks">
          {escalation.escalation_routes.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null

  const cmBlock = campaignManagerCommand ? (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Campaign manager command</p>
      {campaignManagerCommand.top_risk_area_hint ? (
        <p className="agent-jones-v32-pass1-meta">
          Risk area (session proxy): {campaignManagerCommand.top_risk_area_hint}
        </p>
      ) : null}
      {campaignManagerCommand.top_opportunity_area_hint ? (
        <p className="agent-jones-v32-pass1-meta">
          Opportunity anchor (session proxy): {campaignManagerCommand.top_opportunity_area_hint}
        </p>
      ) : null}
      {campaignManagerCommand.command_lines.map((line, i) => (
        <p key={i} className="agent-jones-v32-pass1-line">
          {line}
        </p>
      ))}
      {campaignManagerCommand.recommended_intervention ? (
        <p className="agent-jones-v32-pass1-note">
          <span className="agent-jones-v31-calendar-k">Intervention</span>{' '}
          {campaignManagerCommand.recommended_intervention}
        </p>
      ) : null}
      {campaignManagerCommand.coverage_task_pressure_line ? (
        <p className="agent-jones-v32-pass1-note">
          {campaignManagerCommand.coverage_task_pressure_line}
        </p>
      ) : null}
      {campaignManagerCommand.field_readiness_framing ? (
        <p className="agent-jones-v32-pass1-note">{campaignManagerCommand.field_readiness_framing}</p>
      ) : null}
    </div>
  ) : null

  const core =
    panelLayout === 'leadership' ? (
      <>
        {escalationBlock}
        {cmBlock}
        {demographicBlock}
        {geoBlock}
        {fieldBlock}
        {coverageBlock}
      </>
    ) : (
      <>
        {geoBlock}
        {fieldBlock}
        {coverageBlock}
        {demographicBlock}
        {escalationBlock}
        {cmBlock}
      </>
    )

  return (
    <div
      className={`agent-jones-v32-pass1${panelLayout === 'leadership' ? ' agent-jones-v32-pass1--leadership' : ''}`}
      role="region"
      aria-label={
        panelLayout === 'leadership'
          ? 'Leadership field geography and escalation intelligence'
          : 'Field geography and coverage intelligence'
      }
    >
      <p className="agent-jones-v3-section-label">{sectionLabel}</p>
      {core}
    </div>
  )
}
