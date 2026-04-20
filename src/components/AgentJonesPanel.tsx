import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import {
  getAgentJonesGuidanceBundle,
  scrollToDashboardId,
  type AgentJonesPrompt,
} from '../lib/agentJonesGuidance'
import {
  enrichLeadershipCommandWithV32,
  enrichLeadershipCommandWithV33,
  enrichLeadershipCommandWithV34,
} from '../lib/agentJonesLeadershipCommand'
import { buildAgentJonesOperatingContext } from '../lib/agentJonesPriorities'
import { buildAgentJonesTaskPressure } from '../lib/agentJonesTaskPressure'
import { buildAgentJonesV31Pack } from '../lib/agentJonesV31Pack'
import {
  agentJonesV32CommandScope,
  buildAgentJonesV32IntelEpoch,
  buildAgentJonesV32Pack,
} from '../lib/agentJonesV32Pack'
import { buildAgentJonesV33IntelEpoch, buildAgentJonesV33Pack } from '../lib/agentJonesV33Pack'
import { buildAgentJonesV34Pack } from '../lib/agentJonesV34Pack'
import {
  buildAgentJonesV34AtAGlanceLine,
  buildAgentJonesV34CoachingEpoch,
  prioritizeAgentJonesNavigationHintsForV34,
} from '../lib/agentJonesV34UiHelpers'
import { buildAgentJonesV34ProactiveSupplements } from '../lib/agentJonesProactiveV34'
import { enrichCampaignManagerCommandPass2 } from '../lib/agentJonesCampaignManagerCommand'
import { buildAgentJonesV32ProactiveSupplements, mergeProactiveAlertLists } from '../lib/agentJonesProactiveV32'
import { buildAgentJonesV33ProactiveSupplements } from '../lib/agentJonesProactiveV33'
import { buildAgentJonesV3Brain } from '../lib/agentJonesV3Brain'
import {
  buildAgentJonesContextV2,
  type AgentJonesContextV2,
  type AgentJonesRelationalPower5Context,
  type AgentJonesVolunteerMissionContext,
  type AgentJonesDailyActivationContext,
  type AgentJonesInternLayerContext,
  type AgentJonesCampaignGoalsContext,
  type AgentJonesSurface,
  type AgentJonesCoordinatorOpsContext,
  type AgentJonesLeadershipSnapshotContext,
} from '../lib/agentJonesContextV2'
import {
  AgentJonesApiError,
  callAgentJones,
  type AgentJonesResponse,
} from '../lib/api/agentJones'
import type { MatchedVoterDisplayRow } from '../lib/voterMatch'
import {
  getRelevantCampaignContext,
  getRelevantCampaignKnowledgeForQuestion,
} from '../lib/agentJonesKnowledge'
import { buildAgentJonesFallbackV2 } from '../lib/agentJonesBrain'
import SuggestedPromptList from './agentJones/SuggestedPromptList'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'
import { AGENT_JONES_ACCESS_NOTICE } from '../brand/compliance'
import {
  clearAgentJonesConversationStorage,
  loadAgentJonesPersisted,
  saveAgentJonesPersisted,
  type AgentJonesTranscriptEntry,
} from '../lib/agentJonesSessionStorage'
import {
  agentJonesPolicyPayload,
  getAgentJonesCapabilities,
} from '../lib/agentJonesCapabilities'
import { supabase } from '../lib/supabaseClient'
import type { MomentumAction } from '../lib/onboardingEngine'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import { applyDevOnboardingMomentumAction } from '../lib/devOnboardingMomentum'
import { useAgentJonesVoiceRecorder } from '../hooks/useAgentJonesVoiceRecorder'
import AgentJonesSummaryStrip from './agentJones/AgentJonesSummaryStrip'
import AgentJonesPriorityCards from './agentJones/AgentJonesPriorityCards'
import AgentJonesNextActions from './agentJones/AgentJonesNextActions'
import AgentJonesResponseComposer from './agentJones/AgentJonesResponseComposer'
import AgentJonesCalendarSummaryBlock from './agentJones/AgentJonesCalendarSummary'
import AgentJonesProactiveAlerts from './agentJones/AgentJonesProactiveAlerts'
import AgentJonesLeadershipSummary from './agentJones/AgentJonesLeadershipSummary'
import AgentJonesReadinessCoverageBlock from './agentJones/AgentJonesReadinessCoverage'
import AgentJonesV32Pass1Panel from './agentJones/AgentJonesV32Pass1Panel'
import AgentJonesAreaRanking from './agentJones/AgentJonesAreaRanking'
import AgentJonesSegmentationSummary from './agentJones/AgentJonesSegmentationSummary'
import AgentJonesDeploymentSummary from './agentJones/AgentJonesDeploymentSummary'
import AgentJonesTheaterSummary from './agentJones/AgentJonesTheaterSummary'
import AgentJonesCommandFusionBlock from './agentJones/AgentJonesCommandFusionBlock'
import AgentJonesV34Briefing from './agentJones/AgentJonesV34Briefing'
import {
  buildAgentJonesSessionCoachingPayload,
  composeAgentJonesCoachingSignalEpoch,
  extractAvoidPhrasesFromReply,
  normalizeCoachPhrase,
} from '../lib/agentJonesSessionCoaching'

export const AGENT_JONES_CLEAR_EVENT = 'campaignos:agent-jones-clear'

const AGENT_JONES_CAMPAIGN_SLUG = 'chris-jones-for-congress'

async function withRetrievedKnowledgeForQuestion(
  ctx: AgentJonesContextV2,
  userMessage: string,
): Promise<AgentJonesContextV2> {
  try {
    const retrievedKnowledge = await getRelevantCampaignKnowledgeForQuestion({
      campaignSlug: AGENT_JONES_CAMPAIGN_SLUG,
      userMessage,
    })
    if (!retrievedKnowledge.length) return ctx
    return {
      ...ctx,
      campaign: { ...ctx.campaign, retrievedKnowledge },
    }
  } catch {
    return ctx
  }
}

