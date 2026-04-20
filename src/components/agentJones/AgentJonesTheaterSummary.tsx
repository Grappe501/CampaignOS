import type { AgentJonesCampaignTheaterSummary } from '../../lib/agentJonesContextV2'

export default function AgentJonesTheaterSummary({
  theater,
}: {
  theater: AgentJonesCampaignTheaterSummary
}) {
  const has =
    theater.theater_label ||
    (theater.strongest_zone_labels?.length ?? 0) > 0 ||
    (theater.weakest_zone_labels?.length ?? 0) > 0 ||
    (theater.opportunity_zone_labels?.length ?? 0) > 0 ||
    (theater.recovery_zone_labels?.length ?? 0) > 0 ||
    theater.readiness_headline ||
    theater.command_headline ||
    theater.multi_area_note
  if (!has) return null
  return (
    <div className="agent-jones-v32-pass1-block">
      <p className="agent-jones-v32-pass1-k">Campaign theater (v3.3)</p>
      {theater.theater_label ? (
        <p className="agent-jones-v32-pass1-line">{theater.theater_label}</p>
      ) : null}
      {theater.multi_area_note ? (
        <p className="agent-jones-v32-pass1-note">{theater.multi_area_note}</p>
      ) : null}
      {theater.command_headline ? (
        <p className="agent-jones-v32-pass1-meta">{theater.command_headline}</p>
      ) : null}
      {theater.strongest_zone_labels?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          <span className="agent-jones-v31-calendar-k">Stronger</span>{' '}
          {theater.strongest_zone_labels.join(' · ')}
        </p>
      ) : null}
      {theater.weakest_zone_labels?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          <span className="agent-jones-v31-calendar-k">Weaker</span>{' '}
          {theater.weakest_zone_labels.join(' · ')}
        </p>
      ) : null}
      {theater.opportunity_zone_labels?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          <span className="agent-jones-v31-calendar-k">Opportunity</span>{' '}
          {theater.opportunity_zone_labels.join(' · ')}
        </p>
      ) : null}
      {theater.recovery_zone_labels?.length ? (
        <p className="agent-jones-v32-pass1-meta">
          <span className="agent-jones-v31-calendar-k">Recovery</span>{' '}
          {theater.recovery_zone_labels.join(' · ')}
        </p>
      ) : null}
      {theater.readiness_headline ? (
        <p className="agent-jones-v32-pass1-note">{theater.readiness_headline}</p>
      ) : null}
    </div>
  )
}
