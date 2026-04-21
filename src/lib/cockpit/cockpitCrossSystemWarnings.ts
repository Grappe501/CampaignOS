import type { CockpitConsequence } from './cockpitConsequenceEngine'

/** One-line labels for tactical chrome (bounded, calm). */
export function cockpitCrossSystemWarningChips(consequences: CockpitConsequence[]): string[] {
  return consequences.slice(0, 4).map((c) => c.impact_summary.split('.')[0]?.trim()?.slice(0, 72) ?? c.id)
}
