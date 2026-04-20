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
  next_assignment_due_at?: string | null
  assignments_due_within_7d_count?: number
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
  | 'admin_desk'

type AgentJonesOperatingSafe = {
  normalized_role: string
  desk_route: string
  leadership_level: string
  user_scope: string
  recommended_mode: string
  command_summary: {
    attention_now: string[]
    on_track: string[]
    next_steps: string[]
    recent_changes: string[]
  }
  urgent_signals: {
    id: string
    label: string
    explanation: string
    severity: 'info' | 'watch' | 'urgent'
    owner_hint: string | null
    route_hint: string | null
  }[]
  exception_summary: {
    status_key: string
    has_open_exception: boolean
    pending_review: boolean
  }
  desk_health: {
    volunteer_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    intern_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    coordinator_lane: 'healthy' | 'watch' | 'urgent' | 'na'
    leadership_lane: 'healthy' | 'watch' | 'urgent' | 'na'
  }
  kpi_telemetry: {
    active_kpi_count: number | null
    mean_pct: number | null
    below_half: number | null
    weakest_name: string | null
    weakest_pct_of_target: number | null
  }
  readiness_summary: string
  signal_epoch?: string
}

type AgentJonesTaskPressureSafe = {
  mission_active: number
  mission_stalled: number
  daily_remaining: number | null
  intern_pipeline_assigned: number
  intern_overdue_first_contact: number
  coord_blocked: number
  coord_overdue: number
  open_assignments: number
  headline: string
}

type AgentJonesSessionCoachingSafe = {
  signal_epoch: string
  avoid_repeating: string[]
}

type AgentJonesPrioritySignalSafe = {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  title: string
  explanation: string
  owner_hint: string | null
  route_hint: string | null
  target_id: string | null
  confidence: 0 | 1
}

type AgentJonesDeskSummarySafe = {
  desk: 'volunteer' | 'intern' | 'coordinator' | 'candidate' | 'admin'
  headline: string
  attention_now: string[]
  on_track: string[]
  next_steps: string[]
  recent_changes: string[]
  recommended_mode: string
  readiness_summary: string
}

type AgentJonesNavigationHintSafe = {
  kind: 'scroll' | 'navigate'
  label: string
  route: string | null
  target_id: string | null
  reason: string
  priority: 1 | 2 | 3
}

type AgentJonesCalendarSummarySafe = {
  next_event_title?: string | null
  next_event_at?: string | null
  next_deadline_title?: string | null
  next_deadline_at?: string | null
  upcoming_count_7d?: number | null
  staffing_gap_count?: number | null
  governance_warning_count?: number | null
  has_meaningful_upcoming_activity?: boolean | null
}

type AgentJonesProactiveAlertSafe = {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  explanation: string
  route_hint?: string | null
  target_id?: string | null
  dismissible?: boolean
}

type AgentJonesLeadershipCommandSafe = {
  synthesis_lines: string[]
  recommended_intervention: string | null
}

type AgentJonesReadinessCoverageSafe = {
  summary_lines: string[]
  thin_areas: string[]
}

type AgentJonesGeoIntelligenceSafe = {
  scope_type?: 'campaign' | 'district' | 'county' | 'precinct' | 'region' | null
  primary_area_label?: string | null
  target_area_labels?: string[]
  undercovered_area_labels?: string[]
  high_opportunity_area_labels?: string[]
  area_count_in_view?: number | null
}

type AgentJonesFieldIntelligenceSafe = {
  weakest_area_label?: string | null
  strongest_area_label?: string | null
  undercovered_area_count?: number | null
  high_pressure_area_count?: number | null
  volunteer_capacity_warning_count?: number | null
  coordinator_pressure_count?: number | null
  area_readiness_summary?: string | null
  top_field_risks?: string[]
}

type AgentJonesCoverageIntelligenceSafe = {
  county_coverage_watch_count?: number | null
  precinct_coverage_watch_count?: number | null
  missing_leadership_slots?: string[]
  event_staffing_pressure_count?: number | null
  volunteer_shortage_area_labels?: string[]
  readiness_headline?: string | null
}

type AgentJonesDemographicSummarySafe = {
  area_label?: string | null
  population_band?: string | null
  turnout_relevant_notes?: string[]
  demographic_highlights?: string[]
  organizing_considerations?: string[]
  confidence_note?: string | null
}

type AgentJonesEscalationSummarySafe = {
  cross_desk_issue_count?: number | null
  top_escalation_headline?: string | null
  escalation_routes?: string[]
  blocked_downstream_work_count?: number | null
}

type AgentJonesCampaignManagerCommandSafe = {
  command_lines: string[]
  top_opportunity_hint: string | null
  top_risk_hint: string | null
  cross_desk_note: string | null
  top_risk_area_hint?: string | null
  top_opportunity_area_hint?: string | null
  recommended_intervention?: string | null
  field_readiness_framing?: string | null
  coverage_task_pressure_line?: string | null
}

const GEO_SCOPE_TYPES = new Set([
  'campaign',
  'district',
  'county',
  'precinct',
  'region',
])

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
    exception_requested_at?: string | null
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
  operating?: AgentJonesOperatingSafe
  priority_signals?: AgentJonesPrioritySignalSafe[]
  desk_summary?: AgentJonesDeskSummarySafe
  navigation_hints?: AgentJonesNavigationHintSafe[]
  task_pressure?: AgentJonesTaskPressureSafe
  session_coaching?: AgentJonesSessionCoachingSafe
  calendar_summary?: AgentJonesCalendarSummarySafe
  proactive_alerts?: AgentJonesProactiveAlertSafe[]
  leadership_command?: AgentJonesLeadershipCommandSafe
  readiness_coverage?: AgentJonesReadinessCoverageSafe
  geo_intelligence?: AgentJonesGeoIntelligenceSafe
  field_intelligence?: AgentJonesFieldIntelligenceSafe
  coverage_intelligence?: AgentJonesCoverageIntelligenceSafe
  demographic_summary?: AgentJonesDemographicSummarySafe
  escalation_summary?: AgentJonesEscalationSummarySafe
  campaign_manager_command?: AgentJonesCampaignManagerCommandSafe
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
  'dash-profile-photo',
  'coordinator-mission-ops',
  'candidate-health-snapshot',
  'admin-overview',
  'admin-exceptions',
  'admin-desks',
  'admin-tasks',
  'admin-config',
])

