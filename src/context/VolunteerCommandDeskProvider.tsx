import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useVolunteerCommandCoordinator } from '../hooks/useVolunteerCommandCoordinator'
import { VolunteerCommandDeskContext } from './volunteerCommandDeskContext'

/** Loads volunteer command coordinator data once on `/volunteers/command` for page + floating Agent Jones. */
export default function VolunteerCommandDeskProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const enabled = location.pathname === '/volunteers/command'
  const desk = useVolunteerCommandCoordinator('default', enabled)
  return (
    <VolunteerCommandDeskContext.Provider value={desk}>{children}</VolunteerCommandDeskContext.Provider>
  )
}
