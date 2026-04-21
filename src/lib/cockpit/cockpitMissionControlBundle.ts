/**
 * Single import surface for mission-control builders (graph + consequences + digest).
 */
export { buildCockpitConsequences, mergeAffectedModules, type CockpitConsequence } from './cockpitConsequenceEngine'
export {
  buildCockpitMissionDigest,
  buildMissionStripExtras,
  inferCockpitStripMode,
  pickRecommendedCenterModule,
  pickRecommendedCompareTemplate,
  type CockpitMissionStripExtras,
} from './cockpitAiMissionStrip'
export {
  COCKPIT_MODULE_GRAPH,
  getEdgesFrom,
  getEdgesTo,
  getRelatedModuleIds,
} from './cockpitRelationshipGraph'
export { buildAgentJonesCockpitFocus } from './cockpitModuleAdapter'