const NAV_PATHS = new Set([
  '/',
  '/dashboard',
  '/intern',
  '/coordinator',
  '/candidate',
  '/admin',
])

const SURFACES = new Set<AgentJonesSurfaceSafe>([
  'volunteer_dashboard',
  'intern_desk',
  'coordinator_desk',
  'candidate_desk',
  'admin_desk',
])

const OPERATING_ROLES = new Set([
  'admin',
  'campaign_manager',
  'candidate',
  'assistant_campaign_manager',
  'coordinator',
  'county_lead',
  'precinct_captain',
  'intern',
  'volunteer',
  'unknown',
])

const OPERATING_DESKS = new Set(['/dashboard', '/intern', '/coordinator', '/candidate', '/admin'])

const OPERATING_LEVELS = new Set([
  'volunteer',
  'intern',
  'field_lead',
  'coordinator',
  'leadership',
  'admin',
])

const OPERATING_SCOPES = new Set(['self', 'supervised_teams', 'campaign_wide'])

const OPERATING_MODES = new Set([
  'guide',
  'command',
  'ops',
  'task',
  'calendar',
  'leadership',
  'training',
])

const PRIORITY_CATEGORIES = new Set([
  'exceptions',
  'kpi',
  'intern',
  'coordinator',
  'missions',
  'readiness',
])

