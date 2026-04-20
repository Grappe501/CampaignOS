/**
 * Agent Jones — server-side OpenAI only. No DB, no Twilio/SendGrid.
 * Env: OPENAI_API_KEY (required), OPENAI_MODEL (optional, default gpt-4o-mini).
 *
 * Context shape mirrors `src/lib/agentJonesContext.ts` but is validated here
 * independently so this bundle stays self-contained.
 */

type AgentJonesOnboardingBrief = {
  flowSteps?: string[]
  welcomePurpose?: string
  howWeWork?: string
  howWeGrow?: string
  pickLane?: string
  firstActions?: string
  messaging?: string
  escalation?: string
  valueTitles?: string[]
  laneOptions?: {
    key: string
    title: string
    summary?: string
    firstAction?: string
  }[]
  talkTrackTitles?: string[]
}

type AgentJonesRelationalPower5Safe = {
  network_counts: {
    identified_total: number
    contacted: number
    activated: number
    roster_matched: number
  }
  early_stage_count: number
  open_manual_relays: number
  recommended_next: string | null
}

type AgentJonesVolunteerMissionSafe = {
  active_summaries: {
    title: string
    status: string
    templateKey: string
    why_points: number
  }[]
  next_best_title: string | null
  next_best_template_key: string | null
  recent_completed: { title: string; completed_at: string }[]
  stalled_titles: string[]
  points?: number
  streaks?: { active_days: number; completion_days: number }
}

type AgentJonesDailyActivationSafe = {
  completed_today: number
  total_today: number
  points_today: number
  team_tier_label: string | null
  next_task_title: string | null
  total_points?: number
  streak_days?: number
  progression_stage?: 'new' | 'active' | 'advanced'
  top_lane?: string | null
  growth_lane?: string | null
  lane_scores?: {
    communications: number
    voter: number
    events: number
    leadership: number
  }
  reliability_score?: number
  consistency_score?: number
  momentum_score?: number
  assignment_hint?: string | null
}

type AgentJonesInternLayerSafe = {
  assigned_pipeline_count: number
  overdue_first_contact_count: number
  next_follow_up_hint: string | null
  leadership_task_title: string | null
}

type AgentJonesCampaignGoalsSafe = {
  kpis: {
    slug: string
    name: string
    current: number
    target: number
    unit: string
    pct: number
  }[]
  user_contribution_summary: { slug: string; contributed: number }[] | null
}

type AgentJonesCoordinatorOpsSafe = {
  has_supervisor_scope: boolean
  supervised_team_count: number
  open_assignments_total: number
  blocked_count: number
  overdue_count: number
  in_progress_count: number
  assigned_not_started_count: number
  intern_pipelines_active: number | null
  intern_pipelines_escalated: number | null
  intern_overdue_first_contact: number | null
  desk_loading: boolean
}

type AgentJonesLeadershipSnapshotSafe = {
  active_kpi_count: number
  kpi_mean_progress_pct: number | null
  kpis_below_half_target: number
  weakest_kpi_name: string | null
  weakest_kpi_pct_of_target: number | null
  missions_visible_count: number
}

type AgentJonesSurfaceSafe =
  | 'volunteer_dashboard'
  | 'intern_desk'
  | 'coordinator_desk'
  | 'candidate_desk'

type AgentJonesSafeContextV2 = {
  surface: AgentJonesSurfaceSafe
  user: {
    role?: string | null
    onboarding_status?: string | null
    onboarding_branch?: string | null
    onboarding_momentum_state?: string | null
    onboarding_direction_key?: string | null
    onboarding_micro_commitment_key?: string | null
    onboarding_last_prompt?: string | null
    onboarding_last_action_at?: string | null
    voterMatched: boolean
    precinct?: string | null
    county?: string | null
    congressional_district?: string | null
    state_senate_district?: string | null
    state_representative_district?: string | null
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    onboardingBrief?: AgentJonesOnboardingBrief
  }
  operational: {
    progressSlice:
      | 'unmatched'
      | 'matched_no_branch'
      | 'exception_pending'
      | 'matched_ready'
    voterLoading: boolean
    needsOnboardingPath: boolean
  }
  relational_power5?: AgentJonesRelationalPower5Safe
  volunteer_mission?: AgentJonesVolunteerMissionSafe
  daily_activation?: AgentJonesDailyActivationSafe
  intern_layer?: AgentJonesInternLayerSafe
  campaign_goals?: AgentJonesCampaignGoalsSafe
  coordinator_ops?: AgentJonesCoordinatorOpsSafe
  leadership_snapshot?: AgentJonesLeadershipSnapshotSafe
}

type AgentJonesSafeContextLegacy = {
  progressSlice:
    | 'unmatched'
    | 'matched_no_branch'
    | 'exception_pending'
    | 'matched_ready'
  voterLoading: boolean
  profileHints?: {
    onboarding_branch?: string
    onboarding_status?: string
    active_space?: string
    exception_request_status?: string
    voter_status?: string
  }
  campaign?: {
    slogan?: string
    shortBio?: string
    issuePillars?: { title: string; summary: string }[]
    ctas?: { label: string; url: string }[]
    onboardingBrief?: AgentJonesOnboardingBrief
    contact?: { addressLabel?: string; addressUrl?: string }
    social?: { platform: string; label: string; url: string }[]
  }
  currentTaskTitle?: string
  currentTaskStatus?: string
  currentTrainingTitle?: string
  currentTrainingStatus?: string
}

type RequestBody = {
  context: AgentJonesSafeContextV2 | AgentJonesSafeContextLegacy
  /** Short line, normally a deterministic prompt label from the UI */
  userMessage: string
  model?: string
}

type NetlifyEvent = {
  httpMethod?: string
  body?: string | null
}

type NetlifyResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const MAX_USER_MESSAGE = 600

const SLICES = new Set([
  'unmatched',
  'matched_no_branch',
  'exception_pending',
  'matched_ready',
])

const ONBOARDING_DIR_SLUGS = new Set([
  'talk_to_people',
  'show_up_locally',
  'help_behind_the_scenes',
  'spread_the_word',
])

