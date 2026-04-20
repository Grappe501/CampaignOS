import { useCallback, useEffect, useMemo, useState } from 'react'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import {
  fetchActiveKpis,
  fetchCampaignMissions,
  fetchUserKpiContribution,
  isCampaignLeadershipRole,
  type CampaignKpiRow,
  type CampaignMissionRow,
  type KpiUserContribution,
} from '../lib/kpiEngine'
import type { AgentJonesCampaignGoalsContext } from '../lib/agentJonesContextV2'

export function useCampaignKpis(
  campaignProfileId: string | undefined,
  primaryRole: string | null | undefined,
) {
  const [kpis, setKpis] = useState<CampaignKpiRow[]>([])
  const [missions, setMissions] = useState<CampaignMissionRow[]>([])
  const [contributions, setContributions] = useState<KpiUserContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLeadership = isCampaignLeadershipRole(primaryRole)

  const load = useCallback(async () => {
    if (isDevAuthBypassEnabled()) {
      setKpis(await fetchActiveKpis(12))
      setMissions([])
      setContributions([
        { kpi_slug: 'voter_contacts', contributed: 4 },
        { kpi_slug: 'power5_nodes', contributed: 2 },
      ])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [k, m, c] = await Promise.all([
        fetchActiveKpis(12),
        isLeadership ? fetchCampaignMissions() : Promise.resolve([] as CampaignMissionRow[]),
        fetchUserKpiContribution(campaignProfileId),
      ])
      setKpis(k)
      setMissions(m)
      setContributions(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load campaign goals')
    } finally {
      setLoading(false)
    }
  }, [campaignProfileId, isLeadership])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const agentCampaignGoals: AgentJonesCampaignGoalsContext | null = useMemo(() => {
    const top = kpis.slice(0, 5).map((row) => {
      const t = Number(row.target_value) || 1
      const c = Number(row.current_value) || 0
      const pct = Math.min(100, Math.round((100 * c) / t))
      return {
        slug: row.slug,
        name: row.name,
        current: c,
        target: t,
        unit: row.unit,
        pct,
      }
    })
    if (!top.length) return null
    return {
      kpis: top,
      user_contribution_summary:
        contributions.length > 0 ? contributions.slice(0, 8) : null,
    }
  }, [kpis, contributions])

  return {
    kpis,
    missions,
    contributions,
    loading,
    error,
    isLeadership,
    refetch: load,
    agentCampaignGoals,
  }
}