const DESK_SUMMARY_DESKS = new Set([
  'volunteer',
  'intern',
  'coordinator',
  'candidate',
  'admin',
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
  const er = raw.exception_requested_at
  if (typeof er === 'string') {
    const t = er.trim().slice(0, 40)
    if (t && !/[<>\\]/.test(t)) {
      out.exception_requested_at = t
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
  let next_assignment_due_at: string | null | undefined
  const nda = raw.next_assignment_due_at
  if (nda === null) next_assignment_due_at = null
  else if (typeof nda === 'string') {
    const t = nda.trim().slice(0, 40)
    if (t && !/[<>\\]/.test(t)) next_assignment_due_at = t
  }
  let assignments_due_within_7d_count: number | undefined
  const awc = raw.assignments_due_within_7d_count
  if (typeof awc === 'number' && Number.isFinite(awc)) {
    const n = Math.floor(awc)
    if (n >= 0 && n <= 500) assignments_due_within_7d_count = n
  }
  if (next_assignment_due_at !== undefined) {
    out.next_assignment_due_at = next_assignment_due_at
  }
  if (assignments_due_within_7d_count !== undefined) {
    out.assignments_due_within_7d_count = assignments_due_within_7d_count
  }
  if (
    !active_summaries.length &&
    next_best_title === null &&
    !recent_completed.length &&
    !stalled_titles.length &&
    points === undefined &&
    !streaks &&
    next_assignment_due_at === undefined &&
    assignments_due_within_7d_count === undefined
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

function validateStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw.slice(0, maxItems)) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (!t || t.length > maxLen) continue
    if (/[<>\\]/.test(t)) continue
    out.push(t)
  }
  return out
}

function validateOperatingRaw(raw: unknown): AgentJonesOperatingSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined

  const nr =
    typeof raw.normalized_role === 'string' && OPERATING_ROLES.has(raw.normalized_role.trim())
      ? (raw.normalized_role.trim() as AgentJonesOperatingSafe['normalized_role'])
      : null
  const dr =
    typeof raw.desk_route === 'string' && OPERATING_DESKS.has(raw.desk_route.trim())
      ? (raw.desk_route.trim() as AgentJonesOperatingSafe['desk_route'])
      : null
  const ll =
    typeof raw.leadership_level === 'string' &&
    OPERATING_LEVELS.has(raw.leadership_level.trim())
      ? (raw.leadership_level.trim() as AgentJonesOperatingSafe['leadership_level'])
      : null
  const us =
    typeof raw.user_scope === 'string' && OPERATING_SCOPES.has(raw.user_scope.trim())
      ? (raw.user_scope.trim() as AgentJonesOperatingSafe['user_scope'])
      : null
  const rm =
    typeof raw.recommended_mode === 'string' &&
    OPERATING_MODES.has(raw.recommended_mode.trim())
      ? (raw.recommended_mode.trim() as AgentJonesOperatingSafe['recommended_mode'])
      : null

  if (!nr || !dr || !ll || !us || !rm) return undefined

  const cs = raw.command_summary
  if (!isRecord(cs)) return undefined
  const attention_now = validateStringList(cs.attention_now, 8, 320)
  const on_track = validateStringList(cs.on_track, 6, 320)
  const next_steps = validateStringList(cs.next_steps, 6, 320)
  const recent_changes = validateStringList(cs.recent_changes, 4, 320)

  const urgRaw = raw.urgent_signals
  const urgent_signals: AgentJonesOperatingSafe['urgent_signals'] = []
  if (Array.isArray(urgRaw)) {
    for (const row of urgRaw.slice(0, 8)) {
      if (!isRecord(row)) continue
      const id = typeof row.id === 'string' ? row.id.trim() : ''
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      const sev = row.severity
      if (!id || id.length > 64 || !label || label.length > 220) continue
      if (sev !== 'info' && sev !== 'watch' && sev !== 'urgent') continue
      if (/[<>\\]/.test(label)) continue
      let explanation =
        typeof row.explanation === 'string' ? row.explanation.trim().slice(0, 320) : ''
      if (!explanation || /[<>\\]/.test(explanation)) explanation = label
      const oh =
        row.owner_hint === null
          ? null
          : typeof row.owner_hint === 'string'
            ? row.owner_hint.trim().slice(0, 80) || null
            : null
      const rh =
        row.route_hint === null
          ? null
          : typeof row.route_hint === 'string'
            ? row.route_hint.trim().slice(0, 80) || null
            : null
      urgent_signals.push({
        id,
        label,
        explanation,
        severity: sev,
        owner_hint: oh,
        route_hint: rh,
      })
    }
  }

  const ex = raw.exception_summary
  if (!isRecord(ex)) return undefined
  const status_key =
    typeof ex.status_key === 'string' ? ex.status_key.trim().slice(0, 64) : ''
  if (!status_key || /[<>\\]/.test(status_key)) return undefined
  if (typeof ex.has_open_exception !== 'boolean' || typeof ex.pending_review !== 'boolean') {
    return undefined
  }

  const dh = raw.desk_health
  if (!isRecord(dh)) return undefined
  const laneKeys = [
    'volunteer_lane',
    'intern_lane',
    'coordinator_lane',
    'leadership_lane',
  ] as const
  const desk_health = {} as AgentJonesOperatingSafe['desk_health']
  for (const k of laneKeys) {
    const v = dh[k]
    if (v !== 'healthy' && v !== 'watch' && v !== 'urgent' && v !== 'na') return undefined
    desk_health[k] = v
  }

  const kt = raw.kpi_telemetry
  if (!isRecord(kt)) return undefined
  const nullOrFiniteInt = (x: unknown, max: number): number | null => {
    if (x === null) return null
    if (typeof x !== 'number' || !Number.isFinite(x)) return null
    const n = Math.floor(x)
    if (n < 0 || n > max) return null
    return n
  }
  const nullOrFiniteFloat = (x: unknown): number | null => {
    if (x === null) return null
    if (typeof x !== 'number' || !Number.isFinite(x)) return null
    if (x < 0 || x > 1_000_000) return null
    return Math.round(x * 100) / 100
  }
  const kpi_telemetry: AgentJonesOperatingSafe['kpi_telemetry'] = {
    active_kpi_count: nullOrFiniteInt(kt.active_kpi_count, 500),
    mean_pct: nullOrFiniteFloat(kt.mean_pct),
    below_half: nullOrFiniteInt(kt.below_half, 500),
    weakest_name:
      kt.weakest_name === null
        ? null
        : typeof kt.weakest_name === 'string'
          ? kt.weakest_name.trim().slice(0, 120) || null
          : null,
    weakest_pct_of_target: nullOrFiniteFloat(kt.weakest_pct_of_target),
  }

  const readiness =
    typeof raw.readiness_summary === 'string' ? raw.readiness_summary.trim().slice(0, 400) : ''
  if (!readiness || /[<>\\]/.test(readiness)) return undefined

  let signal_epoch: string | undefined
  const seRaw = raw.signal_epoch
  if (typeof seRaw === 'string') {
    const t = seRaw.trim().slice(0, 2400)
    if (t && !/[<>\\]/.test(t)) signal_epoch = t
  }

  return {
    normalized_role: nr,
    desk_route: dr,
    leadership_level: ll,
    user_scope: us,
    recommended_mode: rm,
    command_summary: {
      attention_now,
      on_track,
      next_steps,
      recent_changes,
    },
    urgent_signals,
    exception_summary: {
      status_key,
      has_open_exception: ex.has_open_exception,
      pending_review: ex.pending_review,
    },
    desk_health,
    kpi_telemetry,
    readiness_summary: readiness,
    ...(signal_epoch ? { signal_epoch } : {}),
  }
}

function validateTaskPressureRaw(raw: unknown): AgentJonesTaskPressureSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const nn = (k: string, max: number) => {
    const v = raw[k]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    const n = Math.floor(v)
    if (n < 0 || n > max) return null
    return n
  }
  const nullOrNn = (k: string, max: number): number | null => {
    const v = raw[k]
    if (v === null) return null
    return nn(k, max)
  }
  const ma = nn('mission_active', 5000)
  const ms = nn('mission_stalled', 5000)
  const dr = nullOrNn('daily_remaining', 5000)
  const ipa = nn('intern_pipeline_assigned', 50_000)
  const iof = nn('intern_overdue_first_contact', 50_000)
  const cb = nn('coord_blocked', 50_000)
  const co = nn('coord_overdue', 50_000)
  const oa = nn('open_assignments', 50_000)
  if (
    ma === null ||
    ms === null ||
    ipa === null ||
    iof === null ||
    cb === null ||
    co === null ||
    oa === null
  ) {
    return undefined
  }
  const headline =
    typeof raw.headline === 'string' ? raw.headline.trim().slice(0, 240) : ''
  if (!headline || /[<>\\]/.test(headline)) return undefined
  return {
    mission_active: ma,
    mission_stalled: ms,
    daily_remaining: dr,
    intern_pipeline_assigned: ipa,
    intern_overdue_first_contact: iof,
    coord_blocked: cb,
    coord_overdue: co,
    open_assignments: oa,
    headline,
  }
}

function validateSessionCoachingRaw(
  raw: unknown,
): AgentJonesSessionCoachingSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const epoch =
    typeof raw.signal_epoch === 'string' ? raw.signal_epoch.trim().slice(0, 320) : ''
  if (!epoch || /[<>\\]/.test(epoch)) return undefined
  const avoid: string[] = []
  const ar = raw.avoid_repeating
  if (Array.isArray(ar)) {
    for (const item of ar.slice(0, 3)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 100)
      if (!t || /[<>\\]/.test(t)) continue
      avoid.push(t)
    }
  }
  return { signal_epoch: epoch, avoid_repeating: avoid }
}

