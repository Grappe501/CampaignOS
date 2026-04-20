import type { CampaignKpiRow, CampaignMissionRow } from './kpiEngine'

/** Progress toward target; may exceed 100 when current_value > target_value. */
export function kpiProgressPctRaw(row: CampaignKpiRow): number | null {
  const t = Number(row.target_value)
  if (!Number.isFinite(t) || t <= 0) return null
  const c = Number(row.current_value)
  return (100 * (Number.isFinite(c) ? c : 0)) / t
}

export function formatProgressPctLabel(pct: number): string {
  const r = Math.round(pct * 10) / 10
  if (r > 100) return `${r}% of target (ahead of current target)`
  return `${Math.min(100, r)}% of target`
}

export type KpiProgressSort = { row: CampaignKpiRow; pct: number }

export function sortKpisByProgress(
  kpis: CampaignKpiRow[],
  order: 'asc' | 'desc',
): KpiProgressSort[] {
  const rows: KpiProgressSort[] = []
  for (const row of kpis) {
    const p = kpiProgressPctRaw(row)
    if (p == null) continue
    rows.push({ row, pct: p })
  }
  rows.sort((a, b) => (order === 'asc' ? a.pct - b.pct : b.pct - a.pct))
  return rows
}

export function averageKpiProgressPct(kpis: CampaignKpiRow[]): number | null {
  const raw = kpis.map(kpiProgressPctRaw).filter((x): x is number => x != null)
  if (!raw.length) return null
  const sum = raw.reduce((a, b) => a + b, 0)
  return Math.round((sum / raw.length) * 10) / 10
}

export function countKpisBelowThreshold(kpis: CampaignKpiRow[], thresholdPct: number): number {
  let n = 0
  for (const k of kpis) {
    const p = kpiProgressPctRaw(k)
    if (p != null && p < thresholdPct) n++
  }
  return n
}

export function countKpisAtOrAboveGoal(kpis: CampaignKpiRow[]): number {
  let n = 0
  for (const k of kpis) {
    const p = kpiProgressPctRaw(k)
    if (p != null && p >= 100) n++
  }
  return n
}

export function missionProgressPctRaw(m: CampaignMissionRow): number | null {
  const t = Number(m.target_value)
  if (!Number.isFinite(t) || t <= 0) return null
  const c = Number(m.current_value)
  return (100 * (Number.isFinite(c) ? c : 0)) / t
}

export function sortMissionsByProgress(
  missions: CampaignMissionRow[],
  order: 'asc' | 'desc',
): { row: CampaignMissionRow; pct: number }[] {
  const rows: { row: CampaignMissionRow; pct: number }[] = []
  for (const row of missions) {
    const p = missionProgressPctRaw(row)
    if (p == null) continue
    rows.push({ row, pct: p })
  }
  rows.sort((a, b) => (order === 'asc' ? a.pct - b.pct : b.pct - a.pct))
  return rows
}

export function buildLeadershipAttentionBullets(input: {
  kpiError: string | null
  kpiLoading: boolean
  kpis: CampaignKpiRow[]
  missions: CampaignMissionRow[]
  isLeadership: boolean
  weakest: { row: CampaignKpiRow; pctOfTarget: number } | null
  strongest: { row: CampaignKpiRow; pctOfTarget: number } | null
}): string[] {
  const out: string[] = []
  if (input.kpiError) {
    out.push(`KPI data could not load: ${input.kpiError}`)
  }
  if (!input.kpiLoading && input.kpis.length === 0 && !input.kpiError) {
    out.push(
      'No active KPIs for today’s date window — confirm campaign_kpis start/end dates and is_active in HQ tools.',
    )
  }

  const w = input.weakest
  if (w) {
    if (w.pctOfTarget < 50) {
      out.push(
        `Largest gap vs target: “${w.row.name}” is at ${w.pctOfTarget}% of its configured target — decide whether to lift execution, adjust the target, or narrow scope.`,
      )
    } else {
      out.push(
        `Trailing lane: “${w.row.name}” is at ${w.pctOfTarget}% of target — still the lowest in this active set.`,
      )
    }
  }

  const below50 = countKpisBelowThreshold(input.kpis, 50)
  if (below50 >= 2) {
    out.push(
      `${below50} KPIs are below half of target — one coordinated recovery plan usually beats parallel fixes.`,
    )
  }

  const s = input.strongest
  if (s && w && s.row.id !== w.row.id && s.pctOfTarget >= 75 && w.pctOfTarget < 35) {
    out.push(
      `Wide spread: “${s.row.name}” leads on paper (${s.pctOfTarget}% of target) while “${w.row.name}” lags — consider shifting principal visibility or proof points toward the weak lane.`,
    )
  }

  if (input.isLeadership && input.missions.length > 0) {
    const byAsc = sortMissionsByProgress(input.missions, 'asc')
    const worst = byAsc[0]
    if (worst && worst.pct < 40) {
      const r = Math.round(worst.pct * 10) / 10
      out.push(
        `Mission scaffold: “${worst.row.name}” is at ${r}% of its mission target — clarify HQ vs field ownership.`,
      )
    }
  }

  return [...new Set(out)]
}
