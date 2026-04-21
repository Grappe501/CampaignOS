import { createContext } from 'react'

export type VolunteerCommandDeskValue = ReturnType<
  typeof import('../hooks/useVolunteerCommandCoordinator').useVolunteerCommandCoordinator
>

export const VolunteerCommandDeskContext = createContext<VolunteerCommandDeskValue | null>(null)