function validatePrioritySignalsRaw(
  raw: unknown,
): AgentJonesPrioritySignalSafe[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) return undefined
  const out: AgentJonesPrioritySignalSafe[] = []
  for (const row of raw.slice(0, 8)) {
    if (!isRecord(row)) continue
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id || id.length > 64 || /[<>\\]/.test(id)) continue
    const sev = row.severity
    if (sev !== 'critical' && sev !== 'high' && sev !== 'medium' && sev !== 'low') {
      continue
    }
    const catRaw = typeof row.category === 'string' ? row.category.trim() : ''
    if (!catRaw || !PRIORITY_CATEGORIES.has(catRaw)) continue
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (!title || title.length > 160 || /[<>\\]/.test(title)) continue
    let explanation =
      typeof row.explanation === 'string' ? row.explanation.trim().slice(0, 320) : ''
    if (!explanation || /[<>\\]/.test(explanation)) explanation = title
    const oh =
      row.owner_hint === null
        ? null
        : typeof row.owner_hint === 'string'
          ? row.owner_hint.trim().slice(0, 80) || null
          : null
    if (oh && /[<>\\]/.test(oh)) continue
    const rh =
      row.route_hint === null
        ? null
        : typeof row.route_hint === 'string'
          ? row.route_hint.trim().slice(0, 80) || null
          : null
    if (rh && rh !== '' && !NAV_PATHS.has(rh)) continue
    const tidRaw = row.target_id
    const target_id =
      tidRaw === null || tidRaw === undefined
        ? null
        : typeof tidRaw === 'string'
          ? tidRaw.trim().slice(0, 64) || null
          : null
    if (target_id && !SCROLL_IDS.has(target_id)) continue
    const conf = row.confidence
    if (conf !== 0 && conf !== 1) continue
    out.push({
      id,
      severity: sev,
      category: catRaw,
      title,
      explanation,
      owner_hint: oh,
      route_hint: rh && rh !== '' ? rh : null,
      target_id: target_id && target_id !== '' ? target_id : null,
      confidence: conf,
    })
  }
  return out.length ? out : undefined
}

function validateDeskSummaryRaw(raw: unknown): AgentJonesDeskSummarySafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const desk = typeof raw.desk === 'string' ? raw.desk.trim() : ''
  if (!DESK_SUMMARY_DESKS.has(desk)) return undefined
  const headline =
    typeof raw.headline === 'string' ? raw.headline.trim().slice(0, 220) : ''
  if (!headline || /[<>\\]/.test(headline)) return undefined
  const rm =
    typeof raw.recommended_mode === 'string' ? raw.recommended_mode.trim() : ''
  if (!OPERATING_MODES.has(rm)) return undefined
  const readiness =
    typeof raw.readiness_summary === 'string'
      ? raw.readiness_summary.trim().slice(0, 400)
      : ''
  if (!readiness || /[<>\\]/.test(readiness)) return undefined
  const attention_now = validateStringList(raw.attention_now, 8, 320)
  const on_track = validateStringList(raw.on_track, 6, 320)
  const next_steps = validateStringList(raw.next_steps, 5, 320)
  const recent_changes = validateStringList(raw.recent_changes, 3, 320)
  return {
    desk: desk as AgentJonesDeskSummarySafe['desk'],
    headline,
    attention_now,
    on_track,
    next_steps,
    recent_changes,
    recommended_mode: rm,
    readiness_summary: readiness,
  }
}

function validateNavigationHintsRaw(
  raw: unknown,
): AgentJonesNavigationHintSafe[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) return undefined
  const out: AgentJonesNavigationHintSafe[] = []
  for (const row of raw.slice(0, 3)) {
    if (!isRecord(row)) continue
    if (row.kind !== 'scroll' && row.kind !== 'navigate') continue
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, 80) : ''
    if (!label || /[<>\\]/.test(label)) continue
    const reason = typeof row.reason === 'string' ? row.reason.trim().slice(0, 120) : ''
    if (!reason || /[<>\\]/.test(reason)) continue
    const pr = row.priority
    if (pr !== 1 && pr !== 2 && pr !== 3) continue
    if (row.kind === 'scroll') {
      const tid = typeof row.target_id === 'string' ? row.target_id.trim() : ''
      if (!SCROLL_IDS.has(tid)) continue
      const routeVal = row.route
      if (
        routeVal !== null &&
        routeVal !== undefined &&
        String(routeVal).trim() !== ''
      ) {
        continue
      }
      out.push({
        kind: 'scroll',
        label,
        route: null,
        target_id: tid,
        reason,
        priority: pr,
      })
    } else {
      const r = typeof row.route === 'string' ? row.route.trim() : ''
      if (!NAV_PATHS.has(r)) continue
      const tid = row.target_id
      if (
        tid !== null &&
        tid !== undefined &&
        typeof tid === 'string' &&
        tid.trim() !== ''
      ) {
        continue
      }
      out.push({
        kind: 'navigate',
        label,
        route: r,
        target_id: null,
        reason,
        priority: pr,
      })
    }
  }
  return out.length ? out : undefined
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

function calOptStr(raw: unknown, max: number): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (typeof raw !== 'string') return undefined
  const t = raw.trim().slice(0, max)
  if (!t || /[<>\\]/.test(t)) return undefined
  return t
}

