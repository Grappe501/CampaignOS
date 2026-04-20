import type {
  AgentJonesCampaignPhaseSummary,
  AgentJonesCountdownSummary,
  AgentJonesGotvSummary,
  AgentJonesInterventionSequence,
  AgentJonesNavigationHint,
  AgentJonesTradeoffSummary,
} from './agentJonesContextV2'
import type { AgentJonesV34Pack } from './agentJonesV34Pack'

/**
 * Session-coaching fingerprint: omits desk_routing so surface-only headline edits
 * do not force avoid_repeating churn; still tracks phase, countdown, tradeoff, sequence, GOTV.
 */
export function buildAgentJonesV34CoachingEpoch(input: {
  campaign_phase?: AgentJonesCampaignPhaseSummary
  countdown_summary?: AgentJonesCountdownSummary
  tradeoff_summary?: AgentJonesTradeoffSummary
  intervention_sequence?: AgentJonesInterventionSequence
  gotv_summary?: AgentJonesGotvSummary
}): string {
  const ph = input.campaign_phase
  const cd = input.countdown_summary
  const tr = input.tradeoff_summary
  const seq = input.intervention_sequence
  const gv = input.gotv_summary
  if (!ph && !cd && !tr && !seq && !gv) return ''
  return [
    ph?.campaign_mode ?? '',
    ph?.urgency_level ?? '',
    cd?.countdown_window ?? '',
    cd?.days_remaining != null ? String(cd.days_remaining) : '',
    (tr?.top_tradeoff_headline ?? '').slice(0, 36),
    (seq?.sequence_headline ?? '').slice(0, 36),
    String(seq?.ordered_steps?.length ?? ''),
    String(gv?.gotv_mode_active ?? ''),
  ].join('|')
}

/** One-line strategic snapshot for compact leadership panels (no new facts). */
export function buildAgentJonesV34AtAGlanceLine(pack: AgentJonesV34Pack): string | null {
  if (!pack || Object.keys(pack).length === 0) return null
  const parts: string[] = []
  const mode = pack.campaign_phase?.campaign_mode
  if (mode) parts.push(mode.replace(/_/g, ' '))
  const cw = pack.countdown_summary?.countdown_window
  if (cw) parts.push(cw)
  const head = pack.countdown_summary?.countdown_pressure_headline?.trim().slice(0, 72)
  if (head) parts.push(head)
  else {
    const tr = pack.tradeoff_summary?.top_tradeoff_headline?.trim().slice(0, 72)
    if (tr) parts.push(tr)
  }
  return parts.length ? parts.join(' · ') : null
}

function hintScore(h: AgentJonesNavigationHint, pack: AgentJonesV34Pack): number {
  let s = 0
  const cw = pack.countdown_summary?.countdown_window
  const late = cw === 'same_day' || cw === '24h' || cw === '48h'
  const gotv = pack.gotv_summary?.gotv_mode_active
  const owner = pack.intervention_sequence?.primary_owner

  if (late && h.target_id === 'coordinator-mission-ops') s += 4
  if (gotv && h.target_id === 'coordinator-mission-ops') s += 3
  if (owner === 'coordinator' && h.target_id === 'coordinator-mission-ops') s += 2
  if (owner === 'admin' && h.target_id === 'admin-exceptions') s += 2
  if (owner === 'campaign_manager' && h.kind === 'navigate' && h.route === '/coordinator') s += 2
  if (pack.campaign_phase?.campaign_mode === 'early_vote' && h.target_id === 'candidate-health-snapshot') {
    s += 2
  }
  return s
}

/** Re-rank client hints so phase / sequence / GOTV signals surface the best taps first. */
export function prioritizeAgentJonesNavigationHintsForV34(
  hints: AgentJonesNavigationHint[],
  pack: AgentJonesV34Pack | null,
): AgentJonesNavigationHint[] {
  if (!pack || Object.keys(pack).length === 0 || hints.length < 2) return hints
  const scored = hints.map((h, i) => ({ h, i, sc: hintScore(h, pack) }))
  scored.sort((a, b) => (b.sc !== a.sc ? b.sc - a.sc : a.i - b.i))
  return scored.map(({ h }, idx) => ({
    ...h,
    priority: (idx + 1) as 1 | 2 | 3,
  }))
}
