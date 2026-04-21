/** Version constants for upgrade-safe packets and audit rows. */

/** Event intelligence packet semantic version (V3 = cross-domain mesh). */
export const EVENT_AI_INTELLIGENCE_PACKET_VERSION = 3 as const

/** Orchestration context envelope version (bumped when Agent Jones wire shape changes). */
export const EVENT_AI_ORCHESTRATION_CONTEXT_VERSION = 1 as const

/** Schema version for recommendation / simulation persistence. */
export const EVENT_AI_REGISTRY_SCHEMA_VERSION = 1 as const
