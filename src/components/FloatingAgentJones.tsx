import { useCallback, useEffect, useId, useState } from 'react'
import type { CampaignProfile } from '../hooks/useProfile'
import type { DashboardProgressSlice } from '../lib/dashboardState'
import type { MatchedVoterDisplayRow } from '../lib/voterMatch'
import { resetAgentJonesIfProgressionChanged } from '../lib/agentJonesSessionStorage'
import type {
  AgentJonesRelationalPower5Context,
  AgentJonesVolunteerMissionContext,
  AgentJonesDailyActivationContext,
  AgentJonesInternLayerContext,
  AgentJonesCampaignGoalsContext,
  AgentJonesSurface,
  AgentJonesCoordinatorOpsContext,
  AgentJonesLeadershipSnapshotContext,
} from '../lib/agentJonesContextV2'
import type { AgentJonesEventIntelligenceLayer } from '../lib/agentJonesEventIntelligenceBridge'
import type { AgentJonesEventOperationsExecutive } from '../lib/leadershipBriefingAgentBridge'
import AgentJonesPanel, { AGENT_JONES_CLEAR_EVENT } from './AgentJonesPanel'
import AgentJonesLauncher from './agentJones/AgentJonesLauncher'
import AgentJonesFloatingPanel from './agentJones/AgentJonesFloatingPanel'

export type FloatingAgentJonesProps = {
  /** Bumps session when onboarding slice / branch / gate changes meaningfully. */
  progressionEpoch: string
  progressSlice: DashboardProgressSlice
  profile: CampaignProfile | null
  voterLoading: boolean
  voterMatched: boolean
  matchedVoter?: MatchedVoterDisplayRow | null
  surface?: AgentJonesSurface
  coordinatorOps?: AgentJonesCoordinatorOpsContext | null
  leadershipSnapshot?: AgentJonesLeadershipSnapshotContext | null
  /** Used for operating-scope hints when not on /coordinator. */
  coordinatorHasSupervisorScope?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProfileRefresh?: () => void | Promise<void>
  relationalPower5?: AgentJonesRelationalPower5Context | null
  volunteerMission?: AgentJonesVolunteerMissionContext | null
  dailyActivation?: AgentJonesDailyActivationContext | null
  internLayer?: AgentJonesInternLayerContext | null
  campaignGoals?: AgentJonesCampaignGoalsContext | null
  /** Event command desk — optional grounded briefing payload for Agent Jones API. */
  eventIntelligenceLayer?: AgentJonesEventIntelligenceLayer | null
  /** Leadership briefing page — executive event-ops digest for Agent Jones API. */
  eventOperationsExecutive?: AgentJonesEventOperationsExecutive | null
}

export default function FloatingAgentJones({
  progressionEpoch,
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
  eventIntelligenceLayer,
  eventOperationsExecutive,
  surface,
  coordinatorOps,
  leadershipSnapshot,
  coordinatorHasSupervisorScope = false,
}: FloatingAgentJonesProps) {
  resetAgentJonesIfProgressionChanged(progressionEpoch)

  const panelDomId = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen

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
    const onOpenEvt = () => {
      if (isControlled) {
        onOpenChange?.(true)
      } else {
        setUncontrolledOpen(true)
      }
    }
    window.addEventListener('campaignos:toggle-agent-jones', onToggle)
    window.addEventListener('campaignos:open-agent-jones', onOpenEvt)
    return () => {
      window.removeEventListener('campaignos:toggle-agent-jones', onToggle)
      window.removeEventListener('campaignos:open-agent-jones', onOpenEvt)
    }
  }, [controlledOpen, isControlled, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const requestClear = useCallback(() => {
    window.dispatchEvent(new Event(AGENT_JONES_CLEAR_EVENT))
  }, [])

  const toggleOpen = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(!controlledOpen)
    } else {
      setUncontrolledOpen((o) => !o)
    }
  }, [controlledOpen, isControlled, onOpenChange])

  return (
    <div className="floating-agent-jones-root">
      <AgentJonesLauncher
        panelId={panelDomId}
        panelOpen={open}
        onToggle={toggleOpen}
      />

      {open ? (
        <>
          <button
            type="button"
            className="floating-agent-jones-backdrop"
            aria-label="Close Agent Jones"
            onClick={() => setOpen(false)}
          />
          <AgentJonesFloatingPanel
            id={panelDomId}
            onRequestClose={() => setOpen(false)}
            onRequestClear={requestClear}
          >
            <AgentJonesPanel
              key={progressionEpoch}
              progressSlice={progressSlice}
              profile={profile}
              voterLoading={voterLoading}
              voterMatched={voterMatched}
              matchedVoter={matchedVoter}
              surface={surface}
              coordinatorOps={coordinatorOps}
              leadershipSnapshot={leadershipSnapshot}
              coordinatorHasSupervisorScope={coordinatorHasSupervisorScope}
              persistSession
              uiMode="floating"
              sectionClassName="agent-jones-floating-surface stack-section agent-jones-premium agent-jones-floating-qa-root"
              onProfileRefresh={onProfileRefresh}
              relationalPower5={relationalPower5}
              volunteerMission={volunteerMission}
              dailyActivation={dailyActivation}
              internLayer={internLayer}
              campaignGoals={campaignGoals}
              eventIntelligenceLayer={eventIntelligenceLayer ?? undefined}
              eventOperationsExecutive={eventOperationsExecutive ?? null}
            />
          </AgentJonesFloatingPanel>
        </>
      ) : null}
    </div>
  )
}
