import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import {
  getAgentJonesGuidanceBundle,
  scrollToDashboardId,
  type AgentJonesPrompt,
} from '../lib/agentJonesGuidance'
import { buildAgentJonesOperatingContext } from '../lib/agentJonesPriorities'
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
import { getRelevantCampaignContext } from '../lib/agentJonesKnowledge'
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

export const AGENT_JONES_CLEAR_EVENT = 'campaignos:agent-jones-clear'

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
}: AgentJonesPanelProps) {
  const location = useLocation()
  const headingId = useId()
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

  const voice = useAgentJonesVoiceRecorder()

  const resetConversation = useCallback(() => {
    clearAgentJonesConversationStorage()
    setActivePromptId(null)
    setReply(null)
    setAiError(null)
    setDraftInput('')
    setTranscript([])
  }, [])

  useEffect(() => {
    const onClear = () => {
      resetConversation()
    }
    window.addEventListener(AGENT_JONES_CLEAR_EVENT, onClear)
    return () => window.removeEventListener(AGENT_JONES_CLEAR_EVENT, onClear)
  }, [resetConversation])

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
        const next = await callAgentJones({
          context: built,
          userMessage,
        })
        setReply(next)
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
    })
  }, [
    activePromptId,
    reply,
    aiError,
    draftInput,
    transcript,
    persistSession,
  ])

  const gridPrompts = useMemo(
    () =>
      reply?.suggestedPrompts?.length
        ? [...bundle.prompts, ...stringsToFollowUps(reply.suggestedPrompts)]
        : bundle.prompts,
    [bundle.prompts, reply],
  )

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
          campaignSlug: 'chris-jones-for-congress',
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
      const next = await callAgentJones({
        context: built,
        userMessage,
      })
      setReply(next)
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

  const rootClass =
    sectionClassName ?? 'card agent-jones-card stack-section agent-jones-premium'

  return (
    <section
      className={rootClass}
      aria-labelledby={headingId}
    >
      <p className="subtitle agent-jones-eyebrow">Strategic advisor</p>
      <h2 id={headingId} className="agent-jones-title">
        Jones AI
      </h2>
      <p className="agent-jones-lede">
        Precision briefings from the dashboard state we share with the server — no
        theatrics, no data we do not already hold.
      </p>

      <div
        className={`agent-jones-access-pill agent-jones-access-pill--${caps.internetAccessTier}`}
        role="status"
      >
        <span className="agent-jones-access-pill-label">{caps.accessModeLabel}</span>
        <span className="agent-jones-access-pill-desc">{caps.accessModeDescription}</span>
      </div>

      <p className="subtitle agent-jones-internal-notice" role="note">
        {AGENT_JONES_ACCESS_NOTICE}
      </p>
      <div className="agent-jones-context-block">
        <p className="agent-jones-context-line">{bundle.greeting}</p>
        <p id="agent-jones-state" className="agent-jones-context-line agent-jones-context-line--meta">
          {bundle.stateExplanation}
        </p>
      </div>

      <div
        className="agent-jones-transcript"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {transcript.length === 0 && !aiLoading ? (
          <p className="agent-jones-transcript-empty">
            No messages yet. Tap a suggested brief, type below, or use hold-to-speak.
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

      <SuggestedPromptList
        prompts={gridPrompts}
        activeId={activePromptId}
        disabled={aiLoading}
        onSelect={handleSelect}
      />

      <div className="agent-jones-typed-compose">
        <label className="sr-only" htmlFor="agent-jones-draft-input">
          Message to Agent Jones
        </label>
        <textarea
          id="agent-jones-draft-input"
          className="agent-jones-draft-input input-stretch"
          rows={3}
          maxLength={600}
          value={draftInput}
          placeholder="Type a question (max 600 characters)…"
          onChange={(e) => setDraftInput(e.target.value)}
          disabled={aiLoading || !contextV2}
        />
        <button
          type="button"
          className="btn-touch btn-primary agent-jones-send-btn"
          disabled={aiLoading || !contextV2 || !draftInput.trim()}
          onClick={() => {
            const t = draftInput.trim()
            if (!t) return
            setDraftInput('')
            void submitCustomUserMessage(t)
          }}
        >
          Send
        </button>
      </div>

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
        <p className="subtitle agent-jones-voice-hint" style={{ margin: 0 }}>
          Hold-to-speak: audio transcribes via Netlify (OpenAI). At most 600
          characters per message — same privacy envelope as typed prompts.
        </p>
        {voice.lastError ? (
          <p className="subtitle agent-jones-error-line" style={{ margin: 0 }}>
            {voice.lastError}
          </p>
        ) : null}
      </div>

      {reply?.response && actionButtons?.length ? (
        <div
          className="agent-jones-actions"
          aria-label="Recommended actions"
        >
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
              {a.type === 'scroll' ? 'Go to section' : 'Open link'}
            </button>
          ))}
        </div>
      ) : null}

      {aiError ? (
        <p className="subtitle agent-jones-error-line" role="alert">
          {aiError} — showing roster-safe fallback when available.
        </p>
      ) : null}
    </section>
  )
}