function validateCalendarSummaryRaw(
  raw: unknown,
): AgentJonesCalendarSummarySafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesCalendarSummarySafe = {}
  const net = calOptStr(raw.next_event_title, 200)
  if (net !== undefined) out.next_event_title = net
  const nea = calOptStr(raw.next_event_at, 48)
  if (nea !== undefined) out.next_event_at = nea
  const ndt = calOptStr(raw.next_deadline_title, 200)
  if (ndt !== undefined) out.next_deadline_title = ndt
  const nda = calOptStr(raw.next_deadline_at, 48)
  if (nda !== undefined) out.next_deadline_at = nda
  const u7 = raw.upcoming_count_7d
  if (u7 === null) {
    out.upcoming_count_7d = null
  } else if (typeof u7 === 'number' && Number.isFinite(u7)) {
    const n = Math.floor(u7)
    if (n >= 0 && n <= 500) out.upcoming_count_7d = n
  }
  const sg = raw.staffing_gap_count
  if (sg === null) {
    out.staffing_gap_count = null
  } else if (typeof sg === 'number' && Number.isFinite(sg)) {
    const n = Math.floor(sg)
    if (n >= 0 && n <= 500) out.staffing_gap_count = n
  }
  const gw = raw.governance_warning_count
  if (gw === null) {
    out.governance_warning_count = null
  } else if (typeof gw === 'number' && Number.isFinite(gw)) {
    const n = Math.floor(gw)
    if (n >= 0 && n <= 50) out.governance_warning_count = n
  }
  const hm = raw.has_meaningful_upcoming_activity
  if (hm === null) {
    out.has_meaningful_upcoming_activity = null
  } else if (typeof hm === 'boolean') {
    out.has_meaningful_upcoming_activity = hm
  }
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateProactiveAlertsRaw(
  raw: unknown,
): AgentJonesProactiveAlertSafe[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) return undefined
  const out: AgentJonesProactiveAlertSafe[] = []
  for (const row of raw.slice(0, 5)) {
    if (!isRecord(row)) continue
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!id || id.length > 64 || /[<>\\]/.test(id)) continue
    const sev = row.severity
    if (sev !== 'critical' && sev !== 'high' && sev !== 'medium' && sev !== 'low') {
      continue
    }
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 160) : ''
    const explanation =
      typeof row.explanation === 'string' ? row.explanation.trim().slice(0, 320) : ''
    if (!title || !explanation || /[<>\\]/.test(title) || /[<>\\]/.test(explanation)) {
      continue
    }
    let route_hint: string | null | undefined
    const rh = row.route_hint
    if (rh === null) route_hint = null
    else if (typeof rh === 'string') {
      const t = rh.trim()
      if (t && NAV_PATHS.has(t)) route_hint = t
    }
    let target_id: string | null | undefined
    const tid = row.target_id
    if (tid === null) target_id = null
    else if (typeof tid === 'string') {
      const t = tid.trim()
      if (t && SCROLL_IDS.has(t)) target_id = t
    }
    let dismissible: boolean | undefined
    if (typeof row.dismissible === 'boolean') dismissible = row.dismissible
    out.push({
      id,
      severity: sev as AgentJonesProactiveAlertSafe['severity'],
      title,
      explanation,
      ...(route_hint !== undefined ? { route_hint } : {}),
      ...(target_id !== undefined ? { target_id } : {}),
      ...(dismissible !== undefined ? { dismissible } : {}),
    })
  }
  return out.length ? out : undefined
}

function validateLeadershipCommandRaw(
  raw: unknown,
): AgentJonesLeadershipCommandSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const linesRaw = raw.synthesis_lines
  const synthesis_lines: string[] = []
  if (Array.isArray(linesRaw)) {
    for (const item of linesRaw.slice(0, 6)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 320)
      if (!t || /[<>\\]/.test(t)) continue
      synthesis_lines.push(t)
    }
  }
  let recommended_intervention: string | null = null
  const ri = raw.recommended_intervention
  if (ri === null) {
    recommended_intervention = null
  } else if (typeof ri === 'string') {
    const t = ri.trim().slice(0, 360)
    if (t && !/[<>\\]/.test(t)) recommended_intervention = t
  }
  if (!synthesis_lines.length && recommended_intervention === null) return undefined
  return { synthesis_lines, recommended_intervention }
}

