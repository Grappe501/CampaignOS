/**
 * Volunteer throughput — selector-oriented exports for pages, leadership, and Agent Jones.
 * Prefer importing pure helpers from here to avoid scattering funnel logic in UI.
 */

export {
  ALLOWED_THROUGHPUT_TRANSITIONS,
  canTransitionThroughput,
  mapAssignmentToThroughputStage,
  mapOnboardingToThroughputStage,
  mapOpportunityClaimToThroughputHint,
  throughputAttentionForStage,
  throughputRouteHint,
  throughputStageGroup,
  throughputStageLabel,
  VOLUNTEER_THROUGHPUT_STAGES,
  type ThroughputAttentionSeverity,
  type ThroughputStageGroup,
  type VolunteerThroughputStage,
} from './volunteerThroughputDomain'

export {
  buildAgentJonesVolunteerThroughputContext,
  buildVolunteerThroughputLeadershipRollup,
  computeAssignmentRates,
  countVolunteersByThroughputStage,
  mergeAssignmentStagesIntoPipeline,
  primaryThroughputStageForVolunteer,
  type VolunteerThroughputLeadershipRollup,
  type VolunteerThroughputPipelineCounts,
  type VolunteerThroughputRates,
} from './volunteerThroughputMetrics'
