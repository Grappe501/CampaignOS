/* eslint-disable react-refresh/only-export-components -- provider + registry hook */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AgentJonesEventIntelligenceLayer } from '../lib/agentJonesEventIntelligenceBridge'

type Ctx = {
  layer: AgentJonesEventIntelligenceLayer | null
  setLayer: (next: AgentJonesEventIntelligenceLayer | null) => void
}

const EventIntelligenceLayerContext = createContext<Ctx | null>(null)

export function EventIntelligenceLayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayerState] = useState<AgentJonesEventIntelligenceLayer | null>(null)
  const setLayer = useCallback((next: AgentJonesEventIntelligenceLayer | null) => {
    setLayerState(next)
  }, [])
  const v = useMemo(() => ({ layer, setLayer }), [layer, setLayer])
  return (
    <EventIntelligenceLayerContext.Provider value={v}>{children}</EventIntelligenceLayerContext.Provider>
  )
}

const noopRegistry: Ctx = {
  layer: null,
  setLayer: () => {},
}

/** Returns registry; when outside Provider, setLayer is a no-op (safe for tests). */
export function useEventIntelligenceRegistry(): Ctx {
  const v = useContext(EventIntelligenceLayerContext)
  return v ?? noopRegistry
}