function validateGeoIntelligenceRaw(
  raw: unknown,
): AgentJonesGeoIntelligenceSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesGeoIntelligenceSafe = {}
  const st = raw.scope_type
  if (st === null) {
    out.scope_type = null
  } else if (typeof st === 'string' && GEO_SCOPE_TYPES.has(st)) {
    out.scope_type = st as AgentJonesGeoIntelligenceSafe['scope_type']
  }
  const pal = raw.primary_area_label
  if (pal === null) out.primary_area_label = null
  else if (typeof pal === 'string') {
    const t = pal.trim().slice(0, 200)
    if (t && !/[<>\\]/.test(t)) out.primary_area_label = t
  }
  const pushStrArr = (key: 'target_area_labels' | 'undercovered_area_labels' | 'high_opportunity_area_labels') => {
    const arr: string[] = []
    const rawArr = raw[key]
    if (!Array.isArray(rawArr)) return
    for (const item of rawArr.slice(0, 6)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 120)
      if (!t || /[<>\\]/.test(t)) continue
      arr.push(t)
    }
    if (arr.length) out[key] = arr
  }
  pushStrArr('target_area_labels')
  pushStrArr('undercovered_area_labels')
  pushStrArr('high_opportunity_area_labels')
  const ac = raw.area_count_in_view
  if (ac === null) out.area_count_in_view = null
  else if (typeof ac === 'number' && Number.isFinite(ac)) {
    const n = Math.floor(ac)
    if (n >= 0 && n <= 500) out.area_count_in_view = n
  }
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateFieldIntelligenceRaw(
  raw: unknown,
): AgentJonesFieldIntelligenceSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesFieldIntelligenceSafe = {}
  for (const key of ['weakest_area_label', 'strongest_area_label', 'area_readiness_summary'] as const) {
    const v = raw[key]
    if (v === null) {
      out[key] = null
    } else if (typeof v === 'string') {
      const t = v.trim().slice(0, 360)
      if (t && !/[<>\\]/.test(t)) out[key] = t
    }
  }
  for (const key of [
    'undercovered_area_count',
    'high_pressure_area_count',
    'volunteer_capacity_warning_count',
    'coordinator_pressure_count',
  ] as const) {
    const v = raw[key]
    if (v === null) out[key] = null
    else if (typeof v === 'number' && Number.isFinite(v)) {
      const n = Math.floor(v)
      if (n >= 0 && n <= 5000) out[key] = n
    }
  }
  const risks: string[] = []
  if (Array.isArray(raw.top_field_risks)) {
    for (const item of raw.top_field_risks.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 320)
      if (!t || /[<>\\]/.test(t)) continue
      risks.push(t)
    }
  }
  if (risks.length) out.top_field_risks = risks
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateCoverageIntelligenceRaw(
  raw: unknown,
): AgentJonesCoverageIntelligenceSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesCoverageIntelligenceSafe = {}
  for (const key of ['county_coverage_watch_count', 'precinct_coverage_watch_count'] as const) {
    const v = raw[key]
    if (v === null) out[key] = null
    else if (typeof v === 'number' && Number.isFinite(v)) {
      const n = Math.floor(v)
      if (n >= 0 && n <= 5000) out[key] = n
    }
  }
  const esp = raw.event_staffing_pressure_count
  if (esp === null) out.event_staffing_pressure_count = null
  else if (typeof esp === 'number' && Number.isFinite(esp)) {
    const n = Math.floor(esp)
    if (n >= 0 && n <= 5000) out.event_staffing_pressure_count = n
  }
  const rh = raw.readiness_headline
  if (rh === null) out.readiness_headline = null
  else if (typeof rh === 'string') {
    const t = rh.trim().slice(0, 400)
    if (t && !/[<>\\]/.test(t)) out.readiness_headline = t
  }
  const slots: string[] = []
  if (Array.isArray(raw.missing_leadership_slots)) {
    for (const item of raw.missing_leadership_slots.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 200)
      if (!t || /[<>\\]/.test(t)) continue
      slots.push(t)
    }
  }
  if (slots.length) out.missing_leadership_slots = slots
  const vshort: string[] = []
  if (Array.isArray(raw.volunteer_shortage_area_labels)) {
    for (const item of raw.volunteer_shortage_area_labels.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 120)
      if (!t || /[<>\\]/.test(t)) continue
      vshort.push(t)
    }
  }
  if (vshort.length) out.volunteer_shortage_area_labels = vshort
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateDemographicSummaryRaw(
  raw: unknown,
): AgentJonesDemographicSummarySafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesDemographicSummarySafe = {}
  for (const key of ['area_label', 'population_band', 'confidence_note'] as const) {
    const v = raw[key]
    if (v === null) out[key] = null
    else if (typeof v === 'string') {
      const max = key === 'confidence_note' ? 400 : 280
      const t = v.trim().slice(0, max)
      if (t && !/[<>\\]/.test(t)) out[key] = t
    }
  }
  const arrKeys = [
    'turnout_relevant_notes',
    'demographic_highlights',
    'organizing_considerations',
  ] as const
  for (const ak of arrKeys) {
    const lines: string[] = []
    if (Array.isArray(raw[ak])) {
      for (const item of raw[ak].slice(0, 6)) {
        if (typeof item !== 'string') continue
        const t = item.trim().slice(0, 400)
        if (!t || /[<>\\]/.test(t)) continue
        lines.push(t)
      }
    }
    if (lines.length) out[ak] = lines
  }
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateEscalationSummaryRaw(
  raw: unknown,
): AgentJonesEscalationSummarySafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const out: AgentJonesEscalationSummarySafe = {}
  const cd = raw.cross_desk_issue_count
  if (cd === null) out.cross_desk_issue_count = null
  else if (typeof cd === 'number' && Number.isFinite(cd)) {
    const n = Math.floor(cd)
    if (n >= 0 && n <= 20) out.cross_desk_issue_count = n
  }
  const bd = raw.blocked_downstream_work_count
  if (bd === null) out.blocked_downstream_work_count = null
  else if (typeof bd === 'number' && Number.isFinite(bd)) {
    const n = Math.floor(bd)
    if (n >= 0 && n <= 5000) out.blocked_downstream_work_count = n
  }
  const top = raw.top_escalation_headline
  if (top === null) out.top_escalation_headline = null
  else if (typeof top === 'string') {
    const t = top.trim().slice(0, 400)
    if (t && !/[<>\\]/.test(t)) out.top_escalation_headline = t
  }
  const routes: string[] = []
  if (Array.isArray(raw.escalation_routes)) {
    for (const item of raw.escalation_routes.slice(0, 6)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 360)
      if (!t || /[<>\\]/.test(t)) continue
      routes.push(t)
    }
  }
  if (routes.length) out.escalation_routes = routes
  if (Object.keys(out).length === 0) return undefined
  return out
}

