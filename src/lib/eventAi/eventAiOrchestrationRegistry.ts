/**
 * Capability registry — documents what the mesh can do today vs reserved for workers.
 */

export const EVENT_AI_ORCHESTRATION_CAPABILITIES = {
  deterministic_similar_events: true,
  /** Similar-event ranking uses heuristic score floor + tier — not vector distance. */
  vector_embeddings: false,
  cockpit_module_graph: true,
  leadership_snapshot_digest: true,
  gpu_workers: false,
  autonomous_mutations: false,
  persisted_audit_sync: 'supabase_when_signed_in' as const,
} as const
