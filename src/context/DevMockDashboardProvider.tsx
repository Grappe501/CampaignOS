import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DevMockDashboardContext } from './devMockDashboardContext'
import {
  type DevMockDashboardState,
  isDevAuthBypassEnabled,
  parseDevMockDashboardStateFromEnv,
  parseDevMockDashboardStateString,
} from '../lib/devAuth'

const STORAGE_KEY = 'campaignos-dev-mock-dashboard-state'

function readStoredMockState(): DevMockDashboardState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseDevMockDashboardStateString(raw)
  } catch {
    return null
  }
}

function initialMockState(): DevMockDashboardState {
  if (!isDevAuthBypassEnabled()) return 'unmatched'
  return readStoredMockState() ?? parseDevMockDashboardStateFromEnv()
}

export function DevMockDashboardProvider({ children }: { children: ReactNode }) {
  const bypassActive = isDevAuthBypassEnabled()
  const [mockState, setInternal] = useState<DevMockDashboardState>(initialMockState)

  const setMockState = useCallback((s: DevMockDashboardState) => {
    if (!isDevAuthBypassEnabled()) return
    setInternal(s)
    try {
      sessionStorage.setItem(STORAGE_KEY, s)
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const value = useMemo(
    () => ({
      mockState: bypassActive ? mockState : 'unmatched',
      setMockState,
      bypassActive,
    }),
    [bypassActive, mockState, setMockState],
  )

  return (
    <DevMockDashboardContext.Provider value={value}>
      {children}
    </DevMockDashboardContext.Provider>
  )
}