const SCROLL_IDS = new Set([
  'voter-workspace',
  'power5-workspace',
  'exception-request',
  'onboarding-branch',
  'onboarding-activation',
  'workspace-cards',
  'mission-tasks',
  'daily-activation',
  'intern-desk',
  'campaign-kpis',
  'agent-jones',
  'coordinator-mission-ops',
  'candidate-health-snapshot',
])

const NAV_PATHS = new Set(['/', '/dashboard', '/intern', '/coordinator', '/candidate'])

const SURFACES = new Set<AgentJonesSurfaceSafe>([
  'volunteer_dashboard',
  'intern_desk',
  'coordinator_desk',
  'candidate_desk',
])

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(statusCode: number, body: unknown): NetlifyResponse {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function validateProfileHints(
  raw: unknown,
): AgentJonesSafeContextLegacy['profileHints'] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: NonNullable<AgentJonesSafeContextLegacy['profileHints']> = {}
  const keys = [
    'onboarding_branch',
    'onboarding_status',
    'active_space',
    'exception_request_status',
    'voter_status',
  ] as const
  for (const k of keys) {
    const v = raw[k]
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t || t.length > 128) continue
    out[k] = t
  }
  return Object.keys(out).length ? out : undefined
}

function validateSummaryLine(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t || t.length > max) return undefined
  if (/[<>\\]/.test(t)) return undefined
  return t
}

function validateUrl(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if (!t || t.length > max) return undefined
  if (!/^https?:\/\//i.test(t)) return undefined
  if (/[<>\\"']/u.test(t)) return undefined
  return t
}

function validateOnboardingBrief(raw: unknown): AgentJonesOnboardingBrief | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesOnboardingBrief = {}

  const fsRaw = raw.flowSteps
  if (Array.isArray(fsRaw)) {
    const flowSteps: string[] = []
    for (const item of fsRaw.slice(0, 8)) {
      const line = validateSummaryLine(item, 80)
      if (line) flowSteps.push(line)
    }
    if (flowSteps.length) out.flowSteps = flowSteps
  }

  const strKeys = [
    'welcomePurpose',
    'howWeWork',
    'howWeGrow',
    'pickLane',
    'firstActions',
    'messaging',
    'escalation',
  ] as const
  for (const k of strKeys) {
    const v = validateSummaryLine(raw[k], 620)
    if (v) out[k] = v
  }

  const vtRaw = raw.valueTitles
  if (Array.isArray(vtRaw)) {
    const valueTitles: string[] = []
    for (const item of vtRaw.slice(0, 10)) {
      const line = validateSummaryLine(item, 72)
      if (line) valueTitles.push(line)
    }
    if (valueTitles.length) out.valueTitles = valueTitles
  }

  const ttRaw = raw.talkTrackTitles
  if (Array.isArray(ttRaw)) {
    const talkTrackTitles: string[] = []
    for (const item of ttRaw.slice(0, 8)) {
      const line = validateSummaryLine(item, 80)
      if (line) talkTrackTitles.push(line)
    }
    if (talkTrackTitles.length) out.talkTrackTitles = talkTrackTitles
  }

  const loRaw = raw.laneOptions
  if (Array.isArray(loRaw)) {
    const laneOptions: NonNullable<AgentJonesOnboardingBrief['laneOptions']> = []
    for (const item of loRaw.slice(0, 5)) {
      if (!isRecord(item)) continue
      const key = validateSummaryLine(item.key, 48)
      const title = validateSummaryLine(item.title, 88)
      if (!key || !title) continue
      const summary = validateSummaryLine(item.summary, 240)
      const firstAction = validateSummaryLine(item.firstAction, 320)
      laneOptions.push({
        key,
        title,
        ...(summary ? { summary } : {}),
        ...(firstAction ? { firstAction } : {}),
      })
    }
    if (laneOptions.length) out.laneOptions = laneOptions
  }

  return Object.keys(out).length ? out : undefined
}

function validateCampaign(
  raw: unknown,
): AgentJonesSafeContextLegacy['campaign'] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined

  const slogan = validateSummaryLine(raw.slogan, 140)
  const shortBio = validateSummaryLine(raw.shortBio, 520)

  const issuePillarsRaw = raw.issuePillars
  const issuePillars: { title: string; summary: string }[] = []
  if (Array.isArray(issuePillarsRaw)) {
    for (const item of issuePillarsRaw.slice(0, 8)) {
      if (!isRecord(item)) continue
      const title = validateSummaryLine(item.title, 80)
      const summary = validateSummaryLine(item.summary, 240)
      if (!title || !summary) continue
      issuePillars.push({ title, summary })
    }
  }

  const ctasRaw = raw.ctas
  const ctas: { label: string; url: string }[] = []
  if (Array.isArray(ctasRaw)) {
    for (const item of ctasRaw.slice(0, 8)) {
      if (!isRecord(item)) continue
      const label = validateSummaryLine(item.label, 80)
      const url = validateUrl(item.url, 240)
      if (!label || !url) continue
      ctas.push({ label, url })
    }
  }

  const contactRaw = raw.contact
  const contact =
    isRecord(contactRaw)
      ? {
          addressLabel: validateSummaryLine(contactRaw.addressLabel, 180),
          addressUrl: validateUrl(contactRaw.addressUrl, 240),
        }
      : undefined

  const socialRaw = raw.social
  const social: { platform: string; label: string; url: string }[] = []
  if (Array.isArray(socialRaw)) {
    for (const item of socialRaw.slice(0, 12)) {
      if (!isRecord(item)) continue
      const platform = validateSummaryLine(item.platform, 32)
      const label = validateSummaryLine(item.label, 48)
      const url = validateUrl(item.url, 240)
      if (!platform || !label || !url) continue
      social.push({ platform, label, url })
    }
  }

  const out: NonNullable<AgentJonesSafeContextLegacy['campaign']> = {}
  if (slogan) out.slogan = slogan
  if (shortBio) out.shortBio = shortBio
  if (issuePillars.length) out.issuePillars = issuePillars
  if (ctas.length) out.ctas = ctas
  if (contact && (contact.addressLabel || contact.addressUrl)) out.contact = contact
  if (social.length) out.social = social

  const onboardingBrief = validateOnboardingBrief(raw.onboardingBrief)
  if (onboardingBrief) out.onboardingBrief = onboardingBrief

  return Object.keys(out).length ? out : undefined
}

function validateUser(raw: unknown): AgentJonesSafeContextV2['user'] | null {
  if (!isRecord(raw)) return null
  if (typeof raw.voterMatched !== 'boolean') return null
  const out: AgentJonesSafeContextV2['user'] = { voterMatched: raw.voterMatched }
  const keys = [
    'role',
    'onboarding_status',
    'onboarding_branch',
    'onboarding_momentum_state',
    'onboarding_direction_key',
    'onboarding_micro_commitment_key',
    'precinct',
    'county',
    'congressional_district',
    'state_senate_district',
    'state_representative_district',
  ] as const
  for (const k of keys) {
    const v = raw[k]
    if (v === null || v === undefined) continue
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t || t.length > 140) continue
    if (/[<>\\]/.test(t)) continue
    ;(out as Record<string, unknown>)[k] = t
  }

  const lp = raw.onboarding_last_prompt
  if (typeof lp === 'string') {
    const t = lp.trim()
    if (t && t.length <= 160 && !/[<>\\]/.test(t)) {
      out.onboarding_last_prompt = t
    }
  }
  const la = raw.onboarding_last_action_at
  if (typeof la === 'string') {
    const t = la.trim()
    if (t && t.length <= 48 && !/[<>\\]/.test(t)) {
      out.onboarding_last_action_at = t
    }
  }

  return out
}

