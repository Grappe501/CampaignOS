/**
 * Field check-in, notes, and 24/48/72h follow-up tracking models.
 */

export type CheckInAttendeeFlags = {
  volunteerInterest?: boolean
  donorInterest?: boolean
  issueConcern?: boolean
  influencerOrLeader?: boolean
  walkIn?: boolean
}

export type CheckInAttendee = {
  id: string
  displayName: string
  supporterLookupKey?: string | null
  flags: CheckInAttendeeFlags
  checkedInAt: string
}

export type EventFieldNotes = {
  mainConcerns: string[]
  candidateResonance: string | null
  topQuestions: string[]
  oppositionThemes: string[]
  followUpRequested: string | null
  volunteerReadiness: 'low' | 'medium' | 'high' | null
}

export type FollowUpHorizon = 'h24' | 'h48' | 'h72'

export type FollowUpTaskSpec = {
  id: string
  kind:
    | 'thank_you'
    | 'volunteer_callback'
    | 'donor_followup'
    | 'issue_response'
    | 'host_debrief'
    | 'county_intel_review'
  horizon: FollowUpHorizon
  title: string
  ownerRoleHint: string
  complete: boolean
}

export type PostEventOutcomeSummary = {
  eventId: string
  attendance: number | null
  newVolunteers: number | null
  supportersIdentified: number | null
  donorProspects: number | null
  issueThemes: string[]
  influencers: { name: string; notes?: string }[]
  followUpAssigned: boolean
  followUpTasks: FollowUpTaskSpec[]
  horizonCompletion: Record<FollowUpHorizon, number>
}

export function defaultFollowUpHorizons(): Record<FollowUpHorizon, number> {
  return { h24: 0, h48: 0, h72: 0 }
}

export function generateDefaultPostEventFollowUps(eventId: string): FollowUpTaskSpec[] {
  const mk = (
    kind: FollowUpTaskSpec['kind'],
    horizon: FollowUpHorizon,
    title: string,
    ownerRoleHint: string,
  ): FollowUpTaskSpec => ({
    id: `${eventId}::${kind}::${horizon}`,
    kind,
    horizon,
    title,
    ownerRoleHint,
    complete: false,
  })
  return [
    mk('thank_you', 'h24', 'Send thank-you to attendees', 'event_coordinator'),
    mk('volunteer_callback', 'h48', 'Callback volunteer leads', 'volunteer_coordinator'),
    mk('donor_followup', 'h48', 'Donor prospect follow-up', 'finance_lead'),
    mk('issue_response', 'h72', 'Route issue themes to policy/comms', 'communications_lead'),
    mk('host_debrief', 'h24', 'Host debrief call', 'county_lead'),
    mk('county_intel_review', 'h72', 'County lead intelligence review', 'county_lead'),
  ]
}
