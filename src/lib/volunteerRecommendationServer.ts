/**
 * Server-orchestrated recommendation exports (Netlify function invoked from client via volunteerIntelligence API).
 */

export {
  generateVolunteerOpportunityRecommendations,
  rerankDeterministicCandidatesWithAI,
  summarizeRecommendationReasons,
} from './volunteerRecommendationEngine'
