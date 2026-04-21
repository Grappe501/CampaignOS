/* eslint-disable react-refresh/only-export-components -- context + hooks */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AgentJonesCockpitFocus, AgentJonesCockpitMissionDigest } from '../lib/agentJonesContextV2'

type CockpitTelemetryValue = {
  focus: AgentJonesCockpitFocus | null
  missionDigest: AgentJonesCockpitMissionDigest | null
  setCockpitFocus: (next: AgentJonesCockpitFocus | null) => void
  setCockpitMissionDigest: (next: AgentJonesCockpitMissionDigest | null) => void
}

const CockpitTelemetryContext = createContext<CockpitTelemetryValue | null>(null)

export function CockpitTelemetryProvider({ children }: { children: ReactNode }) {
  const [focus, setCockpitFocus] = useState<AgentJonesCockpitFocus | null>(null)
  const [missionDigest, setCockpitMissionDigest] = useState<AgentJonesCockpitMissionDigest | null>(
    null,
  )
  const v = useMemo(
    (): CockpitTelemetryValue => ({
      focus,
      missionDigest,
      setCockpitFocus,
      setCockpitMissionDigest,
    }),
    [focus, missionDigest],
  )
  return (
    <CockpitTelemetryContext.Provider value={v}>
      {children}
    </CockpitTelemetryContext.Provider>
  )
}

const noop = () => {}

/** Safe outside provider — Agent Jones omits cockpit telemetry when unset. */
export function useCockpitTelemetry(): CockpitTelemetryValue {
  const x = useContext(CockpitTelemetryContext)
  if (!x) {
    return {
      focus: null,
      missionDigest: null,
      setCockpitFocus: noop,
      setCockpitMissionDigest: noop,
    }
  }
  return x
}
