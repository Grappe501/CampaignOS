/**
 * Compact digest line for future orchestration — currently folded into `cockpitAiMissionStrip`.
 */
export type CockpitSystemDigestLine = {
  headline: string
  modules_touched: string[]
}

export function cockpitSystemDigestFromMissionLine(
  crossSystemPressureLine: string | null | undefined,
  modules: string[],
): CockpitSystemDigestLine {
  return {
    headline: (crossSystemPressureLine ?? '').trim().slice(0, 400) || 'Operational posture stable.',
    modules_touched: modules.slice(0, 12),
  }
}