function auditPatch(meta?: { lastPrompt?: string }) {
  return {
    onboarding_last_action_at: new Date().toISOString(),
    ...(meta?.lastPrompt
      ? { onboarding_last_prompt: meta.lastPrompt.slice(0, 160) }
      : {}),
  }
}

async function persistMomentumAction(
  profileId: string | undefined,
  action: MomentumAction,
  meta?: { lastPrompt?: string },
): Promise<void> {
  if (isDevAuthBypassEnabled()) {
    applyDevOnboardingMomentumAction(action, meta)
    return
  }
  if (!profileId) return
  const a = auditPatch(meta)

  if (action.type === 'set_direction') {
    const { error } = await supabase
      .from('campaign_profiles')
      .update({
        ...a,
        onboarding_momentum_state: 'exploring',
        onboarding_direction_key: action.key,
      })
      .eq('id', profileId)
    if (error) console.error('Momentum direction update:', error)
    return
  }
  if (action.type === 'set_micro') {
    const { error } = await supabase
      .from('campaign_profiles')
      .update({
        ...a,
        onboarding_momentum_state: 'committed',
        onboarding_micro_commitment_key: action.key,
      })
      .eq('id', profileId)
    if (error) console.error('Momentum micro update:', error)
    return
  }
  if (action.mode === 'from_direction_skip') {
    const { error } = await supabase
      .from('campaign_profiles')
      .update({
        ...a,
        onboarding_momentum_state: 'engaged',
        onboarding_direction_key: null,
        onboarding_micro_commitment_key: null,
      })
      .eq('id', profileId)
    if (error) console.error('Momentum skip direction:', error)
    return
  }
  if (action.mode === 'from_micro_skip') {
    const { error } = await supabase
      .from('campaign_profiles')
      .update({
        ...a,
        onboarding_momentum_state: 'engaged',
        onboarding_micro_commitment_key: null,
      })
      .eq('id', profileId)
    if (error) console.error('Momentum skip micro:', error)
    return
  }
  const { error } = await supabase
    .from('campaign_profiles')
    .update({ ...a, onboarding_momentum_state: 'engaged' })
    .eq('id', profileId)
  if (error) console.error('Momentum reinforce done:', error)
}

function stringsToFollowUps(items: string[]): AgentJonesPrompt[] {
  return items.map((label, i) => ({
    id: `ai-followup-${i}`,
    label,
    response: '',
    followUpSourceId: `ai-${i}`,
  }))
}

