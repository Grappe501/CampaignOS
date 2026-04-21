import { useContext } from 'react'
import {
  VolunteerCommandDeskContext,
  type VolunteerCommandDeskValue,
} from '../context/volunteerCommandDeskContext'

export function useVolunteerCommandDesk(): VolunteerCommandDeskValue {
  const ctx = useContext(VolunteerCommandDeskContext)
  if (!ctx) {
    throw new Error('useVolunteerCommandDesk must be used within VolunteerCommandDeskProvider')
  }
  return ctx
}