function validateVolunteerMission(
  raw: unknown,
): AgentJonesVolunteerMissionSafe | undefined {
  if (raw === null || raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  const activeRaw = raw.active_summaries
  if (activeRaw !== undefined && !Array.isArray(activeRaw)) return undefined
  const active_summaries: AgentJonesVolunteerMissionSafe['active_summaries'] = []
  for (const item of (Array.isArray(activeRaw) ? activeRaw : []).slice(0, 4)) {
    if (!isRecord(item)) continue
    const title = validateSummaryLine(item.title, 160)
    const status = validateSummaryLine(item.status, 40)
    const templateKey = validateSummaryLine(item.templateKey, 80)
    const wp = item.why_points
    if (!title || !status || !templateKey) continue
    if (typeof wp !== 'number' || wp < 0 || wp > 50) continue
    active_summaries.push({ title, status, templateKey, why_points: Math.floor(wp) })
  }
  let next_best_title: string | null = null
  const nbt = raw.next_best_title
  if (typeof nbt === 'string') {
    const t = nbt.trim()
    if (t && t.length <= 160 && !/[<>\\]/.test(t)) next_best_title = t
  } else if (nbt === null) {
    next_best_title = null
  }
  let next_best_template_key: string | null = null
  const ntk = raw.next_best_template_key
  if (typeof ntk === 'string') {
    const t = ntk.trim()
    if (t && t.length <= 80 && !/[<>\\]/.test(t)) next_best_template_key = t
  } else if (ntk === null) {
    next_best_template_key = null
  }
  const recentRaw = raw.recent_completed
  const recent_completed: AgentJonesVolunteerMissionSafe['recent_completed'] = []
  if (Array.isArray(recentRaw)) {
    for (const item of recentRaw.slice(0, 4)) {
      if (!isRecord(item)) continue
      const title = validateSummaryLine(item.title, 160)
      const completed_at = validateSummaryLine(item.completed_at, 48)
      if (!title || !completed_at) continue
      recent_completed.push({ title, completed_at })
    }
  }
  const stalledRaw = raw.stalled_titles
  const stalled_titles: string[] = []
  if (Array.isArray(stalledRaw)) {
    for (const item of stalledRaw.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim()
      if (t && t.length <= 160 && !/[<>\\]/.test(t)) stalled_titles.push(t)
    }
  }
  let points: number | undefined
  const pr = raw.points
  if (typeof pr === 'number' && pr >= 0 && pr <= 1_000_000) points = Math.floor(pr)
  let streaks: AgentJonesVolunteerMissionSafe['streaks'] | undefined
  const sr = raw.streaks
  if (isRecord(sr)) {
    const ad = sr.active_days
    const cd = sr.completion_days
    if (
      typeof ad === 'number' &&
      typeof cd === 'number' &&
      ad >= 0 &&
      ad <= 10_000 &&
      cd >= 0 &&
      cd <= 10_000
    ) {
      streaks = { active_days: Math.floor(ad), completion_days: Math.floor(cd) }
    }
  }
  const out: AgentJonesVolunteerMissionSafe = {
    active_summaries,
    next_best_title,
    next_best_template_key,
    recent_completed,
    stalled_titles,
  }
  if (points !== undefined) out.points = points
  if (streaks) out.streaks = streaks
  if (
    !active_summaries.length &&
    next_best_title === null &&
    !recent_completed.length &&
    !stalled_titles.length &&
    points === undefined &&
    !streaks
  ) {
    return undefined
  }
  return out
}

const DAILY_TIER_LABELS = new Set(['#1', 'Top 5', 'Top 10', 'Top 25'])

const ADAPTIVE_LANES = new Set(['communications', 'voter', 'events', 'leadership'])

const PROGRESSION_STAGES = new Set(['new', 'active', 'advanced'])

function validateDailyActivation(
  raw: unknown,
): AgentJonesDailyActivationSafe | undefined {
  if (raw === null || raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  const ct = raw.completed_today
  const tt = raw.total_today
  const pt = raw.points_today
  if (typeof ct !== 'number' || typeof tt !== 'number' || typeof pt !== 'number') return undefined
  if (ct < 0 || ct > 12 || tt < 0 || tt > 12 || pt < 0 || pt > 500) return undefined
  if (ct > tt) return undefined
  let team_tier_label: string | null = null
  const tl = raw.team_tier_label
  if (typeof tl === 'string') {
    const s = tl.trim()
    if (s && DAILY_TIER_LABELS.has(s)) team_tier_label = s
  } else if (tl !== null && tl !== undefined) {
    return undefined
  }
  let next_task_title: string | null = null
  const ntt = raw.next_task_title
  if (typeof ntt === 'string') {
    const t = ntt.trim()
    if (t && t.length <= 160 && !/[<>\\]/.test(t)) next_task_title = t
    else if (t) return undefined
  } else if (ntt === null || ntt === undefined) {
    next_task_title = null
  } else {
    return undefined
  }
  let total_points: number | undefined
  const tpr = raw.total_points
  if (typeof tpr === 'number' && tpr >= 0 && tpr <= 1_000_000) total_points = Math.floor(tpr)
  let streak_days: number | undefined
  const sd = raw.streak_days
  if (typeof sd === 'number' && sd >= 0 && sd <= 10_000) streak_days = Math.floor(sd)
  const out: AgentJonesDailyActivationSafe = {
    completed_today: Math.floor(ct),
    total_today: Math.floor(tt),
    points_today: Math.floor(pt),
    team_tier_label,
    next_task_title,
  }
  if (total_points !== undefined) out.total_points = total_points
  if (streak_days !== undefined) out.streak_days = streak_days

  const ps = raw.progression_stage
  if (typeof ps === 'string' && PROGRESSION_STAGES.has(ps)) {
    out.progression_stage = ps as AgentJonesDailyActivationSafe['progression_stage']
  } else if (ps !== null && ps !== undefined) {
    return undefined
  }

  const validateLaneField = (v: unknown): string | null | undefined => {
    if (v === null || v === undefined) return v === null ? null : undefined
    if (typeof v !== 'string') return undefined
    const s = v.trim()
    if (!s || !ADAPTIVE_LANES.has(s)) return undefined
    return s
  }
  const tlane = validateLaneField(raw.top_lane)
  if (tlane === undefined && raw.top_lane !== undefined && raw.top_lane !== null) return undefined
  if (tlane !== undefined) out.top_lane = tlane

  const glane = validateLaneField(raw.growth_lane)
  if (glane === undefined && raw.growth_lane !== undefined && raw.growth_lane !== null) return undefined
  if (glane !== undefined) out.growth_lane = glane

  const ls = raw.lane_scores
  if (ls !== null && ls !== undefined) {
    if (!isRecord(ls)) return undefined
    const c = ls.communications
    const vo = ls.voter
    const ev = ls.events
    const le = ls.leadership
    if (
      typeof c !== 'number' ||
      typeof vo !== 'number' ||
      typeof ev !== 'number' ||
      typeof le !== 'number'
    ) {
      return undefined
    }
    if (c < 0 || c > 100 || vo < 0 || vo > 100 || ev < 0 || ev > 100 || le < 0 || le > 100) {
      return undefined
    }
    out.lane_scores = {
      communications: Math.round(c * 100) / 100,
      voter: Math.round(vo * 100) / 100,
      events: Math.round(ev * 100) / 100,
      leadership: Math.round(le * 100) / 100,
    }
  }

  const numSig = (x: unknown): number | undefined => {
    if (typeof x !== 'number' || x < 0 || x > 100) return undefined
    return Math.round(x * 100) / 100
  }
  const rel = numSig(raw.reliability_score)
  if (rel !== undefined) out.reliability_score = rel
  else if (raw.reliability_score !== undefined && raw.reliability_score !== null) return undefined

  const con = numSig(raw.consistency_score)
  if (con !== undefined) out.consistency_score = con
  else if (raw.consistency_score !== undefined && raw.consistency_score !== null) return undefined

  const mom = numSig(raw.momentum_score)
  if (mom !== undefined) out.momentum_score = mom
  else if (raw.momentum_score !== undefined && raw.momentum_score !== null) return undefined

  const ah = raw.assignment_hint
  if (typeof ah === 'string') {
    const t = ah.trim()
    if (t.length > 280 || /[<>\\]/.test(t)) return undefined
    if (t) out.assignment_hint = t
  } else if (ah === null) {
    out.assignment_hint = null
  } else if (ah !== undefined) {
    return undefined
  }

  if (
    out.total_today === 0 &&
    out.completed_today === 0 &&
    out.next_task_title === null &&
    out.team_tier_label === null &&
    total_points === undefined &&
    streak_days === undefined &&
    out.progression_stage === undefined &&
    out.top_lane === undefined &&
    out.growth_lane === undefined &&
    out.lane_scores === undefined &&
    out.reliability_score === undefined &&
    out.consistency_score === undefined &&
    out.momentum_score === undefined &&
    out.assignment_hint === undefined
  ) {
    return undefined
  }
  return out
}

function validateInternLayer(raw: unknown): AgentJonesInternLayerSafe | undefined {
  if (raw === null || raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  const ap = raw.assigned_pipeline_count
  const od = raw.overdue_first_contact_count
  if (typeof ap !== 'number' || typeof od !== 'number') return undefined
  if (ap < 0 || ap > 500 || od < 0 || od > 500) return undefined
  let next_follow_up_hint: string | null = null
  const nh = raw.next_follow_up_hint
  if (typeof nh === 'string') {
    const t = nh.trim()
    if (t.length > 360 || /[<>\\]/.test(t)) return undefined
    next_follow_up_hint = t || null
  } else if (nh === null) {
    next_follow_up_hint = null
  } else if (nh !== undefined) {
    return undefined
  }
  let leadership_task_title: string | null = null
  const lt = raw.leadership_task_title
  if (typeof lt === 'string') {
    const t = lt.trim()
    if (t.length > 160 || /[<>\\]/.test(t)) return undefined
    leadership_task_title = t || null
  } else if (lt === null) {
    leadership_task_title = null
  } else if (lt !== undefined) {
    return undefined
  }
  const out: AgentJonesInternLayerSafe = {
    assigned_pipeline_count: Math.floor(ap),
    overdue_first_contact_count: Math.floor(od),
    next_follow_up_hint,
    leadership_task_title,
  }
  if (
    out.assigned_pipeline_count === 0 &&
    out.overdue_first_contact_count === 0 &&
    out.next_follow_up_hint === null &&
    out.leadership_task_title === null
  ) {
    return undefined
  }
  return out
}

function validateCampaignGoals(raw: unknown): AgentJonesCampaignGoalsSafe | undefined {
  if (raw === null || raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  const kpisRaw = raw.kpis
  if (!Array.isArray(kpisRaw) || kpisRaw.length === 0) return undefined
  const kpis: AgentJonesCampaignGoalsSafe['kpis'] = []
  for (const item of kpisRaw.slice(0, 8)) {
    if (!isRecord(item)) return undefined
    const slug = typeof item.slug === 'string' ? item.slug.trim().slice(0, 64) : ''
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 120) : ''
    const unit = typeof item.unit === 'string' ? item.unit.trim().slice(0, 32) : ''
    if (!slug || !name || !unit) return undefined
    if (typeof item.current !== 'number' || typeof item.target !== 'number') return undefined
    if (typeof item.pct !== 'number') return undefined
    if (
      item.current < 0 ||
      item.current > 1e12 ||
      item.target < 0 ||
      item.target > 1e12 ||
      item.pct < 0 ||
      item.pct > 100
    ) {
      return undefined
    }
    kpis.push({
      slug,
      name,
      current: Math.round(item.current * 100) / 100,
      target: Math.round(item.target * 100) / 100,
      unit,
      pct: Math.floor(item.pct),
    })
  }
  if (!kpis.length) return undefined

  let user_contribution_summary: AgentJonesCampaignGoalsSafe['user_contribution_summary'] = null
  const uc = raw.user_contribution_summary
  if (uc === null) {
    user_contribution_summary = null
  } else if (Array.isArray(uc)) {
    const rows: { slug: string; contributed: number }[] = []
    for (const row of uc.slice(0, 8)) {
      if (!isRecord(row)) return undefined
      const s = typeof row.slug === 'string' ? row.slug.trim().slice(0, 64) : ''
      if (!s || typeof row.contributed !== 'number') return undefined
      if (row.contributed < 0 || row.contributed > 1e9) return undefined
      rows.push({ slug: s, contributed: Math.round(row.contributed * 100) / 100 })
    }
    user_contribution_summary = rows.length ? rows : null
  } else if (uc !== undefined) {
    return undefined
  }

  return { kpis, user_contribution_summary }
}

function validateRelationalPower5(
  raw: unknown,
): AgentJonesRelationalPower5Safe | undefined {
  if (raw === null || raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  const nc = raw.network_counts
  if (!isRecord(nc)) return undefined
  const identified = nc.identified_total
  const contacted = nc.contacted
  const activated = nc.activated
  const roster = nc.roster_matched
  if (typeof identified !== 'number' || identified < 0 || identified > 5000) return undefined
  if (typeof contacted !== 'number' || contacted < 0 || contacted > 5000) return undefined
  if (typeof activated !== 'number' || activated < 0 || activated > 5000) return undefined
  if (typeof roster !== 'number' || roster < 0 || roster > 5000) return undefined
  const early = raw.early_stage_count
  const relays = raw.open_manual_relays
  if (typeof early !== 'number' || early < 0 || early > 5000) return undefined
  if (typeof relays !== 'number' || relays < 0 || relays > 5000) return undefined
  let recommended_next: string | null = null
  const rn = raw.recommended_next
  if (typeof rn === 'string') {
    const t = rn.trim()
    if (t && t.length <= 200 && !/[<>\\]/.test(t)) recommended_next = t
  } else if (rn === null) {
    recommended_next = null
  }
  return {
    network_counts: {
      identified_total: Math.floor(identified),
      contacted: Math.floor(contacted),
      activated: Math.floor(activated),
      roster_matched: Math.floor(roster),
    },
    early_stage_count: Math.floor(early),
    open_manual_relays: Math.floor(relays),
    recommended_next,
  }
}

function validateOperational(
  raw: unknown,
): AgentJonesSafeContextV2['operational'] | null {
  if (!isRecord(raw)) return null
  const slice = raw.progressSlice
  const voterLoading = raw.voterLoading
  const needs = raw.needsOnboardingPath
  if (typeof slice !== 'string' || !SLICES.has(slice)) return null
  if (typeof voterLoading !== 'boolean') return null
  if (typeof needs !== 'boolean') return null
  return {
    progressSlice: slice as AgentJonesSafeContextV2['operational']['progressSlice'],
    voterLoading,
    needsOnboardingPath: needs,
  }
}

function validateSurfaceRaw(raw: unknown): AgentJonesSurfaceSafe {
  if (typeof raw !== 'string') return 'volunteer_dashboard'
  const t = raw.trim()
  if (SURFACES.has(t as AgentJonesSurfaceSafe)) return t as AgentJonesSurfaceSafe
  return 'volunteer_dashboard'
}

function validateCoordinatorOpsRaw(
  raw: unknown,
): AgentJonesCoordinatorOpsSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const b = (k: string) => {
    const v = raw[k]
    return typeof v === 'boolean' ? v : undefined
  }
  const nn = (k: string, max: number) => {
    const v = raw[k]
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const n = Math.floor(v)
    if (n < 0 || n > max) return undefined
    return n
  }
  const nullOrNn = (k: string, max: number): number | null | undefined => {
    const v = raw[k]
    if (v === null) return null
    const n = nn(k, max)
    return n
  }
  const hs = b('has_supervisor_scope')
  const dl = b('desk_loading')
  const st = nn('supervised_team_count', 50)
  const ot = nn('open_assignments_total', 50_000)
  const bc = nn('blocked_count', 50_000)
  const oc = nn('overdue_count', 50_000)
  const ip = nn('in_progress_count', 50_000)
  const as = nn('assigned_not_started_count', 50_000)
  if (
    hs === undefined ||
    dl === undefined ||
    st === undefined ||
    ot === undefined ||
    bc === undefined ||
    oc === undefined ||
    ip === undefined ||
    as === undefined
  ) {
    return undefined
  }
  const ipa = nullOrNn('intern_pipelines_active', 50_000)
  const ipe = nullOrNn('intern_pipelines_escalated', 50_000)
  const iof = nullOrNn('intern_overdue_first_contact', 50_000)
  if (ipa === undefined || ipe === undefined || iof === undefined) return undefined
  return {
    has_supervisor_scope: hs,
    supervised_team_count: st,
    open_assignments_total: ot,
    blocked_count: bc,
    overdue_count: oc,
    in_progress_count: ip,
    assigned_not_started_count: as,
    intern_pipelines_active: ipa,
    intern_pipelines_escalated: ipe,
    intern_overdue_first_contact: iof,
    desk_loading: dl,
  }
}

function validateLeadershipSnapshotRaw(
  raw: unknown,
): AgentJonesLeadershipSnapshotSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const ak = raw.active_kpi_count
  if (typeof ak !== 'number' || !Number.isFinite(ak) || ak < 0 || ak > 500) return undefined
  let mean: number | null = null
  const mp = raw.kpi_mean_progress_pct
  if (mp === null) {
    mean = null
  } else if (typeof mp === 'number' && Number.isFinite(mp) && mp >= 0 && mp <= 1000) {
    mean = Math.round(mp * 10) / 10
  } else {
    return undefined
  }
  const bh = raw.kpis_below_half_target
  if (typeof bh !== 'number' || !Number.isFinite(bh) || bh < 0 || bh > 500) return undefined
  let wname: string | null = null
  const wn = raw.weakest_kpi_name
  if (wn === null) {
    wname = null
  } else if (typeof wn === 'string') {
    const t = wn.trim()
    if (t.length > 120 || /[<>\\]/.test(t)) return undefined
    wname = t || null
  } else {
    return undefined
  }
  let wpct: number | null = null
  const wp = raw.weakest_kpi_pct_of_target
  if (wp === null) {
    wpct = null
  } else if (typeof wp === 'number' && Number.isFinite(wp) && wp >= 0 && wp <= 1000) {
    wpct = Math.round(wp * 10) / 10
  } else {
    return undefined
  }
  const mv = raw.missions_visible_count
  if (typeof mv !== 'number' || !Number.isFinite(mv) || mv < 0 || mv > 500) return undefined
  return {
    active_kpi_count: Math.floor(ak),
    kpi_mean_progress_pct: mean,
    kpis_below_half_target: Math.floor(bh),
    weakest_kpi_name: wname,
    weakest_kpi_pct_of_target: wpct,
    missions_visible_count: Math.floor(mv),
  }
}

function legacyToV2(raw: AgentJonesSafeContextLegacy): AgentJonesSafeContextV2 {
  return {
    surface: 'volunteer_dashboard',
    user: {
      role: undefined,
      onboarding_status: raw.profileHints?.onboarding_status,
      onboarding_branch: raw.profileHints?.onboarding_branch,
      voterMatched: raw.progressSlice !== 'unmatched' && raw.progressSlice !== 'exception_pending',
    },
    ...(raw.campaign
      ? {
          campaign: {
            ...(raw.campaign.slogan ? { slogan: raw.campaign.slogan } : {}),
            ...(raw.campaign.shortBio ? { shortBio: raw.campaign.shortBio } : {}),
            ...(raw.campaign.issuePillars ? { issuePillars: raw.campaign.issuePillars } : {}),
            ...(raw.campaign.ctas ? { ctas: raw.campaign.ctas } : {}),
            ...(raw.campaign.onboardingBrief
              ? { onboardingBrief: raw.campaign.onboardingBrief }
              : {}),
          },
        }
      : {}),
    operational: {
      progressSlice: raw.progressSlice,
      voterLoading: raw.voterLoading,
      needsOnboardingPath: false,
    },
  }
}

function validateContext(raw: unknown): AgentJonesSafeContextV2 | null {
  if (!isRecord(raw)) return null

  // V2 path
  if ('user' in raw && 'operational' in raw) {
    const user = validateUser(raw.user)
    const operational = validateOperational(raw.operational)
    if (!user || !operational) return null
    const surface = validateSurfaceRaw(raw.surface)
    const coordinator_ops = validateCoordinatorOpsRaw(raw.coordinator_ops)
    const leadership_snapshot = validateLeadershipSnapshotRaw(raw.leadership_snapshot)
    const campaign = validateCampaign(raw.campaign)
    const relational = validateRelationalPower5(raw.relational_power5)
    const volunteer_mission = validateVolunteerMission(raw.volunteer_mission)
    const daily_activation = validateDailyActivation(raw.daily_activation)
    const intern_layer = validateInternLayer(raw.intern_layer)
    const campaign_goals = validateCampaignGoals(raw.campaign_goals)
    return {
      surface,
      user,
      operational,
      ...(campaign
        ? {
            campaign: {
              ...(campaign.slogan ? { slogan: campaign.slogan } : {}),
              ...(campaign.shortBio ? { shortBio: campaign.shortBio } : {}),
              ...(campaign.issuePillars ? { issuePillars: campaign.issuePillars } : {}),
              ...(campaign.ctas ? { ctas: campaign.ctas } : {}),
              ...(campaign.onboardingBrief
                ? { onboardingBrief: campaign.onboardingBrief }
                : {}),
            },
          }
        : {}),
      ...(relational ? { relational_power5: relational } : {}),
      ...(volunteer_mission ? { volunteer_mission } : {}),
      ...(daily_activation ? { daily_activation } : {}),
      ...(intern_layer ? { intern_layer } : {}),
      ...(campaign_goals ? { campaign_goals } : {}),
      ...(coordinator_ops ? { coordinator_ops } : {}),
      ...(leadership_snapshot ? { leadership_snapshot } : {}),
    }
  }

  // Legacy path (accept then adapt)
  const legacy = raw as unknown as AgentJonesSafeContextLegacy
  const slice = legacy.progressSlice
  const voterLoading = legacy.voterLoading
  if (typeof slice !== 'string' || !SLICES.has(slice)) return null
  if (typeof voterLoading !== 'boolean') return null
  const hints = validateProfileHints(legacy.profileHints)
  const campaign = validateCampaign(legacy.campaign)
  return legacyToV2({ ...legacy, ...(hints ? { profileHints: hints } : {}), ...(campaign ? { campaign } : {}) })
}

function buildSystemPrompt(context: AgentJonesSafeContextV2): string {
  return `You are Agent Jones V2, a context-aware campaign operator inside CampaignOS.

Rules:
- You ONLY reason about the volunteer using the JSON "dashboardContext" below. Do not claim you queried a database, opened Supabase, or accessed tools beyond this context.
- dashboardContext.surface is one of: volunteer_dashboard | intern_desk | coordinator_desk | candidate_desk. Match tone: volunteer_dashboard/intern_desk emphasize individual tasks and roster; coordinator_desk emphasizes supervised teams, blocked/overdue mission lanes, and intern pipeline counts (no volunteer PII); candidate_desk emphasizes KPI health, strategic focus, and when to use coordinator vs volunteer surfaces — never invent polling or finance detail.
- Progress is exactly one of: unmatched, matched_no_branch, exception_pending, matched_ready (dashboardContext.operational.progressSlice).
- voterLoading means roster/voter linkage is still loading — be cautious/verification-first.
- Campaign context (if present) is public campaign info (slogan, bio, issue pillars, CTAs) — ground wording and next-steps in it, but do not invent policy details.
- If dashboardContext.campaign.onboardingBrief exists, it is the structured Volunteer Welcome Kit + Organization Outline (culture, lane options, first actions, messaging, escalation). Use it for how we work, lane fit, first tasks, and when to escalate — still do not invent policy beyond what is written there.
- Stay practical, supportive, and brief (mobile screens). No legal/medical advice. Do not ask for passwords, SSNs, or full document uploads.
- Never reveal sensitive voter history. You may reference precinct/county/district if present.
- If dashboardContext.user includes onboarding_momentum_state / onboarding_direction_key / onboarding_micro_commitment_key (and optional onboarding_last_prompt / onboarding_last_action_at), the volunteer is in optional guided momentum (not a wizard). Honor their direction and micro-commitment when suggesting next steps; never imply they are blocked from the dashboard.
- If dashboardContext.relational_power5 exists, it is a bounded summary of their Power of 5 list (counts, open manual relay steps, suggested next move). Do not invent additional names or voter data. Never suggest bulk messaging or automated sends.
- If dashboardContext.volunteer_mission exists, it is their short mission queue (active task titles, next best move, recent completions, optional score/streak hints). Encourage completion without guilt; suggest scrolling to mission-tasks when offering a concrete task. Do not imply tasks block dashboard access.
- If dashboardContext.daily_activation exists, it is today's daily activation (completed_today / total_today, points_today, optional team_tier_label, next_task_title, optional adaptive fields: progression_stage new|active|advanced, top_lane, growth_lane, lane_scores, behavior scores, assignment_hint). Social/communications stay universal; other lanes adapt over time. Explain assignments briefly when assignment_hint or lane fields are present (e.g. strength in outreach, growth in leadership). Encourage specialization without pressure. Suggest scrolling to daily-activation for the checklist. Never imply they must finish all tasks to use the app.
- If dashboardContext.intern_layer exists, the user is an intern or supervisor with intern-layer data: overdue_contacts, pending_followups, next_best_action (title, volunteer_name, suggested_script), leadership_task_title, pipeline counts. Prioritize overdue first contacts (72h rule), then follow-ups. Give short call openers from suggested_script when present. For placement, name the lane from next_best_action if given. Reinforce one leadership habit per reply (mentor, escalate properly, review progress). Suggest scrolling to intern-desk when on that page.
- If dashboardContext.campaign_goals exists, it lists top campaign KPIs (name, current, target, unit, pct toward goal) and optional user_contribution_summary (slug + contributed). Tie encouragement to these numbers (e.g. “moves us toward 20,000 volunteers”, “about 60% to fundraising goal” when pct matches). Connect completed mission tasks to moving these metrics. Suggest scrolling to campaign-kpis when pointing at the goal strip.
- If dashboardContext.coordinator_ops exists, it is a bounded coordinator summary: supervisor scope flag, supervised_team_count, open_assignments_total, lane counts (blocked, overdue, in_progress, assigned_not_started), optional intern pipeline aggregates, desk_loading. Prioritize blocked/overdue assignments, then intern escalations/overdue first contacts. Suggest scroll coordinator-mission-ops when discussing supervised missions. Do not name volunteers.
- If dashboardContext.leadership_snapshot exists, it summarizes KPI health for a principal/leadership desk: active_kpi_count, kpi_mean_progress_pct, kpis_below_half_target, optional weakest_kpi_name / weakest_kpi_pct_of_target, missions_visible_count. Stay strategic — align narratives with these numbers; suggest scroll candidate-health-snapshot when pointing at the executive snapshot. Do not claim access to polling or ad-buy systems.

dashboardContext:
${JSON.stringify(context)}

Output a single JSON object with:
- "response" (string, required): your answer to the user.
- "suggestedPrompts" (optional): max 4 strings (short, tap-friendly).
- "recommendedActions" (optional): max 3 of:
  - { "type": "scroll", "targetId": one of: ${[...SCROLL_IDS].join(', ')} }
  - { "type": "navigate", "targetId": one of: ${[...NAV_PATHS].join(', ')} }
  - { "type": "task", "taskType": string (short label) }
- "insight" (optional): { "type": "campaign_context" | "user_context" | "strategy", "message": string }
- "onboardingPrompt" (optional): short slug such as direction_choice | micro_suggestion | reinforcement (max 64 chars)
- "selectedDirection" (optional): one of talk_to_people | show_up_locally | help_behind_the_scenes | spread_the_word when relevant to the reply
- "suggestedMicroCommitment" (optional): { "id": string, "title": string } when nudging a concrete micro-step
- "reinforcementMessage" (optional): brief encouragement after a commitment (max ~400 chars)

No other top-level keys. No markdown fences — raw JSON only.`
}

function unwrapJsonBlock(text: string): string {
  const t = text.trim()
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/u, '')
      .trim()
  }
  return t
}

