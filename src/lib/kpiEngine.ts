import { supabase } from './supabaseClient'
import { isDevAuthBypassEnabled } from './devAuth'

export type CampaignKpiRow = {
  id: string
  slug: string
  name: string
  description: string | null
  target_value: number
  current_value: number
  unit: string
  start_date: string
  end_date: string
  is_active: boolean
}

export type CampaignMissionRow = {
  id: string
  kpi_id: string
  name: string
  description: string | null
  target_value: number
  current_value: number
  assigned_scope: string
}

export type KpiUserContribution = {
  kpi_slug: string
  contributed: number
}

/** Leadership: principal, HQ, or field leadership (missions + target tools where RLS allows). */
export function isCampaignLeadershipRole(role: string | null | undefined): boolean {
  const r = String(role ?? '').trim().toLowerCase()
  return (
    r === 'candidate' ||
    r === 'coordinator' ||
    r === 'staff' ||
    r === 'admin'
  )
}

export async function fetchActiveKpis(limit = 12): Promise<CampaignKpiRow[]> {
  if (isDevAuthBypassEnabled()) return getDevMockKpis()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('campaign_kpis')
    .select(
      'id, slug, name, description, target_value, current_value, unit, start_date, end_date, is_active',
    )
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('slug', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn('campaign_kpis:', error.message)
    return []
  }
  return (data ?? []) as CampaignKpiRow[]
}

export async function fetchCampaignMissions(): Promise<CampaignMissionRow[]> {
  if (isDevAuthBypassEnabled()) return []
  const { data, error } = await supabase
    .from('campaign_missions')
    .select(
      'id, kpi_id, name, description, target_value, current_value, assigned_scope',
    )
    .order('name', { ascending: true })

  if (error) {
    console.warn('campaign_missions:', error.message)
    return []
  }
  return (data ?? []) as CampaignMissionRow[]
}

/** Sum mission_progress by KPI slug for this profile. */
export async function fetchUserKpiContribution(
  campaignProfileId: string | undefined,
): Promise<KpiUserContribution[]> {
  if (isDevAuthBypassEnabled() || !campaignProfileId) return []
  const { data: progress, error: e1 } = await supabase
    .from('mission_progress')
    .select('mission_id, progress_value')
    .eq('campaign_profile_id', campaignProfileId)

  if (e1) {
    console.warn('mission_progress:', e1.message)
    return []
  }
  const rows = progress ?? []
  if (rows.length === 0) return []

  const missionIds = [...new Set(rows.map((r) => r.mission_id).filter(Boolean))]
  const { data: missions, error: e2 } = await supabase
    .from('campaign_missions')
    .select('id, kpi_id')
    .in('id', missionIds as string[])

  if (e2) {
    console.warn('campaign_missions:', e2.message)
    return []
  }
  const missionToKpi = new Map(
    (missions ?? []).map((m) => [m.id as string, m.kpi_id as string]),
  )
  const kpiIds = [...new Set([...missionToKpi.values()])]
  const { data: kpis, error: e3 } = await supabase
    .from('campaign_kpis')
    .select('id, slug')
    .in('id', kpiIds)

  if (e3) {
    console.warn('campaign_kpis:', e3.message)
    return []
  }
  const kpiSlug = new Map((kpis ?? []).map((k) => [k.id as string, k.slug as string]))

  const bySlug = new Map<string, number>()
  for (const r of rows) {
    const kid = missionToKpi.get(r.mission_id as string)
    const slug = kid ? kpiSlug.get(kid) : undefined
    const v = Number(r.progress_value ?? 0)
    if (!slug) continue
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + v)
  }
  return [...bySlug.entries()].map(([kpi_slug, contributed]) => ({
    kpi_slug,
    contributed,
  }))
}

export async function leadershipSetKpiTarget(
  kpiId: string,
  targetValue: number,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('kpi_leadership_set_target', {
    p_kpi_id: kpiId,
    p_target_value: targetValue,
  })
  if (error) {
    console.warn('kpi_leadership_set_target:', error.message)
    return false
  }
  return true
}

export async function leadershipManualKpiDelta(
  kpiId: string,
  delta: number,
  note?: string | null,
): Promise<boolean> {
  if (isDevAuthBypassEnabled()) return false
  const { error } = await supabase.rpc('kpi_leadership_manual_delta', {
    p_kpi_id: kpiId,
    p_delta: delta,
    p_note: note ?? null,
  })
  if (error) {
    console.warn('kpi_leadership_manual_delta:', error.message)
    return false
  }
  return true
}

/** @deprecated Server applies on task complete; use for documentation/tests only. */
export async function updateFromTask(_taskId: string): Promise<void> {
  void _taskId
}

export async function getKpiProgress(): Promise<CampaignKpiRow[]> {
  return fetchActiveKpis(50)
}

export async function getMissionProgress(): Promise<CampaignMissionRow[]> {
  return fetchCampaignMissions()
}

export async function updateKpi(kpiId: string, valueDelta: number): Promise<boolean> {
  return leadershipManualKpiDelta(kpiId, valueDelta, 'client')
}

function getDevMockKpis(): CampaignKpiRow[] {
  return [
    {
      id: 'dev-k1',
      slug: 'volunteers',
      name: 'Volunteer sign-ups',
      description: '',
      target_value: 20000,
      current_value: 120,
      unit: 'volunteers',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
    },
    {
      id: 'dev-k2',
      slug: 'fundraising',
      name: 'Grassroots fundraising',
      description: '',
      target_value: 2000000,
      current_value: 45000,
      unit: 'dollars',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
    },
    {
      id: 'dev-k3',
      slug: 'voter_contacts',
      name: 'Voter contacts',
      description: '',
      target_value: 100000,
      current_value: 2100,
      unit: 'contacts',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
    },
    {
      id: 'dev-k4',
      slug: 'power5_nodes',
      name: 'Power of 5 relationships',
      description: '',
      target_value: 5000,
      current_value: 380,
      unit: 'power5_nodes',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: true,
    },
  ]
}
