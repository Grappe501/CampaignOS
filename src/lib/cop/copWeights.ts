/**
 * Transparent scoring weights — single config object (no magic numbers scattered).
 */
export const COP_SCORE_WEIGHTS = {
  readiness: {
    eventReadiness: 0.28,
    volunteerCoverage: 0.22,
    governanceUnblock: 0.2,
    followUpCompletion: 0.18,
    commsPrep: 0.12,
  },
  pressure: {
    eventClustering: 0.25,
    staffingGaps: 0.28,
    overdueApprovals: 0.22,
    criticalTaskAge: 0.15,
    escalationCount: 0.1,
  },
  momentum: {
    trendVsPrior: 0.45,
    outcomeLearning: 0.2,
    staffingPartial: 0.2,
    commsRecovery: 0.15,
  },
} as const