function validateCampaignManagerCommandRaw(
  raw: unknown,
): AgentJonesCampaignManagerCommandSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const lines: string[] = []
  if (Array.isArray(raw.command_lines)) {
    for (const item of raw.command_lines.slice(0, 8)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 420)
      if (!t || /[<>\\]/.test(t)) continue
      lines.push(t)
    }
  }
  if (!lines.length) return undefined
  const pick = (k: string): string | null => {
    const v = raw[k]
    if (v === null) return null
    if (typeof v !== 'string') return null
    const t = v.trim().slice(0, 420)
    if (!t || /[<>\\]/.test(t)) return null
    return t
  }
  const pickOpt = (k: string, max: number): string | null | undefined => {
    if (!(k in raw)) return undefined
    const v = raw[k]
    if (v === null) return null
    if (typeof v !== 'string') return undefined
    const t = v.trim().slice(0, max)
    if (!t || /[<>\\]/.test(t)) return undefined
    return t
  }
  const out: AgentJonesCampaignManagerCommandSafe = {
    command_lines: lines,
    top_opportunity_hint: pick('top_opportunity_hint'),
    top_risk_hint: pick('top_risk_hint'),
    cross_desk_note: pick('cross_desk_note'),
  }
  const riskArea = pickOpt('top_risk_area_hint', 200)
  if (riskArea !== undefined) out.top_risk_area_hint = riskArea
  const oppArea = pickOpt('top_opportunity_area_hint', 200)
  if (oppArea !== undefined) out.top_opportunity_area_hint = oppArea
  const intervention = pickOpt('recommended_intervention', 420)
  if (intervention !== undefined) out.recommended_intervention = intervention
  const readiness = pickOpt('field_readiness_framing', 320)
  if (readiness !== undefined) out.field_readiness_framing = readiness
  const covCal = pickOpt('coverage_task_pressure_line', 420)
  if (covCal !== undefined) out.coverage_task_pressure_line = covCal
  return out
}

