import { useContext } from 'react'
import { DevMockDashboardContext } from '../context/devMockDashboardContext'

export function useDevMockDashboard() {
  const ctx = useContext(DevMockDashboardContext)
  if (!ctx) {
    throw new Error(
      'useDevMockDashboard must be used within DevMockDashboardProvider',
    )
  }
  return ctx
}
