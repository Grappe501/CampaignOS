import { supabase } from './supabaseClient'
import { normalizeKey } from './dashboardState'

const DEFAULT_SLUG = 'chris-jones-for-congress'

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export type OnboardingBriefForAgent = {
  flowSteps: string[]
  welcomePurpose?: string
  howWeWork?: string
  howWeGrow?: string
  pickLane?: string
  firstActions?: string
  messaging?: string
  escalation?: string
  valueTitles?: string[]
  laneOptions?: { key: string; title: string; summary?: string; firstAction?: string }[]
  talkTrackTitles?: string[]
}

/** Granular onboarding + lane model for Agent Jones (tight payload). */
export async function getOnboardingBriefForAgent(input: {
  campaignSlug?: string
  onboardingBranch?: string | null
}): Promise<OnboardingBriefForAgent | null> {
  const slug = (input.campaignSlug ?? DEFAULT_SLUG).trim() || DEFAULT_SLUG
  const branch = normalizeKey(input.onboardingBranch)

  const { data: modulesData } = await supabase
    .from('campaign_onboarding_modules')
    .select('id,module_key,title,sort_order')
    .eq('campaign_slug', slug)
    .order('sort_order', { ascending: true })

  const modules = (modulesData ?? []) as {
    id: string
    module_key: string
    title: string
    sort_order: number
  }[]
  if (!modules.length) return null

  const moduleIdByKey = new Map(modules.map((m) => [m.module_key, m.id] as const))

  const [
    { data: sectionsData },
    { data: valuesData },
    { data: lanesData },
    { data: actionsData },
    { data: tracksData },
  ] = await Promise.all([
    supabase
      .from('campaign_onboarding_sections')
      .select('module_id,section_key,title,body_md,sort_order')
      .eq('campaign_slug', slug)
      .order('sort_order', { ascending: true }),
    supabase
      .from('campaign_values')
      .select('title')
      .eq('campaign_slug', slug)
      .order('sort_order', { ascending: true })
      .limit(8),
    supabase
      .from('volunteer_lanes')
      .select('id,lane_key,title,summary,related_onboarding_branch_hints,sort_order')
      .eq('campaign_slug', slug)
      .order('sort_order', { ascending: true }),
    supabase
      .from('volunteer_first_actions')
      .select('lane_id,title,body_md,sort_order')
      .limit(200),
    supabase
      .from('volunteer_talk_tracks')
      .select('title')
      .eq('campaign_slug', slug)
      .order('sort_order', { ascending: true })
      .limit(6),
  ])

  const sections = (sectionsData ?? []) as {
    module_id: string
    section_key: string
    title: string | null
    body_md: string
    sort_order: number
  }[]

  function bodyForModule(key: string): string {
    const mid = moduleIdByKey.get(key)
    if (!mid) return ''
    const parts = sections
      .filter((s) => s.module_id === mid)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => s.body_md)
    return trunc(parts.join('\n\n'), 900)
  }

  const flowSteps = modules.map((m) => m.title)

  const lanes = (lanesData ?? []) as {
    id: string
    lane_key: string
    title: string
    summary: string | null
    related_onboarding_branch_hints: string[] | null
    sort_order: number
  }[]

  const actions = (actionsData ?? []) as {
    lane_id: string
    title: string
    body_md: string
    sort_order: number
  }[]

  const filteredLanes = branch
    ? lanes.filter((l) => {
        const hints = l.related_onboarding_branch_hints ?? []
        if (hints.length === 0) return true
        return hints.some((h) => normalizeKey(h) === branch)
      })
    : lanes

  const lanePick = (filteredLanes.length ? filteredLanes : lanes).slice(0, 5)

  const laneOptions = lanePick.map((l) => {
    const first = actions
      .filter((a) => a.lane_id === l.id)
      .sort((a, b) => a.sort_order - b.sort_order)[0]
    return {
      key: l.lane_key,
      title: l.title,
      summary: l.summary ? trunc(l.summary, 220) : undefined,
      firstAction: first ? trunc(`${first.title}: ${first.body_md}`, 280) : undefined,
    }
  })

  const valueTitles = (valuesData ?? []).map((r: { title: string }) => r.title)
  const talkTrackTitles = (tracksData ?? []).map((r: { title: string }) => r.title)

  return {
    flowSteps,
    welcomePurpose: trunc(bodyForModule('welcome_purpose'), 520),
    howWeWork: trunc(bodyForModule('how_we_work_together'), 520),
    howWeGrow: trunc(bodyForModule('how_we_grow'), 520),
    pickLane: trunc(bodyForModule('pick_your_lane'), 420),
    firstActions: trunc(bodyForModule('first_actions'), 420),
    messaging: trunc(bodyForModule('messaging_show_up'), 520),
    escalation: trunc(bodyForModule('escalation_when_unsure'), 360),
    valueTitles: valueTitles.length ? valueTitles : undefined,
    laneOptions: laneOptions.length ? laneOptions : undefined,
    talkTrackTitles: talkTrackTitles.length ? talkTrackTitles : undefined,
  }
}
