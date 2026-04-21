/**
 * Entity linking bridge — re-exports graph queries; future: bind war-room rows,
 * approval IDs, and calendar keys to shared correlation IDs.
 */
export {
  COCKPIT_MODULE_GRAPH,
  expandRelatedModules,
  getEdgesFrom,
  getEdgesTo,
  getRelatedModuleIds,
  type CockpitModuleEdge,
  type CockpitRelationKind,
} from './cockpitRelationshipGraph'