function parseModelObject(text: string): Record<string, unknown> | null {
  try {
    const o = JSON.parse(unwrapJsonBlock(text)) as unknown
    return isRecord(o) ? o : null
  } catch {
    return null
  }
}

function sanitizeSuggested(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const item of raw.slice(0, 6)) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (!t || t.length > 120) continue
    if (/[<>\\]/.test(t)) continue
    out.push(t)
  }
  return out.length ? out : undefined
}

function sanitizeActions(raw: unknown) {
  if (!Array.isArray(raw)) return undefined
  const out: { type: 'scroll' | 'navigate' | 'task'; targetId?: string; taskType?: string }[] = []
  for (const item of raw.slice(0, 3)) {
    if (!isRecord(item)) continue
    const type = typeof item.type === 'string' ? item.type.trim() : ''
    if (type === 'scroll') {
      const targetId =
        typeof item.targetId === 'string' ? item.targetId.trim() : ''
      if (!targetId || !SCROLL_IDS.has(targetId)) continue
      out.push({ type: 'scroll' as const, targetId })
      continue
    }
    if (type === 'navigate') {
      const targetId =
        typeof item.targetId === 'string' ? item.targetId.trim() : ''
      if (!targetId || !NAV_PATHS.has(targetId)) continue
      out.push({ type: 'navigate' as const, targetId })
      continue
    }
    if (type === 'task') {
      const taskType =
        typeof item.taskType === 'string' ? item.taskType.trim() : ''
      if (!taskType || taskType.length > 80 || /[<>\\]/.test(taskType)) continue
      out.push({ type: 'task' as const, taskType })
      continue
    }
  }
  return out.length ? out : undefined
}

