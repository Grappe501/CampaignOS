/* eslint-disable react-refresh/only-export-components -- provider pair */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AgentJonesEventAiOrchestration } from '../lib/agentJonesContextV2'

type Ctx = {
  cockpitOrchestration: AgentJonesEventAiOrchestration | null
  eventDeskOrchestration: AgentJonesEventAiOrchestration | null
  /** Event desk overrides cockpit when both set */
  effectiveOrchestration: AgentJonesEventAiOrchestration | null
  setCockpitEventAiOrchestration: (next: AgentJonesEventAiOrchestration | null) => void
  setEventDeskEventAiOrchestration: (next: AgentJonesEventAiOrchestration | null) => void
}

const EventAiOrchestrationContext = createContext<Ctx | null>(null)

export function EventAiOrchestrationProvider({ children }: { children: ReactNode }) {
  const [cockpitOrchestration, setCockpitEventAiOrchestration] =
    useState<AgentJonesEventAiOrchestration | null>(null)
  const [eventDeskOrchestration, setEventDeskEventAiOrchestration] =
    useState<AgentJonesEventAiOrchestration | null>(null)

  const effectiveOrchestration = useMemo(
    () => eventDeskOrchestration ?? cockpitOrchestration,
    [eventDeskOrchestration, cockpitOrchestration],
  )

  const v = useMemo(
    (): Ctx => ({
      cockpitOrchestration,
      eventDeskOrchestration,
      effectiveOrchestration,
      setCockpitEventAiOrchestration,
      setEventDeskEventAiOrchestration,
    }),
    [cockpitOrchestration, eventDeskOrchestration, effectiveOrchestration],
  )

  return (
    <EventAiOrchestrationContext.Provider value={v}>{children}</EventAiOrchestrationContext.Provider>
  )
}

const noop = () => {}

export function useEventAiOrchestration(): Ctx {
  const x = useContext(EventAiOrchestrationContext)
  if (!x) {
    return {
      cockpitOrchestration: null,
      eventDeskOrchestration: null,
      effectiveOrchestration: null,
      setCockpitEventAiOrchestration: noop,
      setEventDeskEventAiOrchestration: noop,
    }
  }
  return x
}

/** Clear event-desk orchestration when leaving an event record route */
export function useClearEventDeskOrchestrationOnUnmount(): void {
  const { setEventDeskEventAiOrchestration } = useEventAiOrchestration()
  useEffect(
    () => () => setEventDeskEventAiOrchestration(null),
    [setEventDeskEventAiOrchestration],
  )
}
