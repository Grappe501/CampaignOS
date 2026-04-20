import { useCallback, useEffect, useId, useState } from 'react'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import type { MatchedVoterDisplayRow } from '../lib/voterMatch'
import type {
  AgentJonesRelationalPower5Context,
  AgentJonesVolunteerMissionContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesCampaignGoalsContext,
} from '../lib/agentJonesContextV2'
import AgentJonesPanel from './AgentJonesPanel'

export type FloatingAgentJonesProps = {
  progressSlice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  voterMatched: boolean
  matchedVoter?: MatchedVoterDisplayRow | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProfileRefresh?: () => void | Promise<void>
  relationalPower5?: AgentJonesRelationalPower5Context | null
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
}

export default function FloatingAgentJones({
  progressSlice,
  profile,
  voterLoading,
  voterMatched,
  matchedVoter,
  open: controlledOpen,
  onOpenChange,
  onProfileRefresh,
  relationalPower5,
  volunteerMission,
  dailyActivation,
  internLayer,
  campaignGoals,
}: FloatingAgentJonesProps) {
  const panelId = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (!isControlled) setUncontrolledOpen(next)
    },
    [isControlled, onOpenChange],
  )

  useEffect(() => {
    const onToggle = () => {
      if (isControlled) {
        onOpenChange?.(!controlledOpen)
      } else {
        setUncontrolledOpen((o) => !o)
      }
    }
    window.addEventListener('campaignos:toggle-agent-jones', onToggle)
    return () => window.removeEventListener('campaignos:toggle-agent-jones', onToggle)
  }, [controlledOpen, isControlled, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <>
      <button
        type="button"
        className="floating-agent-jones-fab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="floating-agent-jones-fab-label">Agent Jones</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="floating-agent-jones-backdrop"
            aria-label="Close Agent Jones"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            className="floating-agent-jones-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Agent Jones assistant"
          >
            <div className="floating-agent-jones-panel-header">
              <div />
              <button
                type="button"
                className="floating-agent-jones-close"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="floating-agent-jones-panel-body">
              <AgentJonesPanel
                progressSlice={progressSlice}
                profile={profile}
                voterLoading={voterLoading}
                voterMatched={voterMatched}
                matchedVoter={matchedVoter}
                persistSession
                sectionClassName="agent-jones-floating-surface stack-section"
                onProfileRefresh={onProfileRefresh}
                relationalPower5={relationalPower5}
                volunteerMission={volunteerMission}
                dailyActivation={dailyActivation}
                internLayer={internLayer}
                campaignGoals={campaignGoals}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
