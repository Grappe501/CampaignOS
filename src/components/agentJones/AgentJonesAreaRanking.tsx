import type { AgentJonesAreaScore } from '../../lib/agentJonesContextV2'

export default function AgentJonesAreaRanking({
  areas,
  note,
}: {
  areas: AgentJonesAreaScore[]
  note?: string | null
}) {
  const showNoteOnly = !areas.length && Boolean(note?.trim())
  if (!areas.length && !showNoteOnly) return null

  return (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Area ranking (v3.3)</p>
      <p className="agent-jones-v32-pass1-note">
        Comparative order from visible session signals — not a full turf or voter-file ranking.
      </p>
      {note?.trim() ? (
        <p className="agent-jones-v32-pass1-meta" role="status">
          {note.trim()}
        </p>
      ) : null}
      {areas.length ? (
        <ul className="agent-jones-v32-pass1-risks" style={{ listStyle: 'none', paddingLeft: 0 }}>
          {areas.map((a, i) => (
            <li key={`${a.area_label}-${i}`} style={{ marginBottom: 10 }}>
              <span className="agent-jones-v31-calendar-k">{a.priority_band}</span>{' '}
              <strong>{a.area_label}</strong>
              <span className="agent-jones-v32-pass1-meta"> · {a.area_type}</span>
              {a.trend ? (
                <span className="agent-jones-v32-pass1-meta"> · trend: {a.trend}</span>
              ) : null}
              {a.recommendation_headline ? (
                <p className="agent-jones-v32-pass1-meta" style={{ margin: '4px 0 0' }}>
                  {a.recommendation_headline}
                </p>
              ) : null}
              {a.opportunity_score != null ||
              a.readiness_score != null ||
              a.pressure_score != null ||
              a.coverage_score != null ? (
                <p className="agent-jones-v32-pass1-meta" style={{ margin: '4px 0 0' }}>
                  {a.pressure_score != null ? `Pressure proxy ~${a.pressure_score}` : null}
                  {a.readiness_score != null ? ` · Readiness ~${a.readiness_score}` : null}
                  {a.opportunity_score != null ? ` · Opportunity ~${a.opportunity_score}` : null}
                  {a.coverage_score != null ? ` · Coverage board ~${a.coverage_score}` : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
