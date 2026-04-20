import type {
  AgentJonesDeskSummary,
  AgentJonesDeskSummaryDesk,
  AgentJonesOperatingContext,
  AgentJonesSurface,
} from './agentJonesContextV2'

const DESK_KEYS: Record<AgentJonesSurface, AgentJonesDeskSummaryDesk> = {
  volunteer_dashboard: 'volunteer',
  intern_desk: 'intern',
  coordinator_desk: 'coordinator',
  candidate_desk: 'candidate',
  admin_desk: 'admin',
}

function deskHeadline(
  surface: AgentJonesSurface,
  op: AgentJonesOperatingContext,
): string {
  const att = op.command_summary.attention_now.length
  const urg = op.urgent_signals.filter((s) => s.severity === 'urgent').length

  switch (surface) {
    case 'volunteer_dashboard': {
      if (urg > 0 || att >= 2) {
        return 'Volunteer field desk — clear roster gates and mission queue pressure first.'
      }
      if (op.desk_health.volunteer_lane === 'watch') {
        return 'Volunteer field desk — daily activation or mission volume needs a light pass.'
      }
      return 'Volunteer field desk — training, missions, and daily beats visible on this page.'
    }
    case 'intern_desk': {
      if (op.urgent_signals.some((s) => s.label.toLowerCase().includes('first-contact'))) {
        return 'Intern pipeline desk — overdue first contacts need human reach-out now.'
      }
      return 'Intern pipeline desk — queue health, follow-ups, and leadership reps in one lane.'
    }
    case 'coordinator_desk': {
      if (op.command_summary.attention_now.some((l) => l.includes('blocked') || l.includes('overdue'))) {
        return 'Coordinator desk — supervised board has blocked or overdue lanes to clear.'
      }
      return 'Coordinator desk — team load, reassignment focus, and intern aggregates in view.'
    }
    case 'candidate_desk': {
      if ((op.kpi_telemetry.below_half ?? 0) >= 2) {
        return 'Leadership desk — multiple KPI lanes under half; align narrative before new programs.'
      }
      return 'Leadership desk — campaign health, weakest KPI, and principal-level attention.'
    }
    case 'admin_desk':
    default:
      if (op.exception_summary.pending_review || op.exception_summary.has_open_exception) {
        return 'Admin governance — exceptions or policy gates need a deliberate pass.'
      }
      return 'Admin governance — system risks, desk health, and honest client-visible limits.'
  }
}

export function buildAgentJonesDeskSummary(
  surface: AgentJonesSurface,
  operating: AgentJonesOperatingContext,
): AgentJonesDeskSummary {
  const cs = operating.command_summary
  return {
    desk: DESK_KEYS[surface],
    headline: deskHeadline(surface, operating),
    attention_now: cs.attention_now,
    on_track: cs.on_track,
    next_steps: cs.next_steps,
    recent_changes: cs.recent_changes,
    recommended_mode: operating.recommended_mode,
    readiness_summary: operating.readiness_summary,
  }
}
