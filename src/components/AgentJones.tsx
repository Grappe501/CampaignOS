import { useMemo, useState } from 'react'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import {
  getAgentJonesGuidanceBundle,
  scrollToDashboardId,
  type AgentJonesPrompt,
} from '../lib/agentJonesGuidance'
import {
  buildAgentJonesSafeContext,
  type AgentJonesTaskTrainingSummaries,
} from '../lib/agentJonesContext'
import {
  AgentJonesApiError,
  callAgentJones,
  type AgentJonesFollowUpPrompt,
} from '../lib/api/agentJones'
import SuggestedPromptList from './agentJones/SuggestedPromptList'

function followUpsToPrompts(
  items: AgentJonesFollowUpPrompt[],
): AgentJonesPrompt[] {
  return items.map((f, i) => ({
    id: `ai-followup-${f.id}-${i}`,
    label: f.label,
    response: '',
    followUpSourceId: f.id,
  }))
}

export default function AgentJones({
  progressSlice,
  profile,
  voterLoading,
  summaries,
}: {
  progressSlice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  summaries?: AgentJonesTaskTrainingSummaries | null
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
  const [responseText, setResponseText] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<AgentJonesFollowUpPrompt[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const gridPrompts = useMemo(
    () => [...bundle.prompts, ...followUpsToPrompts(followUps)],
    [bundle.prompts, followUps],
  )

  const safeContext = useMemo(
    () =>
      buildAgentJonesSafeContext({
        progressSlice,
        voterLoading,
        profile,
        summaries: summaries ?? undefined,
      }),
    [progressSlice, voterLoading, profile, summaries],
  )

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
    setFollowUps([])

    const runScrollActions = (
      actions: { type: string; targetId: string }[] | undefined,
    ) => {
      for (const a of actions ?? []) {
        if (a.type === 'scroll' && a.targetId) {
          scrollToDashboardId(a.targetId)
        }
      }
    }

    try {
      const reply = await callAgentJones({
        context: safeContext,
        userMessage,
      })
      setResponseText(reply.response)
      setFollowUps(reply.suggestedPrompts ?? [])
      runScrollActions(reply.actions)
    } catch (err) {
      setFollowUps([])
      if (!isFollowUp && prompt.response) {
        setResponseText(prompt.response)
      } else {
        setResponseText(
          'Could not reach Agent Jones. You can try another suggestion in a moment.',
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
          <p className="subtitle" style={{ marginBottom: responseText ? 8 : 0 }}>
            Asking Agent Jones…
          </p>
        ) : null}
        {responseText ? (
          <>
            <p className="agent-jones-response-text">{responseText}</p>
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