function sanitizeInsight(raw: unknown) {
  if (!isRecord(raw)) return undefined
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  if (
    (type === 'campaign_context' ||
      type === 'user_context' ||
      type === 'strategy') &&
    message &&
    message.length <= 220 &&
    !/[<>\\]/.test(message)
  ) {
    return { type, message }
  }
  return undefined
}

function sanitizeOnboardingModelFields(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  const op =
    typeof raw.onboardingPrompt === 'string' ? raw.onboardingPrompt.trim() : ''
  if (op && op.length <= 64 && !/[<>\\]/.test(op)) {
    out.onboardingPrompt = op
  }
  const sd =
    typeof raw.selectedDirection === 'string' ? raw.selectedDirection.trim() : ''
  if (
    sd &&
    sd.length <= 64 &&
    ONBOARDING_DIR_SLUGS.has(sd) &&
    !/[<>\\]/.test(sd)
  ) {
    out.selectedDirection = sd
  }
  const smRaw = raw.suggestedMicroCommitment
  if (isRecord(smRaw)) {
    const mid = typeof smRaw.id === 'string' ? smRaw.id.trim() : ''
    const title = typeof smRaw.title === 'string' ? smRaw.title.trim() : ''
    if (
      mid &&
      mid.length <= 80 &&
      title &&
      title.length <= 160 &&
      !/[<>\\]/.test(mid) &&
      !/[<>\\]/.test(title)
    ) {
      out.suggestedMicroCommitment = { id: mid, title }
    }
  }
  const rm =
    typeof raw.reinforcementMessage === 'string'
      ? raw.reinforcementMessage.trim()
      : ''
  if (rm && rm.length <= 400 && !/[<>\\]/.test(rm)) {
    out.reinforcementMessage = rm
  }
  return Object.keys(out).length ? out : undefined
}

