import type { AgentJonesV34Pack } from '../../lib/agentJonesV34Pack'

export default function AgentJonesV34Briefing({ pack }: { pack: AgentJonesV34Pack }) {
  if (!pack || Object.keys(pack).length === 0) return null
  const ph = pack.campaign_phase
  const cd = pack.countdown_summary
  const tr = pack.tradeoff_summary
  const seq = pack.intervention_sequence
  const gv = pack.gotv_summary
  const dr = pack.desk_routing

  return (
    <div className="agent-jones-v34-briefing" role="region" aria-label="Chief of staff briefing v3.4">
      <p className="agent-jones-v3-section-label">Chief of staff (v3.4)</p>
      {ph ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">Campaign mode</p>
          {ph.campaign_mode ? (
            <p className="agent-jones-v32-pass1-line">
              <span className="agent-jones-v31-calendar-k">Phase</span>{' '}
              {ph.campaign_mode.replace(/_/g, ' ')}
              {ph.urgency_level ? ` · ${ph.urgency_level}` : ''}
            </p>
          ) : null}
          {ph.mode_headline ? <p className="agent-jones-v32-pass1-note">{ph.mode_headline}</p> : null}
          {ph.days_to_next_major_milestone != null && ph.next_major_milestone_label ? (
            <p className="agent-jones-v32-pass1-meta">
              Next milestone (~{ph.days_to_next_major_milestone}d): {ph.next_major_milestone_label}
            </p>
          ) : null}
          {ph.recommended_focus_areas?.length ? (
            <p className="agent-jones-v32-pass1-meta">
              Focus areas: {ph.recommended_focus_areas.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
      {cd ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">Countdown</p>
          {cd.next_countdown_label ? (
            <p className="agent-jones-v32-pass1-line">{cd.next_countdown_label}</p>
          ) : null}
          {cd.countdown_window || cd.days_remaining != null ? (
            <p className="agent-jones-v32-pass1-meta">
              {[cd.countdown_window, cd.days_remaining != null ? `${cd.days_remaining}d to polls close` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          {cd.countdown_pressure_headline ? (
            <p className="agent-jones-v32-pass1-note">{cd.countdown_pressure_headline}</p>
          ) : null}
          {cd.countdown_scope_note ? (
            <p className="agent-jones-v32-pass1-meta">{cd.countdown_scope_note}</p>
          ) : null}
          {cd.action_window_notes?.length ? (
            <ul className="agent-jones-v32-pass1-risks">
              {cd.action_window_notes.slice(0, 2).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {tr ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">Tradeoffs</p>
          {tr.top_tradeoff_headline ? (
            <p className="agent-jones-v32-pass1-line">{tr.top_tradeoff_headline}</p>
          ) : null}
          {tr.preferred_primary_action ? (
            <p className="agent-jones-v32-pass1-meta">
              <span className="agent-jones-v31-calendar-k">Now</span> {tr.preferred_primary_action}
            </p>
          ) : null}
          {tr.deferred_secondary_action ? (
            <p className="agent-jones-v32-pass1-meta">
              <span className="agent-jones-v31-calendar-k">Defer</span> {tr.deferred_secondary_action}
            </p>
          ) : null}
          {tr.rationale_points?.length ? (
            <ul className="agent-jones-v32-pass1-risks">
              {tr.rationale_points.slice(0, 2).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
          {tr.confidence_note ? (
            <p className="agent-jones-v32-pass1-note">{tr.confidence_note}</p>
          ) : null}
        </div>
      ) : null}
      {seq ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">Intervention sequence</p>
          {seq.sequence_headline ? (
            <p className="agent-jones-v32-pass1-line">{seq.sequence_headline}</p>
          ) : null}
          {seq.primary_owner ? (
            <p className="agent-jones-v32-pass1-meta">Primary owner hint: {seq.primary_owner}</p>
          ) : null}
          {seq.ordered_steps?.length ? (
            <ol className="agent-jones-v34-sequence-list">
              {seq.ordered_steps.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : null}
          {seq.downstream_dependencies?.length ? (
            <p className="agent-jones-v32-pass1-meta">
              Then: {seq.downstream_dependencies.join(' ')}
            </p>
          ) : null}
          {seq.unblock_value_note ? (
            <p className="agent-jones-v32-pass1-note">{seq.unblock_value_note}</p>
          ) : null}
        </div>
      ) : null}
      {gv ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">GOTV / mobilization</p>
          {gv.gotv_mode_active ? (
            <p className="agent-jones-v32-pass1-meta">GOTV-class window (heuristic)</p>
          ) : null}
          {gv.turnout_risk_headline ? (
            <p className="agent-jones-v32-pass1-line">{gv.turnout_risk_headline}</p>
          ) : null}
          {gv.volunteer_deployment_headline ? (
            <p className="agent-jones-v32-pass1-note">{gv.volunteer_deployment_headline}</p>
          ) : null}
          {gv.highest_pressure_area_labels?.length ? (
            <p className="agent-jones-v32-pass1-meta">
              Pressure proxies: {gv.highest_pressure_area_labels.join(' · ')}
            </p>
          ) : null}
          {gv.staffing_gap_labels?.length ? (
            <p className="agent-jones-v32-pass1-meta">Gaps: {gv.staffing_gap_labels.join(' · ')}</p>
          ) : null}
          {gv.best_next_gotv_actions?.length ? (
            <ul className="agent-jones-v32-pass1-risks">
              {gv.best_next_gotv_actions.slice(0, 2).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {dr ? (
        <div className="agent-jones-v32-pass1-block">
          <p className="agent-jones-v32-pass1-k">Desk routing</p>
          {dr.route_headline ? <p className="agent-jones-v32-pass1-line">{dr.route_headline}</p> : null}
          {dr.first_owner_role || dr.second_owner_role ? (
            <p className="agent-jones-v32-pass1-meta">
              {[dr.first_owner_role, dr.second_owner_role].filter(Boolean).join(' → ')}
            </p>
          ) : null}
          {dr.escalation_route?.length ? (
            <p className="agent-jones-v32-pass1-meta">
              Escalation (visible): {dr.escalation_route[0]}
              {dr.escalation_route.length > 1 ? ' · …' : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