function nextTranscriptId(): string {
  return `aj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function scrollActionLabel(targetId: string | undefined): string {
  if (!targetId) return 'Go to section'
  const map: Record<string, string> = {
    'mission-tasks': 'Mission tasks',
    'daily-activation': 'Daily activation',
    'coordinator-mission-ops': 'Mission ops',
    'intern-desk': 'Intern desk',
    'campaign-kpis': 'KPIs',
    'candidate-health-snapshot': 'Health snapshot',
    'admin-exceptions': 'Exceptions',
    'admin-desks': 'Desks',
    'admin-tasks': 'Tasks',
    'exception-request': 'Exception',
    'voter-workspace': 'Voter workspace',
    'workspace-cards': 'Workspace',
    'dash-profile-photo': 'Profile photo',
  }
  return map[targetId] ?? 'Go to section'
}

export type AgentJonesPanelProps = {
  progressSlice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  voterMatched: boolean
  matchedVoter?: MatchedVoterDisplayRow | null
  /** When true, persist reply/error to sessionStorage (floating panel). */
  persistSession?: boolean
  /** Optional class on root section (floating uses different surface). */
  sectionClassName?: string
  /** After momentum DB updates, refresh parent profile (floating panel). */
  onProfileRefresh?: () => void | Promise<void>
  relationalPower5?: AgentJonesRelationalPower5Context | null
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
  surface?: AgentJonesSurface
  coordinatorOps?: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot?: AgentJonesLeadershipSnapshotContext | null
  coordinatorHasSupervisorScope?: boolean
  /**
   * `floating` — conversation-first: answers + question, desk intel under
   * “Deeper understanding”. `standard` — full dashboard panel (legacy).
   */
  uiMode?: 'standard' | 'floating'
}

export default function AgentJonesPanel({
  progressSlice,
  profile,
  voterLoading,
  voterMatched,
  matchedVoter,
  persistSession = false,
  sectionClassName,
  onProfileRefresh,
  relationalPower5,
  volunteerMission,
  dailyActivation,
  internLayer,
  campaignGoals,
  surface,
  coordinatorOps,
  leadershipSnapshot,
  coordinatorHasSupervisorScope = false,
  uiMode = 'standard',
}: AgentJonesPanelProps) {
  const location = useLocation()
  const headingId = useId()
  const composeId = useId()
  const persisted = useMemo(() => loadAgentJonesPersisted(), [])
  const caps = useMemo(
    () => getAgentJonesCapabilities(profile?.primary_role),
    [profile?.primary_role],
  )

  const operating = useMemo(
    () =>
      buildAgentJonesOperatingContext({
        pathname: location.pathname,
        profile,
        primaryRole: profile?.primary_role,
        progressSlice,
        voterLoading,
        voterMatched,
        coordinatorHasSupervisorScope,
        relationalPower5: relationalPower5 ?? null,
        volunteerMission: volunteerMission ?? null,
        dailyActivation: dailyActivation ?? null,
        internLayer: internLayer ?? null,
        campaignGoals: campaignGoals ?? null,
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
      }),
    [
      location.pathname,
      profile,
      progressSlice,
      voterLoading,
      voterMatched,
      coordinatorHasSupervisorScope,
      relationalPower5,
      volunteerMission,
      dailyActivation,
      internLayer,
      campaignGoals,
      coordinatorOps,
      leadershipSnapshot,
    ],
  )

  const taskPressure = useMemo(
    () =>
      buildAgentJonesTaskPressure({
        volunteerMission: volunteerMission ?? null,
        dailyActivation: dailyActivation ?? null,
        internLayer: internLayer ?? null,
        coordinatorOps: coordinatorOps ?? null,
      }),
    [volunteerMission, dailyActivation, internLayer, coordinatorOps],
  )

  const v31Pack = useMemo(
    () =>
      buildAgentJonesV31Pack({
        surface: surface ?? 'volunteer_dashboard',
        operating,
        volunteerMission: volunteerMission ?? null,
        dailyActivation: dailyActivation ?? null,
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
        profile,
        progressSlice,
        internLayer: internLayer ?? null,
      }),
    [
      surface,
      operating,
      volunteerMission,
      dailyActivation,
      coordinatorOps,
      leadershipSnapshot,
      profile,
      progressSlice,
      internLayer,
    ],
  )

  const v32CampaignStub = useMemo(
    () => ({
      issuePillars: CHRIS_JONES_FOR_CONGRESS_PUBLIC.issuePillars.map((p) => ({
        title: p.title,
        summary: p.summary,
      })),
    }),
    [],
  )

  const v32Pack = useMemo(
    () =>
      buildAgentJonesV32Pack({
        surface: surface ?? 'volunteer_dashboard',
        operating,
        matchedVoter: matchedVoter ?? null,
        voterMatched,
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
        volunteerMission: volunteerMission ?? null,
        internLayer: internLayer ?? null,
        calendarSummary: v31Pack.calendar_summary ?? null,
        taskPressure,
        campaign: v32CampaignStub,
      }),
    [
      surface,
      operating,
      matchedVoter,
      voterMatched,
      coordinatorOps,
      leadershipSnapshot,
      volunteerMission,
      internLayer,
      v31Pack.calendar_summary,
      taskPressure,
      v32CampaignStub,
    ],
  )

  const v33Pack = useMemo(
    () =>
      buildAgentJonesV33Pack({
        surface: surface ?? 'volunteer_dashboard',
        operating,
        leadershipSnapshot: leadershipSnapshot ?? null,
        geo: v32Pack.geo_intelligence,
        field: v32Pack.field_intelligence,
        coverage: v32Pack.coverage_intelligence,
        demographic: v32Pack.demographic_summary,
        calendarSummary: v31Pack.calendar_summary ?? null,
        taskPressure,
        volunteerMission: volunteerMission ?? null,
        campaignManagerCommand: v32Pack.campaign_manager_command ?? null,
      }),
    [
      surface,
      operating,
      leadershipSnapshot,
      v32Pack.geo_intelligence,
      v32Pack.field_intelligence,
      v32Pack.coverage_intelligence,
      v32Pack.demographic_summary,
      v32Pack.campaign_manager_command,
      v31Pack.calendar_summary,
      taskPressure,
      volunteerMission,
    ],
  )

  const v33BrainForPanel =
    v33Pack && Object.keys(v33Pack).length > 0 ? v33Pack : null

  const v34Pack = useMemo(
    () =>
      buildAgentJonesV34Pack({
        surface: surface ?? 'volunteer_dashboard',
        operating,
        v33: v33BrainForPanel,
        calendarSummary: v31Pack.calendar_summary ?? null,
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
        field: v32Pack.field_intelligence,
        coverage: v32Pack.coverage_intelligence,
        escalation: v32Pack.escalation_summary,
      }),
    [
      surface,
      operating,
      v33BrainForPanel,
      v31Pack.calendar_summary,
      coordinatorOps,
      leadershipSnapshot,
      v32Pack.field_intelligence,
      v32Pack.coverage_intelligence,
      v32Pack.escalation_summary,
    ],
  )

  const v34BrainForPanel =
    v34Pack && Object.keys(v34Pack).length > 0 ? v34Pack : null

  const campaignManagerCommandForPanel = useMemo(() => {
    const raw = v32Pack.campaign_manager_command ?? null
    if (!raw) return null
    return enrichCampaignManagerCommandPass2(raw, {
      area_ranking: v33BrainForPanel?.area_ranking,
      segmentation_summary: v33BrainForPanel?.segmentation_summary,
      event_deployment: v33BrainForPanel?.event_deployment,
      campaign_phase: v34BrainForPanel?.campaign_phase ?? null,
      countdown_summary: v34BrainForPanel?.countdown_summary ?? null,
      gotv_summary: v34BrainForPanel?.gotv_summary ?? null,
      tradeoff_summary: v34BrainForPanel?.tradeoff_summary ?? null,
      intervention_sequence: v34BrainForPanel?.intervention_sequence ?? null,
      desk_routing: v34BrainForPanel?.desk_routing ?? null,
    })
  }, [v32Pack.campaign_manager_command, v33BrainForPanel, v34BrainForPanel])

  const v3Brain = useMemo(
    () =>
      buildAgentJonesV3Brain({
        pathname: location.pathname,
        surface: surface ?? 'volunteer_dashboard',
        operating,
        v32:
          v32Pack.geo_intelligence != null ||
          v32Pack.field_intelligence != null ||
          v32Pack.coverage_intelligence != null
            ? {
                geo: v32Pack.geo_intelligence,
                field: v32Pack.field_intelligence,
                coverage: v32Pack.coverage_intelligence,
              }
            : null,
        v33: v33BrainForPanel,
        v34: v34BrainForPanel,
      }),
    [location.pathname, surface, operating, v32Pack, v33BrainForPanel, v34BrainForPanel],
  )

  const navigationHintsForPanel = useMemo(() => {
    if (!v34BrainForPanel || Object.keys(v34BrainForPanel).length === 0) {
      return v3Brain.navigation_hints
    }
    return prioritizeAgentJonesNavigationHintsForV34(
      v3Brain.navigation_hints,
      v34BrainForPanel,
    )
  }, [v3Brain.navigation_hints, v34BrainForPanel])

  const v34AtAGlance = useMemo(
    () =>
      v34BrainForPanel && Object.keys(v34BrainForPanel).length > 0
        ? buildAgentJonesV34AtAGlanceLine(v34BrainForPanel)
        : null,
    [v34BrainForPanel],
  )

  const leadershipCommandDisplay = useMemo(
    () =>
      enrichLeadershipCommandWithV34({
        base: enrichLeadershipCommandWithV33({
          base: enrichLeadershipCommandWithV32({
            base: v31Pack.leadership_command ?? null,
            operating,
            geo: v32Pack.geo_intelligence,
            field: v32Pack.field_intelligence,
            coverage: v32Pack.coverage_intelligence,
            escalation: v32Pack.escalation_summary,
            surface: surface ?? 'volunteer_dashboard',
          }),
          operating,
          surface: surface ?? 'volunteer_dashboard',
          v33: v33BrainForPanel,
        }),
        operating,
        surface: surface ?? 'volunteer_dashboard',
        v34: v34BrainForPanel,
      }),
    [
      v31Pack.leadership_command,
      operating,
      v32Pack.geo_intelligence,
      v32Pack.field_intelligence,
      v32Pack.coverage_intelligence,
      v32Pack.escalation_summary,
      surface,
      v33BrainForPanel,
      v34BrainForPanel,
    ],
  )

  const proactiveAlertsMerged = useMemo(() => {
    const surf = surface ?? 'volunteer_dashboard'
    const cmdScope = agentJonesV32CommandScope({
      surface: surf,
      normalizedRole: operating.normalized_role,
      userScope: operating.user_scope,
    })
    let merged = mergeProactiveAlertLists(
      v31Pack.proactive_alerts,
      buildAgentJonesV32ProactiveSupplements({
        operating,
        commandScope: cmdScope,
        surface: surf,
        geo: v32Pack.geo_intelligence,
        field: v32Pack.field_intelligence,
        coverage: v32Pack.coverage_intelligence,
        escalation: v32Pack.escalation_summary,
      }),
      cmdScope ? 6 : 5,
    )
    if (v33BrainForPanel?.command_fusion) {
      merged = mergeProactiveAlertLists(
        merged,
        buildAgentJonesV33ProactiveSupplements({
          surface: surf,
          operating,
          fusion: v33BrainForPanel.command_fusion,
        }),
        6,
      )
    }
    if (v34BrainForPanel && Object.keys(v34BrainForPanel).length > 0) {
      merged = mergeProactiveAlertLists(
        merged,
        buildAgentJonesV34ProactiveSupplements({
          surface: surf,
          operating,
          v34: v34BrainForPanel,
          commandFusion: v33BrainForPanel?.command_fusion,
        }),
        6,
      )
    }
    return merged
  }, [
    v31Pack.proactive_alerts,
    operating,
    surface,
    v32Pack.geo_intelligence,
    v32Pack.field_intelligence,
    v32Pack.coverage_intelligence,
    v32Pack.escalation_summary,
    v33BrainForPanel,
    v34BrainForPanel,
  ])

  const leadershipPanelIntel = useMemo(() => {
    const s = surface ?? 'volunteer_dashboard'
    return s === 'admin_desk' || s === 'candidate_desk' || s === 'coordinator_desk'
  }, [surface])

  const chiefPriorityForNextActions = useMemo(() => {
    if (
      !leadershipPanelIntel ||
      !v34BrainForPanel ||
      Object.keys(v34BrainForPanel).length === 0
    ) {
      return null
    }
    const ri = leadershipCommandDisplay?.recommended_intervention?.trim()
    return ri ? ri.slice(0, 360) : null
  }, [leadershipPanelIntel, v34BrainForPanel, leadershipCommandDisplay?.recommended_intervention])

  const v32IntelEpoch = useMemo(() => buildAgentJonesV32IntelEpoch(v32Pack), [v32Pack])

  const v33CommandVisible = useMemo(
    () =>
      agentJonesV32CommandScope({
        surface: surface ?? 'volunteer_dashboard',
        normalizedRole: operating.normalized_role,
        userScope: operating.user_scope,
      }),
    [surface, operating.normalized_role, operating.user_scope],
  )

  const bundle = useMemo(
    () =>
      getAgentJonesGuidanceBundle({
        slice: progressSlice,
        profile,
        voterLoading,
        surface: surface ?? 'volunteer_dashboard',
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
        operating,
      }),
    [
      progressSlice,
      profile,
      voterLoading,
      surface,
      coordinatorOps,
      leadershipSnapshot,
      operating,
    ],
  )

  const [activePromptId, setActivePromptId] = useState<string | null>(
    persisted.activePromptId ?? null,
  )
  const [reply, setReply] = useState<AgentJonesResponse | null>(
    persisted.reply ?? null,
  )
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(persisted.aiError ?? null)
  const [contextV2, setContextV2] = useState<AgentJonesContextV2 | null>(null)
  const [draftInput, setDraftInput] = useState(persisted.draftInput ?? '')
  const [transcript, setTranscript] = useState<AgentJonesTranscriptEntry[]>(
    () => persisted.transcript ?? [],
  )
  const [coachingMeta, setCoachingMeta] = useState<{
    epoch: string | null
    phrases: string[]
  }>(() => ({
    epoch: persisted.coachingEpoch ?? null,
    phrases: persisted.lastAvoidPhrases ?? [],
  }))

  const voice = useAgentJonesVoiceRecorder()

  const resetConversation = useCallback(() => {
    clearAgentJonesConversationStorage()
    setActivePromptId(null)
    setReply(null)
    setAiError(null)
    setDraftInput('')
    setTranscript([])
    setCoachingMeta({ epoch: null, phrases: [] })
  }, [])

  useEffect(() => {
    const onClear = () => {
      resetConversation()
    }
    window.addEventListener(AGENT_JONES_CLEAR_EVENT, onClear)
    return () => window.removeEventListener(AGENT_JONES_CLEAR_EVENT, onClear)
  }, [resetConversation])

  const contextForApi = useCallback(
    (ctx: AgentJonesContextV2): AgentJonesContextV2 => {
      const v33Epoch = buildAgentJonesV33IntelEpoch({
        area_ranking: ctx.area_ranking,
        area_ranking_note: ctx.area_ranking_note,
        segmentation_summary: ctx.segmentation_summary,
        event_deployment: ctx.event_deployment,
        command_fusion: ctx.command_fusion,
        campaign_theater: ctx.campaign_theater,
      })
      const v34Epoch = buildAgentJonesV34CoachingEpoch({
        campaign_phase: ctx.campaign_phase,
        countdown_summary: ctx.countdown_summary,
        tradeoff_summary: ctx.tradeoff_summary,
        intervention_sequence: ctx.intervention_sequence,
        gotv_summary: ctx.gotv_summary,
      })
      const coaching = buildAgentJonesSessionCoachingPayload({
        signalEpoch: composeAgentJonesCoachingSignalEpoch(
          operating.signal_epoch,
          v32IntelEpoch,
          v33Epoch || undefined,
          v34Epoch || undefined,
        ),
        persistedEpoch: coachingMeta.epoch,
        persistedPhrases: coachingMeta.phrases,
      })
      return coaching ? { ...ctx, session_coaching: coaching } : ctx
    },
    [
      operating.signal_epoch,
      v32IntelEpoch,
      coachingMeta.epoch,
      coachingMeta.phrases,
    ],
  )

  const runRecommendedActions = useCallback(
    (actions: AgentJonesResponse['recommendedActions']) => {
      for (const a of actions ?? []) {
        if (a.type === 'scroll' && a.targetId) {
          scrollToDashboardId(a.targetId)
        }
        if (a.type === 'navigate' && a.targetId) {
          window.location.assign(a.targetId)
        }
      }
    },
    [],
  )

  const submitCustomUserMessage = useCallback(
    async (rawMessage: string) => {
      const userMessage = rawMessage.trim().slice(0, 600)
      if (!userMessage) return

      const userEntry: AgentJonesTranscriptEntry = {
        id: nextTranscriptId(),
        role: 'user',
        text: userMessage,
        at: Date.now(),
      }
      setTranscript((t) => [...t, userEntry])
      setActivePromptId('typed-message')
      setAiError(null)
      setAiLoading(true)
      setReply(null)

      try {
        const built = contextV2
        if (!built) {
          throw new AgentJonesApiError('Agent Jones context not ready', 0, null)
        }
        const enriched = await withRetrievedKnowledgeForQuestion(built, userMessage)
        const next = await callAgentJones({
          context: contextForApi(enriched),
          userMessage,
        })
        setReply(next)
        setCoachingMeta({
          epoch: operating.signal_epoch,
          phrases: extractAvoidPhrasesFromReply(next),
        })
        runRecommendedActions(next.recommendedActions)
        setTranscript((t) => [
          ...t,
          {
            id: nextTranscriptId(),
            role: 'assistant',
            text: next.response,
            at: Date.now(),
            ...(next.insight
              ? {
                  insight: {
                    type: next.insight.type,
                    message: next.insight.message,
                  },
                }
              : {}),
          },
        ])
      } catch (err) {
        const fallback = buildAgentJonesFallbackV2({
          slice: progressSlice,
          profile,
          voterLoading,
          surface: surface ?? 'volunteer_dashboard',
          coordinatorOps: coordinatorOps ?? null,
          leadershipSnapshot: leadershipSnapshot ?? null,
          volunteerMission: volunteerMission ?? null,
          dailyActivation: dailyActivation ?? null,
          internLayer: internLayer ?? null,
          campaignGoals: campaignGoals ?? null,
          operating,
        })
        setReply(fallback)
        setTranscript((t) => [
          ...t,
          {
            id: nextTranscriptId(),
            role: 'assistant',
            text: fallback.response,
            at: Date.now(),
            ...(fallback.insight
              ? {
                  insight: {
                    type: fallback.insight.type,
                    message: fallback.insight.message,
                  },
                }
              : {}),
          },
        ])
        const msg =
          err instanceof AgentJonesApiError
            ? err.message
            : 'Agent Jones request failed'
        setAiError(msg)
      } finally {
        setAiLoading(false)
      }
    },
    [
      contextV2,
      contextForApi,
      progressSlice,
      profile,
      voterLoading,
      surface,
      coordinatorOps,
      leadershipSnapshot,
      volunteerMission,
      dailyActivation,
      internLayer,
      campaignGoals,
      operating,
      runRecommendedActions,
    ],
  )

  useEffect(() => {
    if (!persistSession) return
    saveAgentJonesPersisted({
      activePromptId,
      reply,
      aiError,
      draftInput,
      transcript: transcript.slice(-48),
      coachingEpoch: coachingMeta.epoch,
      lastAvoidPhrases: coachingMeta.phrases,
    })
  }, [
    activePromptId,
    reply,
    aiError,
    draftInput,
    transcript,
    coachingMeta.epoch,
    coachingMeta.phrases,
    persistSession,
  ])

  const gridPrompts = useMemo(() => {
    const raw = reply?.suggestedPrompts ?? []
    if (!raw.length) return bundle.prompts
    const avoid =
      coachingMeta.epoch === operating.signal_epoch
        ? new Set(coachingMeta.phrases.map(normalizeCoachPhrase))
        : new Set<string>()
    const filtered = raw.filter((p) => !avoid.has(normalizeCoachPhrase(p)))
    const useList = filtered.length ? filtered : raw
    return [...bundle.prompts, ...stringsToFollowUps(useList)]
  }, [bundle.prompts, reply, coachingMeta, operating.signal_epoch])

  const policyPayload = useMemo(() => agentJonesPolicyPayload(caps), [caps])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const base = buildAgentJonesContextV2({
        profile,
        matchedVoter: matchedVoter ?? null,
        voterMatched,
        progressSlice,
        voterLoading,
        surface: surface ?? 'volunteer_dashboard',
        pathname: location.pathname,
        relationalPower5: relationalPower5 ?? null,
        volunteerMission: volunteerMission ?? null,
        dailyActivation: dailyActivation ?? null,
        internLayer: internLayer ?? null,
        campaignGoals: campaignGoals ?? null,
        coordinatorOps: coordinatorOps ?? null,
        leadershipSnapshot: leadershipSnapshot ?? null,
        policy: policyPayload,
        operating,
      })
      try {
        const campaign = await getRelevantCampaignContext({
          campaignSlug: AGENT_JONES_CAMPAIGN_SLUG,
          context: { user: base.user, operational: base.operational },
        })
        if (!cancelled) {
          setContextV2({ ...base, campaign })
        }
      } catch {
        if (!cancelled) {
          setContextV2({
            ...base,
            campaign: {
              slogan: CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan,
              shortBio: CHRIS_JONES_FOR_CONGRESS_PUBLIC.shortBio,
              issuePillars: CHRIS_JONES_FOR_CONGRESS_PUBLIC.issuePillars.map((p) => ({
                title: p.title,
                summary: p.summary,
              })),
              ctas: CHRIS_JONES_FOR_CONGRESS_PUBLIC.ctas.map((c) => ({
                label: c.label,
                url: c.url,
              })),
            },
          })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [
    profile,
    matchedVoter,
    voterMatched,
    progressSlice,
    voterLoading,
    relationalPower5,
    volunteerMission,
    dailyActivation,
    internLayer,
    campaignGoals,
    surface,
    coordinatorOps,
    leadershipSnapshot,
    policyPayload,
    operating,
    location.pathname,
  ])

  const handleSelect = async (prompt: AgentJonesPrompt) => {
    const isFollowUp = Boolean(prompt.followUpSourceId)
    const userLine = isFollowUp
      ? prompt.label.trim().slice(0, 600)
      : prompt.label.trim().slice(0, 600)
    if (userLine) {
      setTranscript((t) => [
        ...t,
        {
          id: nextTranscriptId(),
          role: 'user',
          text: userLine,
          at: Date.now(),
        },
      ])
    }

    setActivePromptId(prompt.id)
    setAiError(null)
    if (prompt.scrollToId) {
      scrollToDashboardId(prompt.scrollToId)
    }

    if (prompt.momentumAction) {
      const pid =
        profile?.id != null && profile.id !== ''
          ? String(profile.id)
          : undefined
      await persistMomentumAction(pid, prompt.momentumAction, {
        lastPrompt: prompt.id,
      })
      await onProfileRefresh?.()
    }

    const userMessage = isFollowUp
      ? prompt.label.trim().slice(0, 600)
      : `[${prompt.id}] ${prompt.label}`.slice(0, 600)

    setAiLoading(true)
    setReply(null)

    try {
      const built = contextV2
      if (!built) {
        throw new AgentJonesApiError('Agent Jones context not ready', 0, null)
      }
      const enriched = await withRetrievedKnowledgeForQuestion(built, userMessage)
      const next = await callAgentJones({
        context: contextForApi(enriched),
        userMessage,
      })
      setReply(next)
      setCoachingMeta({
        epoch: operating.signal_epoch,
        phrases: extractAvoidPhrasesFromReply(next),
      })
      runRecommendedActions(next.recommendedActions)
      setTranscript((t) => [
        ...t,
        {
          id: nextTranscriptId(),
          role: 'assistant',
          text: next.response,
          at: Date.now(),
          ...(next.insight
            ? {
                insight: {
                  type: next.insight.type,
                  message: next.insight.message,
                },
              }
            : {}),
        },
      ])
    } catch (err) {
      if (!isFollowUp && prompt.response) {
        const det = {
          response: prompt.response,
          insight: { type: 'strategy' as const, message: 'Deterministic roster-safe reply.' },
        }
        setReply(det)
        setTranscript((t) => [
          ...t,
          {
            id: nextTranscriptId(),
            role: 'assistant',
            text: det.response,
            at: Date.now(),
            insight: {
              type: det.insight.type,
              message: det.insight.message,
            },
          },
        ])
      } else {
        const fallback = buildAgentJonesFallbackV2({
          slice: progressSlice,
          profile,
          voterLoading,
          surface: surface ?? 'volunteer_dashboard',
          coordinatorOps: coordinatorOps ?? null,
          leadershipSnapshot: leadershipSnapshot ?? null,
          volunteerMission: volunteerMission ?? null,
          dailyActivation: dailyActivation ?? null,
          internLayer: internLayer ?? null,
          campaignGoals: campaignGoals ?? null,
          operating,
        })
        setReply(fallback)
        setTranscript((t) => [
          ...t,
          {
            id: nextTranscriptId(),
            role: 'assistant',
            text: fallback.response,
            at: Date.now(),
            ...(fallback.insight
              ? {
                  insight: {
                    type: fallback.insight.type,
                    message: fallback.insight.message,
                  },
                }
              : {}),
          },
        ])
      }
      const msg =
        err instanceof AgentJonesApiError
          ? err.message
          : 'Agent Jones request failed'
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }

  const actionButtons = reply?.recommendedActions?.filter(
    (a) => a.type === 'scroll' || a.type === 'navigate',
  )

  const deskFraming = useMemo(() => {
    const s = surface ?? 'volunteer_dashboard'
    switch (s) {
      case 'intern_desk':
        return {
          eyebrow: 'Intern operations',
          lede: 'Queue pressure, first contacts, and follow-ups — from data visible on this desk.',
        }
      case 'coordinator_desk':
        return {
          eyebrow: 'Coordinator operations',
          lede: 'Supervised lanes, intern pipeline risk, and reassignment — no volunteer PII in this panel.',
        }
      case 'candidate_desk':
        return {
          eyebrow: 'Leadership desk',
          lede: 'Campaign health and where principals spend attention — KPI-grounded, no invented systems.',
        }
      case 'admin_desk':
        return {
          eyebrow: 'Governance',
          lede: 'Exceptions, desk health, and honest limits of what this client session can see.',
        }
      default:
        return {
          eyebrow: 'Volunteer field desk',
          lede: 'Missions, daily activation, and roster-safe next steps — tied to the operating strip above.',
        }
    }
  }, [surface])

  const rootClass =
    sectionClassName ?? 'card agent-jones-card stack-section agent-jones-premium'

  const transcriptBlock = (
    <div
      className="agent-jones-transcript"
      role="log"
      aria-label="Conversation"
      aria-live="polite"
    >
      {transcript.length === 0 && !aiLoading ? (
        <p className="agent-jones-transcript-empty">
          {uiMode === 'floating'
            ? 'No messages yet — ask below or tap a suggestion.'
            : 'No messages yet. Tap a suggested brief, type below, or use hold-to-speak.'}
        </p>
      ) : null}
      {transcript.map((turn) => (
        <div
          key={turn.id}
          className={`agent-jones-turn agent-jones-turn--${turn.role}`}
        >
          {turn.role === 'user' ? (
            <span className="agent-jones-turn-label">You</span>
          ) : (
            <span className="agent-jones-turn-label">Agent Jones</span>
          )}
          {turn.insight ? (
            <div className="agent-jones-insight agent-jones-insight--compact" role="note">
              <span className="agent-jones-insight-pill">{turn.insight.type}</span>
              <span className="agent-jones-insight-text">{turn.insight.message}</span>
            </div>
          ) : null}
          <p className="agent-jones-turn-text">{turn.text}</p>
        </div>
      ))}
      {aiLoading ? (
        <p className="agent-jones-loading agent-jones-loading--inline">
          <span className="agent-jones-loading-dot" aria-hidden />
          Synthesizing response…
        </p>
      ) : null}
    </div>
  )

  const questionBlock = (
    <>
      <SuggestedPromptList
        prompts={gridPrompts}
        activeId={activePromptId}
        disabled={aiLoading}
        onSelect={handleSelect}
      />

      <AgentJonesResponseComposer
        id={composeId}
        surface={surface ?? 'volunteer_dashboard'}
        value={draftInput}
        disabled={aiLoading || !contextV2}
        onChange={setDraftInput}
        onSend={() => {
          const t = draftInput.trim()
          if (!t) return
          setDraftInput('')
          void submitCustomUserMessage(t)
        }}
      />

      <div className="agent-jones-voice-row">
        <button
          type="button"
          className="btn-touch agent-jones-voice-btn"
          disabled={
            !voice.isSupported ||
            aiLoading ||
            voice.phase === 'transcribing' ||
            !contextV2
          }
          aria-label="Hold to speak. Release to send to Agent Jones."
          onPointerDown={(e) => {
            if (
              !voice.isSupported ||
              aiLoading ||
              voice.phase === 'transcribing' ||
              !contextV2
            ) {
              return
            }
            e.currentTarget.setPointerCapture(e.pointerId)
            void voice.startRecording()
          }}
          onPointerUp={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            void (async () => {
              const text = await voice.stopRecordingAndTranscribe()
              if (text) await submitCustomUserMessage(text)
            })()
          }}
          onPointerCancel={(e) => {
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            voice.cancelRecording()
          }}
        >
          {voice.phase === 'recording'
            ? 'Listening…'
            : voice.phase === 'transcribing'
              ? 'Transcribing…'
              : 'Hold to speak'}
        </button>
        <p
          className={
            uiMode === 'floating'
              ? 'subtitle agent-jones-voice-hint agent-jones-voice-hint--floating'
              : 'subtitle agent-jones-voice-hint'
          }
          style={{ margin: 0 }}
        >
          {uiMode === 'floating'
            ? 'Hold to speak — transcribes like typing (600 characters max).'
            : 'Hold-to-speak: audio transcribes via Netlify (OpenAI). At most 600 characters per message — same privacy envelope as typed prompts.'}
        </p>
        {voice.lastError ? (
          <p className="subtitle agent-jones-error-line" style={{ margin: 0 }}>
            {voice.lastError}
          </p>
        ) : null}
      </div>
    </>
  )

  const recommendedActionsBlock =
    reply?.response && actionButtons?.length ? (
      <div className="agent-jones-actions" aria-label="Recommended actions">
        {actionButtons.slice(0, 3).map((a, i) => (
          <button
            key={`${a.type}-${a.targetId ?? ''}-${i}`}
            type="button"
            className="btn-touch btn-primary agent-jones-action-btn"
            onClick={() => {
              if (a.type === 'scroll' && a.targetId) scrollToDashboardId(a.targetId)
              if (a.type === 'navigate' && a.targetId) window.location.assign(a.targetId)
            }}
          >
            {a.type === 'scroll'
              ? scrollActionLabel(a.targetId)
              : `Open ${(a.targetId ?? '/').replace(/^\//, '') || 'page'}`}
          </button>
        ))}
      </div>
    ) : null

  const deskIntelCore = (
    <>
      <div
        className={`agent-jones-access-pill agent-jones-access-pill--${caps.internetAccessTier}`}
        role="status"
      >
        <span className="agent-jones-access-pill-label">{caps.accessModeLabel}</span>
        <span className="agent-jones-access-pill-desc">{caps.accessModeDescription}</span>
      </div>

      <AgentJonesSummaryStrip
        summary={v3Brain.desk_summary}
        taskPressureHeadline={taskPressure.headline}
      />
      {v34AtAGlance ? (
        <p className="agent-jones-v34-at-a-glance" role="status">
          {v34AtAGlance}
        </p>
      ) : null}
      {v34BrainForPanel && Object.keys(v34BrainForPanel).length > 0 ? (
        leadershipPanelIntel ? (
          <details className="agent-jones-v34-details">
            <summary className="agent-jones-v34-details-summary">
              Chief of staff detail — phase, tradeoffs, sequence, GOTV
            </summary>
            <AgentJonesV34Briefing pack={v34BrainForPanel} />
          </details>
        ) : (
          <AgentJonesV34Briefing pack={v34BrainForPanel} />
        )
      ) : null}
      {leadershipPanelIntel ? (
        <AgentJonesNextActions
          hints={navigationHintsForPanel}
          nextStepLines={operating.command_summary.next_steps}
          chiefPriorityLine={chiefPriorityForNextActions}
        />
      ) : null}
      {leadershipPanelIntel && leadershipCommandDisplay ? (
        <AgentJonesLeadershipSummary
          command={leadershipCommandDisplay}
          suppressRecommendedIntervention={Boolean(chiefPriorityForNextActions)}
        />
      ) : null}
      <AgentJonesV32Pass1Panel
        geo={v32Pack.geo_intelligence}
        field={v32Pack.field_intelligence}
        coverage={v32Pack.coverage_intelligence}
        demographic={v32Pack.demographic_summary}
        escalation={v32Pack.escalation_summary}
        campaignManagerCommand={campaignManagerCommandForPanel}
        panelLayout={leadershipPanelIntel ? 'leadership' : 'default'}
      />
      {v33CommandVisible &&
      (v33Pack.area_ranking?.length ||
        v33Pack.area_ranking_note ||
        v33Pack.segmentation_summary ||
        v33Pack.event_deployment ||
        v33Pack.command_fusion ||
        v33Pack.campaign_theater) ? (
        <div
          className="agent-jones-v31-calendar agent-jones-v33-commander"
          role="region"
          aria-label="Campaign commander intelligence"
        >
          <p className="agent-jones-v3-section-label">Commander view (v3.3)</p>
          {v33Pack.area_ranking?.length || v33Pack.area_ranking_note ? (
            <AgentJonesAreaRanking
              areas={v33Pack.area_ranking ?? []}
              note={v33Pack.area_ranking_note}
            />
          ) : null}
          {v33Pack.segmentation_summary ? (
            <AgentJonesSegmentationSummary summary={v33Pack.segmentation_summary} />
          ) : null}
          {v33Pack.event_deployment ? (
            <AgentJonesDeploymentSummary deployment={v33Pack.event_deployment} />
          ) : null}
          {v33Pack.command_fusion ? (
            <AgentJonesCommandFusionBlock fusion={v33Pack.command_fusion} />
          ) : null}
          {v33Pack.campaign_theater ? (
            <AgentJonesTheaterSummary theater={v33Pack.campaign_theater} />
          ) : null}
        </div>
      ) : null}
      {v31Pack.calendar_summary ? (
        <AgentJonesCalendarSummaryBlock summary={v31Pack.calendar_summary} />
      ) : null}
      {proactiveAlertsMerged.length ? (
        <AgentJonesProactiveAlerts alerts={proactiveAlertsMerged} />
      ) : null}
      {!leadershipPanelIntel && leadershipCommandDisplay ? (
        <AgentJonesLeadershipSummary command={leadershipCommandDisplay} />
      ) : null}
      {v31Pack.readiness_coverage ? (
        <AgentJonesReadinessCoverageBlock coverage={v31Pack.readiness_coverage} />
      ) : null}
      <AgentJonesPriorityCards signals={v3Brain.priority_signals} />
      {!leadershipPanelIntel ? (
        <AgentJonesNextActions
          hints={navigationHintsForPanel}
          nextStepLines={operating.command_summary.next_steps}
        />
      ) : null}

      <p className="subtitle agent-jones-internal-notice" role="note">
        {AGENT_JONES_ACCESS_NOTICE}
      </p>
      <div className="agent-jones-context-block">
        <p className="agent-jones-context-line">{bundle.greeting}</p>
        <p id="agent-jones-state" className="agent-jones-context-line agent-jones-context-line--meta">
          {bundle.stateExplanation}
        </p>
      </div>
    </>
  )

  const deskIntelForDeeper = (
    <>
      <p className="agent-jones-lede agent-jones-lede--deeper">{deskFraming.lede}</p>
      {deskIntelCore}
    </>
  )

  if (uiMode === 'floating') {
    return (
      <section className={rootClass} aria-labelledby={headingId}>
        <h2 id={headingId} className="sr-only">
          Agent Jones
        </h2>
        <p className="agent-jones-floating-desk-hint">{deskFraming.eyebrow}</p>

        <div className="agent-jones-floating-qa">
          <p className="agent-jones-floating-region-label">Answer</p>
          {transcriptBlock}
          <p className="agent-jones-floating-region-label">Your question</p>
          {questionBlock}
          {recommendedActionsBlock}
          {aiError ? (
            <p className="subtitle agent-jones-error-line" role="alert">
              {aiError} — showing roster-safe fallback when available.
            </p>
          ) : null}

          <details className="agent-jones-deeper">
            <summary className="agent-jones-deeper-summary">
              Deeper understanding — desk and commander signals
            </summary>
            <div className="agent-jones-deeper-body">{deskIntelForDeeper}</div>
          </details>
        </div>
      </section>
    )
  }

  return (
    <section className={rootClass} aria-labelledby={headingId}>
      <p className="subtitle agent-jones-eyebrow">{deskFraming.eyebrow}</p>
      <h2 id={headingId} className="agent-jones-title">
        Agent Jones
      </h2>
      <p className="agent-jones-lede">{deskFraming.lede}</p>

      {deskIntelCore}

      {transcriptBlock}
      {questionBlock}
      {recommendedActionsBlock}

      {aiError ? (
        <p className="subtitle agent-jones-error-line" role="alert">
          {aiError} — showing roster-safe fallback when available.
        </p>
      ) : null}
    </section>
  )
}
