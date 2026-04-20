import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import {
  getAgentJonesGuidanceBundle,
  scrollToDashboardId,
  type AgentJonesPrompt,
} from '../lib/agentJonesGuidance'
import {
  buildAgentJonesContextV2,
  type AgentJonesContextV2,
  type AgentJonesRelationalPower5Context,
  type AgentJonesVolunteerMissionContext,
  type AgentJonesDailyActivationContext,
  type AgentJonesInternLayerContext,
  type AgentJonesCampaignGoalsContext,
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
  loadAgentJonesPersisted,
  saveAgentJonesPersisted,
} from '../lib/agentJonesSessionStorage'
import { supabase } from '../lib/supabaseClient'
import type { MomentumAction } from '../lib/onboardingEngine'
import { isDevAuthBypassEnabled } from '../lib/devAuth'
import { applyDevOnboardingMomentumAction } from '../lib/devOnboardingMomentum'
import { useAgentJonesVoiceRecorder } from '../hooks/useAgentJonesVoiceRecorder'

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
}: AgentJonesPanelProps) {
  const persisted = useMemo(() => loadAgentJonesPersisted(), [])
  const bundle = useMemo(
    () =>
      getAgentJonesGuidanceBundle({
        slice: progressSlice,
        profile,
        voterLoading,
      }),
    [progressSlice, profile, voterLoading],
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

  const voice = useAgentJonesVoiceRecorder()

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

      setActivePromptId('voice-message')
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
      } catch (err) {
        setReply(
          buildAgentJonesFallbackV2({
            slice: progressSlice,
            profile,
            voterLoading,
            volunteerMission: volunteerMission ?? null,
            dailyActivation: dailyActivation ?? null,
            internLayer: internLayer ?? null,
            campaignGoals: campaignGoals ?? null,
          }),
        )
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
      volunteerMission,
      dailyActivation,
      internLayer,
      campaignGoals,
      runRecommendedActions,
    ],
  )

  useEffect(() => {
    if (!persistSession) return
    saveAgentJonesPersisted({
      activePromptId,
      reply,
      aiError,
    })
  }, [activePromptId, reply, aiError, persistSession])

  const gridPrompts = useMemo(
    () =>
      reply?.suggestedPrompts?.length
        ? [...bundle.prompts, ...stringsToFollowUps(reply.suggestedPrompts)]
        : bundle.prompts,
    [bundle.prompts, reply],
  )

  useEffect(() => {
    let cancelled = false
    async function run() {
      const base = buildAgentJonesContextV2({
        profile,
        matchedVoter: matchedVoter ?? null,
        voterMatched,
        progressSlice,
        voterLoading,
        relationalPower5: relationalPower5 ?? null,
        volunteerMission: volunteerMission ?? null,
        dailyActivation: dailyActivation ?? null,
        internLayer: internLayer ?? null,
        campaignGoals: campaignGoals ?? null,
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
  ])

  const handleSelect = async (prompt: AgentJonesPrompt) => {
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

    const isFollowUp = Boolean(prompt.followUpSourceId)
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
    } catch (err) {
      if (!isFollowUp && prompt.response) {
        setReply({
          response: prompt.response,
          insight: { type: 'strategy', message: 'Deterministic roster-safe reply.' },
        })
      } else {
        setReply(
          buildAgentJonesFallbackV2({
            slice: progressSlice,
            profile,
            voterLoading,
            volunteerMission: volunteerMission ?? null,
            dailyActivation: dailyActivation ?? null,
            internLayer: internLayer ?? null,
            campaignGoals: campaignGoals ?? null,
          }),
        )
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

  const rootClass = sectionClassName ?? 'card agent-jones-card stack-section'

  return (
    <section
      className={rootClass}
      aria-labelledby="agent-jones-title"
    >
      <p
        className="subtitle agent-jones-eyebrow"
      >
        Guidance layer
      </p>
      <h2 id="agent-jones-title" className="page-title" style={{ marginTop: 4 }}>
        Agent Jones
      </h2>
      <p className="subtitle agent-jones-internal-notice" role="note">
        {AGENT_JONES_ACCESS_NOTICE}
      </p>
      <p className="subtitle" style={{ marginTop: 0 }}>
        {bundle.greeting}
      </p>
      <p id="agent-jones-state" className="subtitle" style={{ marginTop: 0 }}>
        {bundle.stateExplanation}
      </p>

      <SuggestedPromptList
        prompts={gridPrompts}
        activeId={activePromptId}
        disabled={aiLoading}
        onSelect={handleSelect}
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
        <p className="subtitle agent-jones-voice-hint" style={{ margin: 0 }}>
          OpenAI transcription via Netlify — Agent Jones only. Max 600 characters
          sent to the assistant.
        </p>
        {voice.lastError ? (
          <p className="subtitle agent-jones-error-line" style={{ margin: 0 }}>
            {voice.lastError}
          </p>
        ) : null}
      </div>

      <div
        className="agent-jones-response"
        role="region"
        aria-label="Response"
        aria-live="polite"
      >
        {aiLoading ? (
          <p className="subtitle" style={{ marginBottom: reply?.response ? 8 : 0 }}>
            Asking Agent Jones…
          </p>
        ) : null}
        {reply?.insight ? (
          <div className="agent-jones-insight" role="note">
            <span className="agent-jones-insight-pill">{reply.insight.type}</span>
            <span className="agent-jones-insight-text">{reply.insight.message}</span>
          </div>
        ) : null}
        {reply?.response ? (
          <>
            <p className="agent-jones-response-text">{reply.response}</p>
            {actionButtons?.length ? (
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
                    {a.type === 'scroll' ? 'Go to section' : 'Open link'}
                  </button>
                ))}
              </div>
            ) : null}
            {aiError ? (
              <p className="subtitle agent-jones-error-line">
                {aiError} — showing roster-safe fallback when available.
              </p>
            ) : null}
          </>
        ) : !aiLoading ? (
          <p className="agent-jones-response-placeholder subtitle">
            Tap a suggestion — answers use live assist with only the dashboard
            state we pass to the server (no API keys in the browser). If the
            function is unreachable, you will see the same deterministic copy as
            before.
          </p>
        ) : null}
      </div>
    </section>
  )
}
