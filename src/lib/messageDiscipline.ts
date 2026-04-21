/**
 * Message discipline — drift detection and consistency checks (deterministic).
 */

import type { CampaignNarrativeFramework } from './messageFramework'

export type MessageDisciplineReport = {
  score_0_100: number
  pillars_represented: string[]
  missing_required_pillars: string[]
  drift_flags: string[]
  warnings: string[]
}

function norm(s: string): string {
  return s.toLowerCase()
}

/** Check draft against framework: pillar coverage, watchlist, required pillars from script. */
export function evaluateMessageDiscipline(
  draft: string,
  framework: CampaignNarrativeFramework,
  requiredPillarKeys: string[] = [],
): MessageDisciplineReport {
  const t = norm(draft)
  const pillarsRepresented: string[] = []
  for (const p of framework.pillars) {
    const hit =
      p.anchor_terms.some((k) => t.includes(k)) ||
      norm(p.title).split(/\s+/).some((w) => w.length > 3 && t.includes(w))
    if (hit) pillarsRepresented.push(p.key)
  }

  const missing = requiredPillarKeys.filter((k) => !pillarsRepresented.includes(k))

  const drift_flags: string[] = []
  for (const w of framework.drift_watchlist) {
    if (t.includes(norm(w))) drift_flags.push(`watchlist:${w}`)
  }

  const warnings: string[] = []
  if (t.includes('guarantee') && /win|victory|landslide/.test(t)) {
    warnings.push('Avoid implying guaranteed outcomes — stay factual.')
  }
  if (!t.includes('chris') && draft.trim().length > 40) {
    warnings.push('Draft does not name Chris — confirm intentional for neutral relay.')
  }

  let score = 40
  score += Math.min(40, pillarsRepresented.length * 12)
  score -= missing.length * 15
  score -= drift_flags.length * 25
  score -= Math.min(20, warnings.length * 6)
  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score_0_100: score,
    pillars_represented: pillarsRepresented,
    missing_required_pillars: missing,
    drift_flags,
    warnings,
  }
}

export function explainDisciplineReport(r: MessageDisciplineReport): string[] {
  const lines: string[] = []
  lines.push(`Discipline score ${r.score_0_100}/100`)
  if (r.pillars_represented.length) {
    lines.push(`Pillars touched: ${r.pillars_represented.join(', ')}`)
  } else {
    lines.push('No pillar anchors detected — weave at least one approved theme.')
  }
  if (r.missing_required_pillars.length) {
    lines.push(`Missing required pillars: ${r.missing_required_pillars.join(', ')}`)
  }
  if (r.drift_flags.length) {
    lines.push(`Drift risk: ${r.drift_flags.join('; ')}`)
  }
  for (const w of r.warnings) lines.push(w)
  return lines
}
