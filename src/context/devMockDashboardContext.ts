import { createContext } from 'react'
import type { DevMockDashboardState } from '../lib/devAuth'

export type DevMockDashboardContextValue = {
  mockState: DevMockDashboardState
  setMockState: (s: DevMockDashboardState) => void
  bypassActive: boolean
}

export const DevMockDashboardContext =
  createContext<DevMockDashboardContextValue | null>(null)
