/**
 * Embeddings — **interface only for this release**. No API keys or vector index in the client bundle.
 * Future: server-side embedding workers + pgvector / external vector service.
 */

export type EventAiEmbeddingTargetKind =
  | 'event_summary'
  | 'workflow'
  | 'staffing_pattern'
  | 'comms_pattern'
  | 'run_of_show'
  | 'after_action'
  | 'media_press'
  | 'location_area'
  | 'playbook_variant'
  | 'leadership_note'

export type EventAiEmbeddingDoc = {
  id: string
  kind: EventAiEmbeddingTargetKind
  /** Stable text for hashing until embeddings exist */
  text_fingerprint: string
}

/** Placeholder fingerprint — not semantic embedding. */
export function fingerprintText(s: string): string {
  let h = 0
  const t = s.slice(0, 4000)
  for (let i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0
  return `fp_${(h >>> 0).toString(16)}`
}