export default async function handler(
  event: NetlifyEvent,
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) {
    return json(503, { error: 'OPENAI_API_KEY is not configured' })
  }

  let parsed: RequestBody
  try {
    parsed = JSON.parse(event.body ?? '{}') as RequestBody
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const context = validateContext(parsed.context)
  if (!context) {
    return json(400, {
      error:
        'Invalid context: require { user: { voterMatched }, operational: { progressSlice, voterLoading, needsOnboardingPath }, optional campaign }',
    })
  }

  const userMessage =
    typeof parsed.userMessage === 'string' ? parsed.userMessage.trim() : ''
  if (!userMessage || userMessage.length > MAX_USER_MESSAGE) {
    return json(400, {
      error: `userMessage required, max ${MAX_USER_MESSAGE} characters`,
    })
  }

  const model =
    (typeof parsed.model === 'string' && parsed.model.trim()) ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini'

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(context) },
    { role: 'user' as const, content: userMessage },
  ]

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  })

  const raw = await openaiRes.text()
  if (!openaiRes.ok) {
    return json(502, {
      error: 'OpenAI request failed',
      detail: raw.slice(0, 500),
    })
  }

  let data: unknown
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    return json(502, { error: 'Invalid OpenAI transport response' })
  }

  const choices = isRecord(data) ? data.choices : undefined
  const first = Array.isArray(choices) ? choices[0] : undefined
  const message = isRecord(first) ? first.message : undefined
  const content =
    isRecord(message) && typeof message.content === 'string'
      ? message.content.trim()
      : ''

  if (!content) {
    return json(502, { error: 'Empty model response' })
  }

  const obj = parseModelObject(content)
  let responseText: string
  let suggestedPrompts: ReturnType<typeof sanitizeSuggested>
  let recommendedActions: ReturnType<typeof sanitizeActions>
  let insight: ReturnType<typeof sanitizeInsight>

  if (obj && typeof obj.response === 'string' && obj.response.trim()) {
    responseText = obj.response.trim()
    suggestedPrompts = sanitizeSuggested(obj.suggestedPrompts)
    recommendedActions = sanitizeActions(obj.recommendedActions)
    insight = sanitizeInsight(obj.insight)
  } else {
    responseText = content
    suggestedPrompts = undefined
    recommendedActions = undefined
    insight = undefined
  }

  const onboardingExtras =
    obj && isRecord(obj) ? sanitizeOnboardingModelFields(obj) : undefined

  return json(200, {
    response: responseText,
    ...(suggestedPrompts ? { suggestedPrompts } : {}),
    ...(recommendedActions ? { recommendedActions } : {}),
    ...(insight ? { insight } : {}),
    ...(onboardingExtras ?? {}),
  })
}
