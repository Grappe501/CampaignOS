import { useEffect, useMemo, useState } from 'react'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import {
  getAgentJonesGuidanceBundle,
  scrollToDashboardId,
  type AgentJonesPrompt,
} from '../lib/agentJonesGuidance'
import { buildAgentJonesContextV2, type AgentJonesContextV2 } from '../lib/agentJonesContextV2'
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

function stringsToFollowUps(items: string[]): AgentJonesPrompt[] {
  return items.map((label, i) => ({
    id: `ai-followup-${i}`,
    label,
    response: '',
    followUpSourceId: `ai-${i}`,
  }))
}

export default function AgentJones({
  progressSlice,
  profile,
  voterLoading,
  voterMatched,
  matchedVoter,
}: {
  progressSlice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  voterMatched: boolean
  matchedVoter?: MatchedVoterDisplayRow | null
}) {
  const bundle = useMemo(
    () =>
      getAgentJonesGuidanceBundle({
        slice: progressSlice,
        profile,
        voterLoading,
      }),
    [progressSlice, profile, voterLoading],
  )

  const [activePromptId, setActivePromptId] = useState<string | null>(null)
  const [reply, setReply] = useState<AgentJonesResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [contextV2, setContextV2] = useState<AgentJonesContextV2 | null>(null)

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
  }, [profile, matchedVoter, voterMatched, progressSlice, voterLoading])

  const handleSelect = async (prompt: AgentJonesPrompt) => {
    setActivePromptId(prompt.id)
    setAiError(null)
    if (prompt.scrollToId) {
      scrollToDashboardId(prompt.scrollToId)
    }

    const isFollowUp = Boolean(prompt.followUpSourceId)
    const userMessage = isFollowUp
      ? prompt.label.trim().slice(0, 600)
      : `[${prompt.id}] ${prompt.label}`.slice(0, 600)

    setAiLoading(true)
    setReply(null)

    const runActions = (actions: AgentJonesResponse['recommendedActions']) => {
      for (const a of actions ?? []) {
        if (a.type === 'scroll' && a.targetId) {
          scrollToDashboardId(a.targetId)
        }
        if (a.type === 'navigate' && a.targetId) {
          window.location.assign(a.targetId)
        }
      }
    }

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
      runActions(next.recommendedActions)
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

  return (
    <section
      className="card agent-jones-card stack-section"
      aria-labelledby="agent-jones-title"
    >
      <p
        className="subtitle"
        style={{
          margin: 0,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          color: 'var(--accent)',
        }}
      >
        Guidance layer
      </p>
      <h2 id="agent-jones-title" className="page-title" style={{ marginTop: 4 }}>
        Agent Jones
      </h2>
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
              <p className="subtitle" style={{ marginTop: 8, color: 'var(--warn, #b45309)' }}>
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
