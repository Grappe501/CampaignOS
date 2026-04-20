/**
 * Readiness utilities — re-exports domain scoring and workflow-aware helpers.
 */

export {
  calculateEventReadiness,
  summarizeEventGoals,
} from './campaignEventDomainServices'
export type { EventReadinessCalculationInput } from './campaignEventDomainServices'

export { getWorkflowProgress, getBlockingIssues } from './eventWorkflowEngine'
