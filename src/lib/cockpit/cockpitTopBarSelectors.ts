import type { LeadershipBriefingSnapshot } from '../leadershipBriefingSchemas'

export function topThreeRiskLabels(snapshot: LeadershipBriefingSnapshot): string[] {
  return snapshot.strategic_risks.slice(0, 3).map((r) => r.title)
}

export function missionStripLines(snapshot: LeadershipBriefingSnapshot): {
  briefing: string
  change: string
  decision: string
} {
  return {
    briefing: snapshot.pulse.overall_line,
    change: snapshot.counts.trend_explanation ?? 'No prior saved visit for delta tracking.',
    decision:
      snapshot.pulse.highest_priority_decision ??
      snapshot.decision_queue[0]?.precheck.summary_line ??
      'No blocking governance item surfaced.',
  }
}