function validateReadinessCoverageRaw(
  raw: unknown,
): AgentJonesReadinessCoverageSafe | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) return undefined
  const summary_lines: string[] = []
  const thin_areas: string[] = []
  if (Array.isArray(raw.summary_lines)) {
    for (const item of raw.summary_lines.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 360)
      if (!t || /[<>\\]/.test(t)) continue
      summary_lines.push(t)
    }
  }
  if (Array.isArray(raw.thin_areas)) {
    for (const item of raw.thin_areas.slice(0, 4)) {
      if (typeof item !== 'string') continue
      const t = item.trim().slice(0, 360)
      if (!t || /[<>\\]/.test(t)) continue
      thin_areas.push(t)
    }
  }
  if (!summary_lines.length && !thin_areas.length) return undefined
  return { summary_lines, thin_areas }
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
    const operating = validateOperatingRaw(raw.operating)
    const priority_signals = validatePrioritySignalsRaw(raw.priority_signals)
    const desk_summary = validateDeskSummaryRaw(raw.desk_summary)
    const navigation_hints = validateNavigationHintsRaw(raw.navigation_hints)
    const task_pressure = validateTaskPressureRaw(raw.task_pressure)
    const session_coaching = validateSessionCoachingRaw(raw.session_coaching)
    const calendar_summary = validateCalendarSummaryRaw(raw.calendar_summary)
    const proactive_alerts = validateProactiveAlertsRaw(raw.proactive_alerts)
    const leadership_command = validateLeadershipCommandRaw(raw.leadership_command)
    const readiness_coverage = validateReadinessCoverageRaw(raw.readiness_coverage)
    const geo_intelligence = validateGeoIntelligenceRaw(raw.geo_intelligence)
    const field_intelligence = validateFieldIntelligenceRaw(raw.field_intelligence)
    const coverage_intelligence = validateCoverageIntelligenceRaw(raw.coverage_intelligence)
    const demographic_summary = validateDemographicSummaryRaw(raw.demographic_summary)
    const escalation_summary = validateEscalationSummaryRaw(raw.escalation_summary)
    const campaign_manager_command = validateCampaignManagerCommandRaw(
      raw.campaign_manager_command,
    )
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
      ...(operating ? { operating } : {}),
      ...(priority_signals ? { priority_signals } : {}),
      ...(desk_summary ? { desk_summary } : {}),
      ...(navigation_hints ? { navigation_hints } : {}),
      ...(task_pressure ? { task_pressure } : {}),
      ...(session_coaching ? { session_coaching } : {}),
      ...(calendar_summary ? { calendar_summary } : {}),
      ...(proactive_alerts ? { proactive_alerts } : {}),
      ...(leadership_command ? { leadership_command } : {}),
      ...(readiness_coverage ? { readiness_coverage } : {}),
      ...(geo_intelligence ? { geo_intelligence } : {}),
      ...(field_intelligence ? { field_intelligence } : {}),
      ...(coverage_intelligence ? { coverage_intelligence } : {}),
      ...(demographic_summary ? { demographic_summary } : {}),
      ...(escalation_summary ? { escalation_summary } : {}),
      ...(campaign_manager_command ? { campaign_manager_command } : {}),
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
  return `You are Agent Jones V3.2, a context-aware campaign operator inside CampaignOS (field-intelligence and coverage-command layer on top of v3 / v3.1).

Rules:
- You ONLY reason about the volunteer using the JSON "dashboardContext" below. Do not claim you queried a database, opened Supabase, or accessed tools beyond this context.
- dashboardContext.surface is one of: volunteer_dashboard | intern_desk | coordinator_desk | candidate_desk | admin_desk. Match tone: volunteer_dashboard/intern_desk emphasize individual tasks and roster; coordinator_desk emphasizes supervised teams, blocked/overdue mission lanes, and intern pipeline counts (no volunteer PII); candidate_desk emphasizes KPI health, strategic focus, and when to use coordinator vs volunteer surfaces — never invent polling or finance detail; admin_desk emphasizes honest governance: desk health visible with this session, exceptions, KPI telemetry, integration readiness — never imply org-wide queues or privileged writes you cannot see in context.
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
- If dashboardContext.operating exists, it is a deterministic “campaign operating brain” snapshot built client-side: normalized_role, desk_route, leadership_level, user_scope (self | supervised_teams | campaign_wide), recommended_mode (guide|command|ops|task|calendar|leadership|training), command_summary (attention_now, on_track, next_steps, recent_changes), urgent_signals (label + explanation + severity + optional owner_hint and route_hint), exception_summary, desk_health, kpi_telemetry, readiness_summary, optional signal_epoch (stable fingerprint of this visible state, including assignment timing hints and desk-lane health — not an audit log). Treat command_summary + priority_signals as the priority stack: lead with attention_now, acknowledge on_track, close with next_steps. recent_changes only lists meaningful deltas since the last fingerprint; empty means no material shift. Never invent urgency not reflected here. For admin_desk + campaign_wide scope, sound like a calm field director.
- If dashboardContext.priority_signals exists, each entry is a client-ranked card (severity critical|high|medium|low, category, title, explanation). Use it to sequence urgency in your reply; never invent cards that are not listed.
- If dashboardContext.desk_summary exists, it mirrors the operating desk headline and lists — stay consistent with dashboardContext.operating.command_summary when both are present.
- If dashboardContext.navigation_hints exists, it is at most three scroll/navigate affordances the UI already exposes; prefer aligning your suggested moves with these hints when relevant.
- If dashboardContext.task_pressure exists, it is a compact count-only workload headline (missions, daily remaining, intern overdue, coordinator blocked/overdue). Use it for tone, not for numbers we do not show there.
- If dashboardContext.session_coaching exists, it includes signal_epoch and avoid_repeating (short phrases). signal_epoch may end with a compact v3.2 intel tag (e.g. "|v32:…") so area/escalation-derived coaching updates when those summaries change — treat like any other signal_epoch bump. When avoid_repeating is non-empty, those lines were already shown for this epoch — do not repeat the same opening or stock phrases; offer a fresh angle or the next concrete move instead.
- **Derived intelligence first:** When geo_intelligence, field_intelligence, coverage_intelligence, demographic_summary, escalation_summary, and/or campaign_manager_command exist, anchor area narrative, sequencing, and pressure on those blocks before improvising. On coordinator_desk, admin_desk, and candidate_desk, treat proactive_alerts (including area/staffing/escalation supplements) as operational signals, not filler.
- **Demographic discipline:** Never cite census counts, turnout percentages, or voter-file microtargeting absent from demographic_summary; population_band is qualitative scale only, not a population estimate.
- **Role/scope concision:** Match depth to surface — volunteer_dashboard and intern_desk stay task-forward; avoid CM-style command stacking unless the user asks or role is CM/ACM.
- Prefer concise operational summaries (short paragraphs). recommendedActions must use only the allowlisted scroll targets and navigate paths listed below — never invent URLs or section IDs.
- If data is missing from dashboardContext, say what is missing honestly; do not imply tools or databases you do not have.
- If dashboardContext.calendar_summary exists, it is a lightweight timing layer (assignment deadlines, daily beats, governance warnings, optional supervised-board staffing hints from assigned-not-started counts) — not a full org calendar. Never invent events or RSVPs not implied there.
- If dashboardContext.proactive_alerts exists, these are deterministic client nudges with stable ids (readiness, timing, coordinator blocked/overdue, KPI thin, exception pending, desk lane urgent, no next step, etc.), severity-ranked — incorporate when relevant; do not duplicate them verbatim if session_coaching asks for fresh wording.
- If dashboardContext.leadership_command exists, it is a compact command synthesis for admin/coordinator/candidate-style roles (pressure, on track, what changed, look-first, KPI/supervised board, desk lanes, timing hints) plus one recommended_intervention — align tone; still do not claim tools or data outside context.
- If dashboardContext.readiness_coverage exists, it summarizes roster-path pressure and where visible execution looks thin (summary_lines, thin_areas) — use for coverage framing; do not invent county staffing or event RSVPs.
- If dashboardContext.geo_intelligence exists, it is roster-safe geography (precinct/county/district-style labels from the linked voter record, scope_type) — not a full targeting universe, turf map, or census dump.
- If dashboardContext.field_intelligence exists, it is visible-session field pressure (top_field_risks, coordinator counts, capacity warnings, area_readiness_summary) — synthesize campaign-manager-style command tone from these plus coordinator_ops/leadership_snapshot; do not claim multi-county analytics absent from context.
- If dashboardContext.coverage_intelligence exists, it is assignment-level coverage and staffing hints (readiness_headline, event_staffing_pressure_count, missing_leadership_slots) from visible boards — not an event RSVP system or raw database.
- If dashboardContext.demographic_summary exists, it is coaching-only framing from public campaign pillars plus roster-safe geography scope — population_band is qualitative scale only (no numeric census in payload). Never census tables, turnout models, or invented demographic facts. If confidence_note warns that context is thin, say so honestly.
- If dashboardContext.escalation_summary exists, it summarizes visible cross-desk pressure routes from exceptions, coordinator boards, intern overdue signals, KPI lanes, and urgent desk health — use it to sequence one honest escalation path; do not invent additional desks or queues. Leadership synthesis may repeat this for admin/coordinator/CM; stay consistent.
- If dashboardContext.campaign_manager_command exists, the user is in CM/ACM command mode — lead with command_lines; use top_risk_area_hint / top_opportunity_area_hint as session proxies only; recommended_intervention is sequencing from visible signals; field_readiness_framing states honest analytics limits; coverage_task_pressure_line merges visible coverage and timing layer — still no raw data dumps or tools beyond context.

dashboardContext:
${JSON.stringify(context)}

Output a single JSON object with:
- "response" (string, required): your answer to the user.
- "suggestedPrompts" (optional): max 4 strings (short, tap-friendly). Vary wording from prior turns when session_coaching.avoid_repeating is present.
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
